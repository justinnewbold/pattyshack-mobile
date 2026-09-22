// Health inspector export: every temp, photo and corrective action for a date range.
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase, isSupabaseConfigured } from '../supabase';
import { useChecklists } from './store';
import { DEMO_USER } from './demo';
import type { ChecklistItem, ChecklistResponse, ChecklistRun, ChecklistTemplate } from '../../types/checklists';
import { formatTime } from './logic';

interface ExportData {
  locationName: string;
  from: string;
  to: string;
  rows: Array<{
    run: ChecklistRun; template: ChecklistTemplate;
    items: Array<{ item: ChecklistItem; resp?: ChecklistResponse }>;
  }>;
  names: Record<string, string>;
}

function gatherDemo(locationId: string, locationName: string, from: string, to: string): ExportData {
  const st = useChecklists.getState();
  const runs = Object.values(st.runs)
    .filter(r => r.location_id === locationId && r.run_date >= from && r.run_date <= to)
    .sort((a, b) => (a.run_date + (a.window_start || '')).localeCompare(b.run_date + (b.window_start || '')));
  const rows = runs.map(run => ({
    run,
    template: st.templates.find(t => t.id === run.template_id)!,
    items: st.itemsFor(run.template_id).map(item => ({ item, resp: st.responses[run.id]?.[item.id] })),
  })).filter(r => r.template);
  return { locationName, from, to, rows, names: { [DEMO_USER.id]: DEMO_USER.name } };
}

async function gather(locationId: string, locationName: string, from: string, to: string): Promise<ExportData> {
  if (!isSupabaseConfigured) return gatherDemo(locationId, locationName, from, to);
  const { data: runs, error } = await supabase.from('checklist_runs').select('*')
    .eq('location_id', locationId).gte('run_date', from).lte('run_date', to)
    .order('run_date').order('window_start');
  if (error) throw error;
  const runIds = (runs || []).map(r => r.id);
  const templateIds = Array.from(new Set((runs || []).map(r => r.template_id)));
  const [resp, tmpl, items, users] = await Promise.all([
    runIds.length ? supabase.from('checklist_responses').select('*').in('run_id', runIds) : Promise.resolve({ data: [], error: null }),
    templateIds.length ? supabase.from('checklist_templates').select('*').in('id', templateIds) : Promise.resolve({ data: [], error: null }),
    templateIds.length ? supabase.from('checklist_items').select('*').in('template_id', templateIds).order('position') : Promise.resolve({ data: [], error: null }),
    supabase.from('users').select('id,name'),
  ]);
  const names: Record<string, string> = {};
  (users.data || []).forEach((u: any) => { names[u.id] = u.name; });
  const rows = (runs || []).map((run: ChecklistRun) => {
    const template = (tmpl.data || []).find((t: any) => t.id === run.template_id) as ChecklistTemplate;
    const its = (items.data || []).filter((i: any) => i.template_id === run.template_id) as ChecklistItem[];
    return {
      run, template,
      items: its.map(item => ({ item, resp: (resp.data || []).find((r: any) => r.run_id === run.id && r.item_id === item.id) as ChecklistResponse | undefined })),
    };
  }).filter(r => r.template);
  return { locationName, from, to, rows, names };
}

const esc = (s: any) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const csvCell = (s: any) => { const v = String(s ?? ''); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
const t = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '');

function toCsv(d: ExportData): string {
  const head = ['Date', 'Store', 'List', 'Window', 'Item', 'Value', 'Unit', 'Result', 'Corrective action', 'Corrective note',
    'Photo', 'Corrective photo', 'Recorded by', 'Recorded at', 'Edit note', 'List status', 'Completed by', 'Completed at', 'Signed off by', 'Signed off at'];
  const lines = [head.join(',')];
  for (const { run, template, items } of d.rows) {
    for (const { item, resp } of items) {
      const result = resp?.is_na ? 'N/A' : resp?.passed === true ? 'PASS' : resp?.passed === false ? 'FAIL' : resp?.value ? 'Recorded' : 'Missing';
      lines.push([
        run.run_date, d.locationName, template.name, `${formatTime(run.window_start)}-${formatTime(run.window_end)}`, item.label,
        resp?.value ?? '', item.unit ?? '', result, resp?.corrective_action ?? '', resp?.corrective_note ?? '',
        resp?.photo_url ?? '', resp?.corrective_photo_url ?? '', resp?.recorded_by ? d.names[resp.recorded_by] || '' : '', t(resp?.recorded_at),
        resp?.edited_note ?? '', run.status, run.completed_by ? d.names[run.completed_by] || '' : '', t(run.completed_at),
        run.signoff_by ? d.names[run.signoff_by] || '' : '', t(run.signoff_at),
      ].map(csvCell).join(','));
    }
  }
  return lines.join('\n');
}

function toHtml(d: ExportData): string {
  const fails = d.rows.reduce((n, r) => n + r.items.filter(i => i.resp?.passed === false).length, 0);
  const body = d.rows.map(({ run, template, items }) => `
    <section>
      <h2>${esc(template.name)} — ${esc(run.run_date)} <span class="w">${esc(formatTime(run.window_start))}–${esc(formatTime(run.window_end))}</span></h2>
      <p class="meta">Status: <b>${run.status === 'complete' ? 'Complete' : 'Not completed'}</b>
        ${run.completed_by ? ` · Completed by ${esc(d.names[run.completed_by] || '')} at ${esc(t(run.completed_at))}` : ''}
        ${run.signoff_by ? ` · Signed off by ${esc(d.names[run.signoff_by] || '')} at ${esc(t(run.signoff_at))}` : ''}</p>
      <table>
        <tr><th>Item</th><th>Value</th><th>Result</th><th>Corrective action</th><th>By / time</th></tr>
        ${items.map(({ item, resp }) => {
          const res = resp?.is_na ? 'N/A' : resp?.passed === true ? 'PASS' : resp?.passed === false ? 'FAIL' : resp?.value ? '✓' : '—';
          const cls = resp?.passed === false ? 'fail' : resp?.passed === true ? 'pass' : '';
          const photo = resp?.photo_url ? `<br/><img src="${esc(resp.photo_url)}"/>` : '';
          const cphoto = resp?.corrective_photo_url ? `<br/><img src="${esc(resp.corrective_photo_url)}"/>` : '';
          const val = item.type === 'photo' ? (resp?.photo_url ? 'Photo' : '') : `${esc(resp?.value ?? '')}${resp?.value ? esc(item.unit ?? '') : ''}`;
          return `<tr class="${cls}">
            <td>${esc(item.label)}</td>
            <td>${val}${photo}</td>
            <td><b>${res}</b></td>
            <td>${esc(resp?.corrective_action ?? '')}${resp?.corrective_note ? `<br/><i>${esc(resp.corrective_note)}</i>` : ''}${cphoto}
                ${resp?.edited_note ? `<br/><span class="edit">Edited: ${esc(resp.edited_note)}</span>` : ''}</td>
            <td>${resp?.recorded_by ? esc(d.names[resp.recorded_by] || '') : ''}<br/>${esc(t(resp?.recorded_at))}</td>
          </tr>`;
        }).join('')}
      </table>
    </section>`).join('');

  return `<!doctype html><html><head><meta charset="utf-8"/><title>Food Safety Log</title>
  <style>
    body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#111;margin:24px;font-size:11px}
    h1{font-size:20px;margin:0} h2{font-size:14px;margin:18px 0 4px;border-bottom:2px solid #4CAF50;padding-bottom:3px}
    .w{color:#666;font-weight:normal;font-size:12px} .meta{color:#444;margin:2px 0 6px}
    table{width:100%;border-collapse:collapse;page-break-inside:auto} tr{page-break-inside:avoid}
    th,td{border:1px solid #ddd;padding:5px;text-align:left;vertical-align:top} th{background:#f3f4f6}
    tr.fail td{background:#fee2e2} tr.pass td:nth-child(3){color:#15803d}
    img{max-width:140px;max-height:100px;margin-top:4px;border-radius:4px} .edit{color:#1d4ed8}
    .sum{display:flex;gap:24px;margin:10px 0 4px}
  </style></head><body>
  <h1>Patty Shack — Food Safety Records</h1>
  <div>${esc(d.locationName)} · ${esc(d.from)} to ${esc(d.to)} · Generated ${esc(new Date().toLocaleString())}</div>
  <div class="sum"><div><b>${d.rows.length}</b> lists</div><div><b>${d.rows.filter(r => r.run.status === 'complete').length}</b> completed</div><div><b>${fails}</b> failed readings (all with corrective actions shown)</div></div>
  ${body || '<p>No records in this date range.</p>'}
  </body></html>`;
}

export async function exportInspectorPack(opts: { locationId: string; locationName: string; from: string; to: string; format: 'pdf' | 'csv' }) {
  const d = await gather(opts.locationId, opts.locationName, opts.from, opts.to);
  const base = `patty-shack-${opts.locationName.replace(/\W+/g, '-').toLowerCase()}-${opts.from}-to-${opts.to}`;

  if (opts.format === 'csv') {
    const csv = toCsv(d);
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      const a = document.createElement('a'); a.href = url; a.download = `${base}.csv`; a.click();
      URL.revokeObjectURL(url);
      return;
    }
    const path = `${FileSystem.cacheDirectory}${base}.csv`;
    await FileSystem.writeAsStringAsync(path, csv);
    await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Food safety CSV' });
    return;
  }

  const html = toHtml(d);
  if (Platform.OS === 'web') {
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 600); }
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Food safety PDF', UTI: 'com.adobe.pdf' });
}
