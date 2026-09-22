// HQ list builder: templates, items, and schedules per store.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Alert, Platform, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../lib/store';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useChecklists, saveDemoConfig } from '../../lib/checklists/store';
import { uuid } from '../../lib/checklists/logic';
import { formatTime, isHqRole } from '../../lib/checklists/logic';

const DEMO = !isSupabaseConfigured;
const st = () => useChecklists.getState();
import { C, STATION_LABELS } from '../../lib/checklists/theme';
import type { ChecklistItem, ChecklistSchedule, ChecklistTemplate, ItemType, TemplateCategory } from '../../types/checklists';

const TYPES: { v: ItemType; l: string }[] = [
  { v: 'yes_no', l: 'Yes / No' }, { v: 'temp', l: 'Temperature' }, { v: 'number', l: 'Number' },
  { v: 'choice', l: 'Multiple choice' }, { v: 'photo', l: 'Photo' }, { v: 'comment', l: 'Comment' }, { v: 'signature', l: 'Signature' },
];
const CATEGORIES: TemplateCategory[] = ['opening', 'closing', 'shift_change', 'line_check', 'receiving', 'cleaning', 'self_audit', 'foh', 'cooling'];
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const say = (title: string, msg?: string) => (Platform.OS === 'web' ? window.alert(`${title}${msg ? `\n${msg}` : ''}`) : Alert.alert(title, msg));
const numOrNull = (s: string) => (s.trim() === '' || Number.isNaN(Number(s)) ? null : Number(s));
const validTime = (s: string) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(s.trim());

export default function ChecklistBuilder() {
  const { user, locations, currentLocation } = useStore();
  const ck = useChecklists();
  const [selected, setSelected] = useState<string | null>(null);
  const [allTemplates, setAllTemplates] = useState<ChecklistTemplate[]>([]);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [schedules, setSchedules] = useState<ChecklistSchedule[]>([]);
  const [busy, setBusy] = useState(false);

  const loadTemplates = async () => {
    if (DEMO) { setAllTemplates([...st().templates].sort((a, b) => a.name.localeCompare(b.name))); return; }
    const { data, error } = await supabase.from('checklist_templates').select('*').order('name');
    if (error) return say('Could not load lists', error.message);
    setAllTemplates(data || []);
  };
  const loadDetail = async (id: string) => {
    if (DEMO) {
      setItems(st().items.filter(i => i.template_id === id).sort((a, b) => a.position - b.position));
      setSchedules(st().schedules.filter(x => x.template_id === id).sort((a, b) => a.window_start.localeCompare(b.window_start)));
      return;
    }
    const [i, s] = await Promise.all([
      supabase.from('checklist_items').select('*').eq('template_id', id).order('position'),
      supabase.from('checklist_schedules').select('*').eq('template_id', id).order('window_start'),
    ]);
    setItems((i.data || []).map((x: any) => ({ ...x, min_value: x.min_value == null ? null : Number(x.min_value), max_value: x.max_value == null ? null : Number(x.max_value) })));
    setSchedules(s.data || []);
  };
  useEffect(() => { loadTemplates(); }, []);
  useEffect(() => { if (selected) loadDetail(selected); }, [selected]);

  const done = async () => { if (currentLocation) await ck.refresh(currentLocation.id); };

  if (!user || !isHqRole(user.role)) {
    return <View style={styles.center}><Stack.Screen options={{ title: 'List Builder' }} /><Text style={styles.sub}>Only GM / corporate users can edit lists.</Text></View>;
  }

  const t = allTemplates.find(x => x.id === selected);

  const saveTemplate = async (patch: Partial<ChecklistTemplate>) => {
    if (!t) return;
    setAllTemplates(ts => ts.map(x => (x.id === t.id ? { ...x, ...patch } : x)));
    if (DEMO) { await saveDemoConfig({ templates: st().templates.map(x => (x.id === t.id ? { ...x, ...patch } : x)) }); return; }
    const { error } = await supabase.from('checklist_templates').update(patch).eq('id', t.id);
    if (error) say('Save failed', error.message); else done();
  };

  const newTemplate = async () => {
    if (DEMO) {
      const nt: ChecklistTemplate = { id: uuid(), name: 'New list', category: 'line_check', station: 'all', description: null, requires_signoff: false, active: true };
      await saveDemoConfig({ templates: [...st().templates, nt] });
      await loadTemplates(); setSelected(nt.id); return;
    }
    setBusy(true);
    const { data, error } = await supabase.from('checklist_templates').insert({ name: 'New list', category: 'line_check', station: 'all' }).select().single();
    setBusy(false);
    if (error) return say('Could not create list', error.message);
    await loadTemplates();
    setSelected(data.id);
  };

  const addItem = async (type: ItemType) => {
    if (!t) return;
    const row: Partial<ChecklistItem> = {
      template_id: t.id, position: (items[items.length - 1]?.position || 0) + 1, type, required: true,
      label: type === 'temp' ? 'New temperature check' : 'New item',
      unit: type === 'temp' ? '°F' : null, max_value: type === 'temp' ? 41 : null,
      options: type === 'choice' ? ['Good', 'Needs attention'] : null,
      fail_options: type === 'choice' ? ['Needs attention'] : null,
    };
    if (DEMO) { await saveDemoConfig({ items: [...st().items, { ...row, id: uuid() } as ChecklistItem] }); await loadDetail(t.id); return; }
    const { error } = await supabase.from('checklist_items').insert(row);
    if (error) return say('Could not add item', error.message);
    await loadDetail(t.id); done();
  };

  const saveItem = async (item: ChecklistItem) => {
    if (DEMO) { await saveDemoConfig({ items: st().items.map(i => (i.id === item.id ? item : i)) }); setItems(xs => xs.map(i => (i.id === item.id ? item : i))); say('Saved'); return; }
    const { id, ...rest } = item;
    const { error } = await supabase.from('checklist_items').update(rest).eq('id', id);
    if (error) say('Save failed', error.message); else { say('Saved'); done(); }
  };

  const removeItem = async (item: ChecklistItem) => {
    const go = async () => {
      if (DEMO) { await saveDemoConfig({ items: st().items.filter(i => i.id !== item.id) }); await loadDetail(t!.id); return; }
      const { error } = await supabase.from('checklist_items').delete().eq('id', item.id);
      if (error) return say('Could not delete', error.message.includes('foreign key') ? 'This item already has recorded answers. Turn it to optional instead, or make a new list version.' : error.message);
      await loadDetail(t!.id); done();
    };
    if (Platform.OS === 'web') { if (window.confirm(`Delete "${item.label}"?`)) go(); }
    else Alert.alert('Delete item?', item.label, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: go }]);
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const a = items[idx], b = items[j];
    const next = [...items]; next[idx] = { ...b, position: a.position }; next[j] = { ...a, position: b.position };
    setItems(next);
    if (DEMO) { await saveDemoConfig({ items: st().items.map(i => next.find(n => n.id === i.id) || i) }); return; }
    await Promise.all([
      supabase.from('checklist_items').update({ position: b.position }).eq('id', a.id),
      supabase.from('checklist_items').update({ position: a.position }).eq('id', b.id),
    ]);
    done();
  };

  const addSchedule = async () => {
    if (!t) return;
    if (DEMO) {
      const ns: ChecklistSchedule = { id: uuid(), template_id: t.id, location_id: null, label: null, days: [0, 1, 2, 3, 4, 5, 6], window_start: '10:00:00', window_end: '11:00:00', active: true };
      await saveDemoConfig({ schedules: [...st().schedules, ns] }); await loadDetail(t.id); return;
    }
    const { error } = await supabase.from('checklist_schedules').insert({ template_id: t.id, window_start: '10:00', window_end: '11:00' });
    if (error) return say('Could not add time', error.message);
    await loadDetail(t.id); done();
  };
  const saveSchedule = async (s: ChecklistSchedule) => {
    if (!validTime(s.window_start) || !validTime(s.window_end)) return say('Times look wrong', 'Use 24-hour time like 14:00.');
    if (DEMO) {
      const fixed = { ...s, window_start: `${s.window_start.trim().padStart(5, '0')}:00`, window_end: `${s.window_end.trim().padStart(5, '0')}:00` };
      await saveDemoConfig({ schedules: st().schedules.map(x => (x.id === s.id ? fixed : x)) }); say('Saved'); return;
    }
    const { id, ...rest } = s;
    const { error } = await supabase.from('checklist_schedules').update(rest).eq('id', id);
    if (error) say('Save failed', error.message); else { say('Saved'); done(); }
  };
  const removeSchedule = async (s: ChecklistSchedule) => {
    if (DEMO) { await saveDemoConfig({ schedules: st().schedules.filter(x => x.id !== s.id) }); await loadDetail(t!.id); return; }
    const { error } = await supabase.from('checklist_schedules').delete().eq('id', s.id);
    if (error) return say('Could not delete', error.message);
    await loadDetail(t!.id); done();
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ title: 'List Builder' }} />
      <ScrollView contentContainerStyle={styles.content}>
        {!t ? (
          <>
            <TouchableOpacity style={styles.primary} onPress={newTemplate} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <><Ionicons name="add" size={22} color="#fff" /><Text style={styles.primaryText}>New list</Text></>}
            </TouchableOpacity>
            {allTemplates.map(x => (
              <TouchableOpacity key={x.id} style={styles.rowCard} onPress={() => setSelected(x.id)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{x.name}{x.active ? '' : '  (off)'}</Text>
                  <Text style={styles.sub}>{x.category.replace('_', ' ')} · {STATION_LABELS[x.station] || x.station}{x.requires_signoff ? ' · manager sign-off' : ''}</Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color={C.sub} />
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <>
            <TouchableOpacity onPress={() => { setSelected(null); loadTemplates(); }} style={styles.back}>
              <Ionicons name="chevron-back" size={20} color={C.info} /><Text style={styles.link}>All lists</Text>
            </TouchableOpacity>

            <View style={styles.box}>
              <TemplateMeta key={t.id} t={t} onSave={saveTemplate} />
              <Text style={styles.label}>Type</Text>
              <View style={styles.wrap}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity key={c} onPress={() => saveTemplate({ category: c })} style={[styles.chip, t.category === c && styles.chipOn]}>
                    <Text style={[styles.chipText, t.category === c && { color: '#fff' }]}>{c.replace('_', ' ')}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>Station</Text>
              <View style={styles.wrap}>
                {Object.keys(STATION_LABELS).map(s => (
                  <TouchableOpacity key={s} onPress={() => saveTemplate({ station: s })} style={[styles.chip, t.station === s && styles.chipOn]}>
                    <Text style={[styles.chipText, t.station === s && { color: '#fff' }]}>{STATION_LABELS[s]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.switchRow}><Text style={styles.switchLabel}>Manager sign-off required</Text><Switch value={t.requires_signoff} onValueChange={v => saveTemplate({ requires_signoff: v })} /></View>
              <View style={styles.switchRow}><Text style={styles.switchLabel}>List is active</Text><Switch value={t.active} onValueChange={v => saveTemplate({ active: v })} /></View>
            </View>

            <Text style={styles.h}>When it's due</Text>
            {schedules.map(s => <ScheduleEditor key={s.id} s={s} locations={locations} onSave={saveSchedule} onDelete={() => removeSchedule(s)} />)}
            <TouchableOpacity style={styles.addBtn} onPress={addSchedule}><Ionicons name="time-outline" size={20} color={C.info} /><Text style={styles.link}>Add a time window</Text></TouchableOpacity>

            <Text style={styles.h}>Items ({items.length})</Text>
            {items.map((item, idx) => (
              <ItemEditor key={item.id} item={item} onSave={saveItem} onDelete={() => removeItem(item)} onUp={() => move(idx, -1)} onDown={() => move(idx, 1)} />
            ))}
            <Text style={styles.label}>Add item</Text>
            <View style={styles.wrap}>
              {TYPES.map(x => (
                <TouchableOpacity key={x.v} style={styles.chip} onPress={() => addItem(x.v)}>
                  <Text style={styles.chipText}>+ {x.l}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function TemplateMeta({ t, onSave }: { t: ChecklistTemplate; onSave: (p: Partial<ChecklistTemplate>) => void }) {
  const [name, setName] = useState(t.name);
  const [desc, setDesc] = useState(t.description || '');
  const dirty = name !== t.name || desc !== (t.description || '');
  return (
    <>
      <Text style={styles.label}>List name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />
      <Text style={styles.label}>Description</Text>
      <TextInput style={styles.input} value={desc} onChangeText={setDesc} placeholder="What this list covers" />
      {dirty && (
        <TouchableOpacity style={[styles.smallBtn, { backgroundColor: C.brand }]} onPress={() => onSave({ name: name.trim() || t.name, description: desc.trim() || null })}>
          <Text style={styles.smallBtnText}>Save name & description</Text>
        </TouchableOpacity>
      )}
    </>
  );
}

function ScheduleEditor({ s, locations, onSave, onDelete }: { s: ChecklistSchedule; locations: { id: string; name: string }[]; onSave: (s: ChecklistSchedule) => void; onDelete: () => void }) {
  const [d, setD] = useState({ ...s, window_start: s.window_start.slice(0, 5), window_end: s.window_end.slice(0, 5) });
  return (
    <View style={styles.box}>
      <View style={styles.inline}>
        <View style={{ flex: 1 }}><Text style={styles.label}>Label</Text><TextInput style={styles.input} value={d.label || ''} placeholder="AM / PM" onChangeText={v => setD({ ...d, label: v || null })} /></View>
        <View style={{ flex: 1 }}><Text style={styles.label}>Opens</Text><TextInput style={styles.input} value={d.window_start} placeholder="10:00" onChangeText={v => setD({ ...d, window_start: v })} /></View>
        <View style={{ flex: 1 }}><Text style={styles.label}>Late after</Text><TextInput style={styles.input} value={d.window_end} placeholder="11:00" onChangeText={v => setD({ ...d, window_end: v })} /></View>
      </View>
      <Text style={styles.sub}>{formatTime(d.window_start)} to {formatTime(d.window_end)} (24-hour, e.g. 14:00)</Text>
      <Text style={styles.label}>Days</Text>
      <View style={styles.wrap}>
        {DAY.map((n, i) => {
          const on = d.days.includes(i);
          return (
            <TouchableOpacity key={n} onPress={() => setD({ ...d, days: on ? d.days.filter(x => x !== i) : [...d.days, i].sort() })} style={[styles.chip, on && styles.chipOn]}>
              <Text style={[styles.chipText, on && { color: '#fff' }]}>{n}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.label}>Store</Text>
      <View style={styles.wrap}>
        {[{ id: null as string | null, name: 'Every store' }, ...locations].map(l => (
          <TouchableOpacity key={l.id || 'all'} onPress={() => setD({ ...d, location_id: l.id })} style={[styles.chip, d.location_id === l.id && styles.chipOn]}>
            <Text style={[styles.chipText, d.location_id === l.id && { color: '#fff' }]}>{l.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.inline}>
        <TouchableOpacity style={[styles.smallBtn, { backgroundColor: C.brand }]} onPress={() => onSave(d)}><Text style={styles.smallBtnText}>Save time</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.smallBtn, { backgroundColor: C.badBg }]} onPress={onDelete}><Text style={[styles.smallBtnText, { color: C.bad }]}>Remove</Text></TouchableOpacity>
      </View>
    </View>
  );
}

function ItemEditor({ item, onSave, onDelete, onUp, onDown }: { item: ChecklistItem; onSave: (i: ChecklistItem) => void; onDelete: () => void; onUp: () => void; onDown: () => void }) {
  const [d, setD] = useState(item);
  const [min, setMin] = useState(item.min_value == null ? '' : String(item.min_value));
  const [max, setMax] = useState(item.max_value == null ? '' : String(item.max_value));
  const [opts, setOpts] = useState((item.options || []).join(', '));
  const [failOpts, setFailOpts] = useState((item.fail_options || []).join(', '));
  const ranged = d.type === 'temp' || d.type === 'number';
  const split = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean);

  return (
    <View style={styles.box}>
      <View style={styles.inline}>
        <Text style={[styles.sub, { flex: 1, fontWeight: '800' }]}>{TYPES.find(x => x.v === d.type)?.l}</Text>
        <TouchableOpacity onPress={onUp}><Ionicons name="arrow-up" size={22} color={C.sub} /></TouchableOpacity>
        <TouchableOpacity onPress={onDown}><Ionicons name="arrow-down" size={22} color={C.sub} /></TouchableOpacity>
      </View>
      <Text style={styles.label}>Question / label</Text>
      <TextInput style={styles.input} value={d.label} onChangeText={v => setD({ ...d, label: v })} />
      <Text style={styles.label}>Help text</Text>
      <TextInput style={styles.input} value={d.help || ''} onChangeText={v => setD({ ...d, help: v || null })} placeholder="Example: must be 41°F or below" />
      {ranged && (
        <View style={styles.inline}>
          <View style={{ flex: 1 }}><Text style={styles.label}>At least (min)</Text><TextInput style={styles.input} value={min} onChangeText={setMin} placeholder="e.g. 135 for hot hold" keyboardType="numbers-and-punctuation" /></View>
          <View style={{ flex: 1 }}><Text style={styles.label}>At most (max)</Text><TextInput style={styles.input} value={max} onChangeText={setMax} placeholder="e.g. 41 for cold hold" keyboardType="numbers-and-punctuation" /></View>
          <View style={{ width: 80 }}><Text style={styles.label}>Unit</Text><TextInput style={styles.input} value={d.unit || ''} onChangeText={v => setD({ ...d, unit: v || null })} /></View>
        </View>
      )}
      {d.type === 'choice' && (
        <>
          <Text style={styles.label}>Choices (comma separated)</Text>
          <TextInput style={styles.input} value={opts} onChangeText={setOpts} />
          <Text style={styles.label}>Choices that count as a FAIL</Text>
          <TextInput style={styles.input} value={failOpts} onChangeText={setFailOpts} />
        </>
      )}
      <View style={styles.switchRow}><Text style={styles.switchLabel}>Required (off = crew can mark N/A)</Text><Switch value={d.required} onValueChange={v => setD({ ...d, required: v })} /></View>
      <View style={styles.inline}>
        <TouchableOpacity style={[styles.smallBtn, { backgroundColor: C.brand }]} onPress={() => onSave({
          ...d, min_value: ranged ? numOrNull(min) : null, max_value: ranged ? numOrNull(max) : null,
          options: d.type === 'choice' ? split(opts) : null, fail_options: d.type === 'choice' ? split(failOpts) : null,
        })}><Text style={styles.smallBtnText}>Save item</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.smallBtn, { backgroundColor: C.badBg }]} onPress={onDelete}><Text style={[styles.smallBtnText, { color: C.bad }]}>Delete</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 60, maxWidth: 860, width: '100%', alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  primary: { height: 56, borderRadius: 14, backgroundColor: C.brand, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  primaryText: { color: '#fff', fontSize: 17, fontWeight: '800', marginLeft: 6 },
  rowCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  title: { fontSize: 18, fontWeight: '800', color: C.text },
  sub: { fontSize: 13, color: C.sub, marginTop: 2 },
  back: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  link: { color: C.info, fontWeight: '800', fontSize: 15, marginLeft: 4 },
  box: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 10 },
  h: { fontSize: 19, fontWeight: '800', color: C.text, marginTop: 20, marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '700', color: C.sub, marginBottom: 6, marginTop: 12, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, fontSize: 16, backgroundColor: '#fff' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: C.border },
  chipOn: { backgroundColor: C.brand, borderColor: C.brand },
  chipText: { fontSize: 14, fontWeight: '700', color: C.text, textTransform: 'capitalize' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  switchLabel: { fontSize: 15, fontWeight: '600', color: C.text, flex: 1 },
  inline: { flexDirection: 'row', gap: 10, alignItems: 'flex-end', marginTop: 4 },
  addBtn: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: C.border, borderStyle: 'dashed' },
  smallBtn: { flex: 1, height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  smallBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
