// Owner / manager view: who's late today, completion %, failures, inspector export.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../lib/store';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { DEMO_USER } from '../../lib/checklists/demo';
import { useChecklists } from '../../lib/checklists/store';
import { buildTodaySlots, formatTime, isManagerRole, localDateString } from '../../lib/checklists/logic';
import { exportInspectorPack } from '../../lib/checklists/export';
import { C } from '../../lib/checklists/theme';
import StatusBadge from '../../components/checklists/StatusBadge';
import type { ChecklistResponse, ChecklistRun, ChecklistSlot } from '../../types/checklists';

const DAYS = 7;
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 100);
const pctColor = (p: number) => (p >= 95 ? C.ok : p >= 80 ? C.warn : C.bad);

export default function ChecklistManager() {
  const router = useRouter();
  const { user, locations, currentLocation } = useStore();
  const ck = useChecklists();
  const [runs, setRuns] = useState<ChecklistRun[]>([]);
  const [fails, setFails] = useState<(ChecklistResponse & { run: ChecklistRun })[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storeFilter, setStoreFilter] = useState<string | 'all'>('all');

  const today = localDateString();
  const [from, setFrom] = useState(localDateString(new Date(Date.now() - 6 * 86400000)));
  const [to, setTo] = useState(today);
  const [exportStore, setExportStore] = useState<string | null>(locations[0]?.id || null);
  const [exporting, setExporting] = useState<null | 'pdf' | 'csv'>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    if (!isSupabaseConfigured) {
      // Demo mode: use what was entered on this device
      const local = Object.values(ck.runs);
      setRuns(local);
      const f: (ChecklistResponse & { run: ChecklistRun })[] = [];
      for (const run of local.filter(r => r.run_date === today)) {
        for (const resp of Object.values(ck.responses[run.id] || {})) if (resp.passed === false) f.push({ ...resp, run });
      }
      setFails(f);
      setNames({ [DEMO_USER.id]: DEMO_USER.name });
      setLoading(false);
      return;
    }
    try {
      const since = localDateString(new Date(Date.now() - (DAYS - 1) * 86400000));
      const { data: r, error: e1 } = await supabase.from('checklist_runs').select('*').gte('run_date', since).lte('run_date', today);
      if (e1) throw e1;
      const todayIds = (r || []).filter(x => x.run_date === today).map(x => x.id);
      const [{ data: f }, { data: u }] = await Promise.all([
        todayIds.length
          ? supabase.from('checklist_responses').select('*').in('run_id', todayIds).eq('passed', false)
          : Promise.resolve({ data: [] as ChecklistResponse[] }),
        supabase.from('users').select('id,name'),
      ]);
      setRuns(r || []);
      const byId = new Map((r || []).map(x => [x.id, x]));
      setFails((f || []).map((x: ChecklistResponse) => ({ ...x, run: byId.get(x.run_id)! })).filter(x => x.run));
      const n: Record<string, string> = {}; (u || []).forEach((x: any) => { n[x.id] = x.name; }); setNames(n);
    } catch (e: any) {
      setError(e?.message || 'Could not load. Check the internet connection.');
    } finally {
      setLoading(false);
    }
  }, [today, ck.runs, ck.responses]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!ck.loaded && currentLocation) ck.load(currentLocation.id); }, [currentLocation?.id]);
  useEffect(() => { if (!exportStore && locations[0]) setExportStore(locations[0].id); }, [locations]);

  const now = new Date();
  const perStore = useMemo(() => locations.map(loc => {
    const locRuns = runs.filter(r => r.location_id === loc.id);
    const todaySlots = buildTodaySlots(ck.templates, ck.schedules, locRuns, loc.id, today, now);
    let due = 0, done = 0;
    for (let i = 0; i < DAYS; i++) {
      const date = localDateString(new Date(Date.now() - i * 86400000));
      const s = buildTodaySlots(ck.templates, ck.schedules, locRuns, loc.id, date, now).filter(x => x.status !== 'not_due');
      due += s.length; done += s.filter(x => x.status === 'complete').length;
    }
    const todayDue = todaySlots.filter(s => s.status !== 'not_due');
    return {
      loc, todaySlots,
      todayPct: pct(todayDue.filter(s => s.status === 'complete').length, todayDue.length),
      weekPct: pct(done, due),
      late: todaySlots.filter(s => s.status === 'late'),
    };
  }), [locations, runs, ck.templates, ck.schedules]);

  const perList = useMemo(() => ck.templates.map(t => {
    let due = 0, done = 0;
    for (const { loc } of perStore) {
      const locRuns = runs.filter(r => r.location_id === loc.id);
      for (let i = 0; i < DAYS; i++) {
        const date = localDateString(new Date(Date.now() - i * 86400000));
        const s = buildTodaySlots([t], ck.schedules, locRuns, loc.id, date, now).filter(x => x.status !== 'not_due');
        due += s.length; done += s.filter(x => x.status === 'complete').length;
      }
    }
    return { t, p: pct(done, due), due };
  }).filter(x => x.due > 0), [perStore, ck.templates]);

  const allLate: (ChecklistSlot & { locName: string })[] = perStore.flatMap(s => s.late.map(l => ({ ...l, locName: s.loc.name })));
  const visibleStores = storeFilter === 'all' ? perStore : perStore.filter(s => s.loc.id === storeFilter);
  const itemLabel = (id: string) => ck.items.find(i => i.id === id);
  const tmplName = (id: string) => ck.templates.find(t => t.id === id)?.name || 'List';

  const doExport = async (format: 'pdf' | 'csv') => {
    const loc = locations.find(l => l.id === exportStore);
    if (!loc) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
      const m = 'Dates must look like 2026-09-22 and "From" must be before "To".';
      Platform.OS === 'web' ? window.alert(m) : Alert.alert('Check dates', m);
      return;
    }
    setExporting(format);
    try { await exportInspectorPack({ locationId: loc.id, locationName: loc.name, from, to, format }); }
    catch (e: any) { const m = e?.message || 'Export failed'; Platform.OS === 'web' ? window.alert(m) : Alert.alert('Export failed', m); }
    finally { setExporting(null); }
  };

  if (!user || !isManagerRole(user.role)) {
    return <View style={styles.center}><Stack.Screen options={{ title: 'Food Safety Dashboard' }} /><Text style={styles.sub}>Managers only.</Text></View>;
  }

  const todayDueAll = perStore.flatMap(s => s.todaySlots).filter(s => s.status !== 'not_due');
  const todayPctAll = pct(todayDueAll.filter(s => s.status === 'complete').length, todayDueAll.length);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ title: 'Food Safety Dashboard' }} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
        {!!error && <Text style={styles.err}>{error}</Text>}

        {/* KPIs */}
        <View style={styles.kpis}>
          <View style={styles.kpi}><Text style={[styles.kpiNum, { color: pctColor(todayPctAll) }]}>{todayPctAll}%</Text><Text style={styles.kpiLabel}>Done today (all stores)</Text></View>
          <View style={styles.kpi}><Text style={[styles.kpiNum, { color: allLate.length ? C.bad : C.ok }]}>{allLate.length}</Text><Text style={styles.kpiLabel}>Late / missed now</Text></View>
          <View style={styles.kpi}><Text style={[styles.kpiNum, { color: fails.length ? C.warn : C.ok }]}>{fails.length}</Text><Text style={styles.kpiLabel}>Failed readings today</Text></View>
        </View>

        {/* Who's late */}
        <Text style={styles.h}>Who's late right now</Text>
        {allLate.length === 0 ? <Text style={styles.good}>✓ Nothing late. Nice.</Text> : allLate.map(s => (
          <View key={s.key} style={styles.rowCard}>
            <StatusBadge status="late" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.rowTitle}>{s.locName} · {s.template.name}{s.schedule.label ? ` ${s.schedule.label}` : ''}</Text>
              <Text style={styles.sub}>Was due {formatTime(s.schedule.window_start)}–{formatTime(s.schedule.window_end)}{s.run ? ` · started by ${names[s.run.started_by || ''] || 'someone'}, not finished` : ' · never started'}</Text>
            </View>
            {s.run && <TouchableOpacity onPress={() => router.push(`/checklists/run/${s.run!.id}`)}><Text style={styles.link}>Open ›</Text></TouchableOpacity>}
          </View>
        ))}

        {/* Stores */}
        <Text style={styles.h}>Stores</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
          {[{ id: 'all', name: 'All stores' }, ...locations].map(l => (
            <TouchableOpacity key={l.id} onPress={() => setStoreFilter(l.id)} style={[styles.chip, storeFilter === l.id && styles.chipOn]}>
              <Text style={[styles.chipText, storeFilter === l.id && { color: '#fff' }]}>{l.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.grid}>
          {visibleStores.map(s => (
            <View key={s.loc.id} style={styles.storeCard}>
              <Text style={styles.storeName}>{s.loc.name}</Text>
              <View style={styles.pcts}>
                <View><Text style={[styles.pct, { color: pctColor(s.todayPct) }]}>{s.todayPct}%</Text><Text style={styles.sub}>today</Text></View>
                <View><Text style={[styles.pct, { color: pctColor(s.weekPct) }]}>{s.weekPct}%</Text><Text style={styles.sub}>last {DAYS} days</Text></View>
              </View>
              {s.todaySlots.map(slot => (
                <TouchableOpacity key={slot.key} disabled={!slot.run} onPress={() => slot.run && router.push(`/checklists/run/${slot.run.id}`)} style={styles.slotRow}>
                  <Text style={styles.slotName}>{slot.template.name}{slot.schedule.label ? ` ${slot.schedule.label}` : ''}</Text>
                  <StatusBadge status={slot.status} />
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        {/* By list */}
        {perList.length > 0 && <>
          <Text style={styles.h}>Completion by list (last {DAYS} days)</Text>
          <View style={styles.box}>
            {perList.map(({ t, p }) => (
              <View key={t.id} style={styles.barRow}>
                <Text style={styles.barLabel}>{t.name}</Text>
                <View style={styles.bar}><View style={[styles.barFill, { width: `${p}%`, backgroundColor: pctColor(p) }]} /></View>
                <Text style={[styles.barPct, { color: pctColor(p) }]}>{p}%</Text>
              </View>
            ))}
          </View>
        </>}

        {/* Failures */}
        <Text style={styles.h}>Failed readings today</Text>
        {fails.length === 0 ? <Text style={styles.good}>✓ No failures today.</Text> : fails.map(f => {
          const item = itemLabel(f.item_id);
          const loc = locations.find(l => l.id === f.run.location_id);
          return (
            <TouchableOpacity key={f.id} style={styles.rowCard} onPress={() => router.push(`/checklists/run/${f.run_id}`)}>
              <Ionicons name={f.corrective_action ? 'shield-checkmark' : 'warning'} size={24} color={f.corrective_action ? C.warn : C.bad} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.rowTitle}>{loc?.name} · {tmplName(f.run.template_id)} · {item?.label}</Text>
                <Text style={styles.sub}>Recorded {f.value}{item?.unit || ''} by {names[f.recorded_by || ''] || '—'} at {new Date(f.recorded_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
                <Text style={[styles.sub, { color: f.corrective_action ? C.warn : C.bad, fontWeight: '700' }]}>
                  {f.corrective_action ? `Fix: ${f.corrective_action}${f.corrective_note ? ` — ${f.corrective_note}` : ''}` : 'OPEN — no corrective action yet'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Inspector export */}
        <Text style={styles.h}>Health inspector export</Text>
        <View style={styles.box}>
          <Text style={styles.label}>Store</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {locations.map(l => (
              <TouchableOpacity key={l.id} onPress={() => setExportStore(l.id)} style={[styles.chip, exportStore === l.id && styles.chipOn]}>
                <Text style={[styles.chipText, exportStore === l.id && { color: '#fff' }]}>{l.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.dates}>
            <View style={{ flex: 1 }}><Text style={styles.label}>From</Text><TextInput style={styles.input} value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" /></View>
            <View style={{ flex: 1 }}><Text style={styles.label}>To</Text><TextInput style={styles.input} value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" /></View>
          </View>
          <View style={styles.quick}>
            {[['Today', 0], ['7 days', 6], ['30 days', 29], ['90 days', 89]].map(([l, d]) => (
              <TouchableOpacity key={l as string} style={styles.quickBtn} onPress={() => { setFrom(localDateString(new Date(Date.now() - (d as number) * 86400000))); setTo(today); }}>
                <Text style={styles.quickText}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.dates}>
            <TouchableOpacity style={[styles.exportBtn, { backgroundColor: C.brand }]} onPress={() => doExport('pdf')} disabled={!!exporting}>
              {exporting === 'pdf' ? <ActivityIndicator color="#fff" /> : <><Ionicons name="document-text-outline" size={20} color="#fff" /><Text style={styles.exportText}>PDF</Text></>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.exportBtn, { backgroundColor: C.info }]} onPress={() => doExport('csv')} disabled={!!exporting}>
              {exporting === 'csv' ? <ActivityIndicator color="#fff" /> : <><Ionicons name="grid-outline" size={20} color="#fff" /><Text style={styles.exportText}>CSV</Text></>}
            </TouchableOpacity>
          </View>
          <Text style={styles.sub}>Includes every temp, photo, corrective action, who did it, and manager sign-offs.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 60, maxWidth: 1200, width: '100%', alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  err: { color: C.bad, marginBottom: 8, fontWeight: '600' },
  kpis: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  kpi: { flex: 1, minWidth: 150, backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },
  kpiNum: { fontSize: 34, fontWeight: '800' },
  kpiLabel: { fontSize: 13, color: C.sub, fontWeight: '600', marginTop: 2 },
  h: { fontSize: 19, fontWeight: '800', color: C.text, marginTop: 24, marginBottom: 10 },
  good: { fontSize: 15, color: C.ok, fontWeight: '700' },
  rowCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  rowTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  sub: { fontSize: 13, color: C.sub, marginTop: 2 },
  link: { color: C.info, fontWeight: '800', fontSize: 15 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, marginRight: 8 },
  chipOn: { backgroundColor: C.brand, borderColor: C.brand },
  chipText: { fontSize: 14, fontWeight: '700', color: C.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  storeCard: { flexGrow: 1, flexBasis: 300, backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },
  storeName: { fontSize: 18, fontWeight: '800', color: C.text },
  pcts: { flexDirection: 'row', gap: 28, marginVertical: 10 },
  pct: { fontSize: 26, fontWeight: '800' },
  slotRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.bg },
  slotName: { fontSize: 14, fontWeight: '600', color: C.text, flex: 1 },
  box: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },
  barRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
  barLabel: { width: 150, fontSize: 14, fontWeight: '600', color: C.text },
  bar: { flex: 1, height: 10, backgroundColor: C.bg, borderRadius: 5, overflow: 'hidden', marginHorizontal: 10 },
  barFill: { height: 10 },
  barPct: { width: 44, textAlign: 'right', fontWeight: '800' },
  label: { fontSize: 13, fontWeight: '700', color: C.sub, marginBottom: 6, marginTop: 10, textTransform: 'uppercase' },
  dates: { flexDirection: 'row', gap: 10, marginTop: 4 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, fontSize: 16 },
  quick: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  quickBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: C.bg, borderRadius: 8 },
  quickText: { fontWeight: '700', color: C.text },
  exportBtn: { flex: 1, height: 54, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 10 },
  exportText: { color: '#fff', fontSize: 17, fontWeight: '800', marginLeft: 8 },
});
