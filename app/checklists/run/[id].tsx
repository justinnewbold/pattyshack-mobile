// Run a checklist: answer items in order, temps block on failure until a
// corrective action is recorded, complete, then manager sign-off.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Platform, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../../lib/store';
import { supabase } from '../../../lib/supabase';
import { useChecklists } from '../../../lib/checklists/store';
import { blockingIndex, canComplete, formatTime, isAnswered, isManagerRole, rangeText } from '../../../lib/checklists/logic';
import { C } from '../../../lib/checklists/theme';
import ItemCard from '../../../components/checklists/ItemCard';
import NumberPadModal from '../../../components/checklists/NumberPadModal';
import CorrectiveActionModal from '../../../components/checklists/CorrectiveActionModal';
import type { ChecklistItem, ChecklistResponse, ChecklistRun } from '../../../types/checklists';

function confirm(title: string, msg: string, onYes: () => void) {
  if (Platform.OS === 'web') { if (window.confirm(`${title}\n\n${msg}`)) onYes(); return; }
  Alert.alert(title, msg, [{ text: 'Cancel', style: 'cancel' }, { text: 'Yes', onPress: onYes }]);
}

export default function RunChecklist() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useStore();
  const ck = useChecklists();

  // Runs from other stores (opened from the dashboard) are loaded read-only
  const [remote, setRemote] = useState<{ run: ChecklistRun; responses: Record<string, ChecklistResponse> } | null>(null);
  const localRun = ck.runs[id!];
  useEffect(() => {
    if (localRun || !id) return;
    (async () => {
      const { data: run } = await supabase.from('checklist_runs').select('*').eq('id', id).single();
      if (!run) return;
      const { data: resp } = await supabase.from('checklist_responses').select('*').eq('run_id', id);
      const map: Record<string, ChecklistResponse> = {};
      (resp || []).forEach((r: ChecklistResponse) => { map[r.item_id] = r; });
      setRemote({ run, responses: map });
    })();
  }, [id, localRun]);

  const run = localRun || remote?.run;
  const responses = (localRun ? ck.responses[id!] : remote?.responses) || {};
  const template = ck.templates.find(t => t.id === run?.template_id);
  const items = useMemo(() => (run ? ck.itemsFor(run.template_id) : []), [run?.template_id, ck.items]);

  const [padItem, setPadItem] = useState<ChecklistItem | null>(null);
  const [fixItem, setFixItem] = useState<ChecklistItem | null>(null);
  const [signoffOpen, setSignoffOpen] = useState(false);
  const [signoffNote, setSignoffNote] = useState('');
  const [editNote, setEditNote] = useState<string | null>(null); // unlocked edit mode for finished lists
  const [editPrompt, setEditPrompt] = useState(false);
  const [draftEditNote, setDraftEditNote] = useState('');

  if (!run || !template || !user) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Checklist' }} />
        <ActivityIndicator color={C.brand} />
        <Text style={styles.sub}>Loading list…</Text>
      </View>
    );
  }

  const isRemote = !localRun;
  const complete = run.status === 'complete';
  const manager = isManagerRole(user.role);
  const readOnly = isRemote || (complete && !editNote);
  const block = complete ? -1 : blockingIndex(items, responses);
  const answered = items.filter(i => isAnswered(i, responses[i.id])).length;
  const status = canComplete(items, responses);

  const answer = (item: ChecklistItem, patch: Partial<ChecklistResponse>) => {
    if (complete && editNote) return ck.editCompleted(run.id, item, patch, user.id, editNote);
    return ck.setResponse(run.id, item, patch, user.id);
  };

  const onPadSave = async (value: string) => {
    const item = padItem!;
    setPadItem(null);
    await answer(item, { value, is_na: false });
    // Out-of-range temp opens the corrective action sheet right away
    const n = Number(value);
    const bad = (item.min_value != null && n < item.min_value) || (item.max_value != null && n > item.max_value);
    if (bad) setTimeout(() => setFixItem(item), 250);
  };

  const onYesNoOrChoice = async (item: ChecklistItem, patch: Partial<ChecklistResponse>) => {
    await answer(item, patch);
    const failed = (item.type === 'yes_no' && patch.value === 'no') ||
      (item.type === 'choice' && (item.fail_options || []).includes(String(patch.value)));
    if (failed) setTimeout(() => setFixItem(item), 250);
  };

  const finish = () => {
    if (!status.ok) {
      if (Platform.OS === 'web') window.alert(status.reason); else Alert.alert('Not finished yet', status.reason);
      return;
    }
    confirm('Complete this list?', 'Answers are locked after completing. Changes later need a manager note.', async () => {
      await ck.completeRun(run.id, user.id);
      if (template.requires_signoff && manager) setSignoffOpen(true);
      else router.back();
    });
  };

  const fixResp = fixItem ? responses[fixItem.id] : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ title: template.name }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{template.name}</Text>
          <Text style={styles.sub}>
            {run.run_date} · {formatTime(run.window_start)} – {formatTime(run.window_end)} · {answered}/{items.length} answered
          </Text>
          {!!template.description && <Text style={styles.desc}>{template.description}</Text>}
          {complete && (
            <View style={styles.doneBox}>
              <Ionicons name="checkmark-circle" size={22} color={C.ok} />
              <Text style={styles.doneText}>
                Completed {run.completed_at ? new Date(run.completed_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''}
                {run.signoff_at ? ' · Manager signed off' : template.requires_signoff ? ' · Waiting for manager sign-off' : ''}
              </Text>
            </View>
          )}
          {!!run.signoff_note && <Text style={styles.desc}>Sign-off note: {run.signoff_note}</Text>}
          {isRemote && <Text style={[styles.desc, { color: C.info }]}>Viewing another store's list (read-only).</Text>}
          {editNote && <Text style={[styles.desc, { color: C.warn }]}>Editing a finished list. Reason: {editNote}</Text>}
        </View>

        {items.map((item, idx) => (
          <ItemCard
            key={item.id}
            index={idx}
            item={item}
            response={responses[item.id]}
            locked={block >= 0 && idx > block}
            readOnly={readOnly}
            signerName={user.name}
            onAnswer={patch => (item.type === 'yes_no' || item.type === 'choice') ? onYesNoOrChoice(item, patch) : answer(item, patch)}
            onOpenPad={() => setPadItem(item)}
            onCorrective={() => setFixItem(item)}
          />
        ))}

        {!complete && !isRemote && (
          <TouchableOpacity style={[styles.cta, !status.ok && styles.ctaOff]} onPress={finish}>
            <Ionicons name="checkmark-done" size={24} color="#fff" />
            <Text style={styles.ctaText}>{status.ok ? 'Complete list' : status.reason}</Text>
          </TouchableOpacity>
        )}
        {complete && !isRemote && manager && template.requires_signoff && !run.signoff_at && (
          <TouchableOpacity style={styles.cta} onPress={() => setSignoffOpen(true)}>
            <Ionicons name="create" size={22} color="#fff" />
            <Text style={styles.ctaText}>Manager sign-off</Text>
          </TouchableOpacity>
        )}
        {complete && !isRemote && manager && !editNote && (
          <TouchableOpacity style={[styles.cta, { backgroundColor: '#fff', borderWidth: 2, borderColor: C.border }]} onPress={() => { setDraftEditNote(''); setEditPrompt(true); }}>
            <Ionicons name="lock-open-outline" size={22} color={C.text} />
            <Text style={[styles.ctaText, { color: C.text }]}>Edit finished list (note required)</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <NumberPadModal visible={!!padItem} item={padItem} initial={padItem ? responses[padItem.id]?.value : ''} onClose={() => setPadItem(null)} onSave={onPadSave} />

      <CorrectiveActionModal
        visible={!!fixItem}
        title={fixItem?.label || ''}
        detail={fixItem && fixResp?.value
          ? `Recorded: ${fixResp.value}${fixItem.unit || ''}${rangeText(fixItem) ? ` (safe: ${rangeText(fixItem)})` : ''}`
          : undefined}
        onClose={() => setFixItem(null)}
        onSave={async (action, note, photo) => {
          const item = fixItem!;
          setFixItem(null);
          await answer(item, { corrective_action: action, corrective_note: note || null, corrective_photo_url: photo });
        }}
      />

      {/* Manager sign-off */}
      <Modal visible={signoffOpen} transparent animationType="fade" onRequestClose={() => setSignoffOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Manager sign-off</Text>
            <Text style={styles.sub}>Signing as {user.name}</Text>
            <TextInput style={styles.input} value={signoffNote} onChangeText={setSignoffNote} placeholder="Note (optional)" multiline />
            <View style={styles.row}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: C.bg }]} onPress={() => { setSignoffOpen(false); router.back(); }}>
                <Text style={styles.btnText}>Later</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: C.brand }]} onPress={async () => {
                await ck.signOff(run.id, user.id, signoffNote.trim());
                setSignoffOpen(false);
                router.back();
              }}>
                <Text style={[styles.btnText, { color: '#fff' }]}>Sign off</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reason for editing a finished list */}
      <Modal visible={editPrompt} transparent animationType="fade" onRequestClose={() => setEditPrompt(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Why are you changing this list?</Text>
            <Text style={styles.sub}>This note is saved in the audit trail with your name and the time.</Text>
            <TextInput style={styles.input} value={draftEditNote} onChangeText={setDraftEditNote} placeholder="Example: crew entered 14 instead of 41" multiline />
            <View style={styles.row}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: C.bg }]} onPress={() => setEditPrompt(false)}>
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={draftEditNote.trim().length < 5} style={[styles.btn, { backgroundColor: C.warn }, draftEditNote.trim().length < 5 && { opacity: 0.4 }]}
                onPress={() => { setEditNote(`${draftEditNote.trim()} (${user.name})`); setEditPrompt(false); }}>
                <Text style={[styles.btnText, { color: '#fff' }]}>Unlock</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 60, maxWidth: 820, width: '100%', alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: C.text },
  sub: { fontSize: 15, color: C.sub, marginTop: 4 },
  desc: { fontSize: 14, color: C.sub, marginTop: 6 },
  doneBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.okBg, padding: 12, borderRadius: 12, marginTop: 10 },
  doneText: { marginLeft: 8, fontSize: 15, fontWeight: '700', color: C.ok, flex: 1 },
  cta: { marginTop: 8, marginBottom: 8, height: 64, borderRadius: 16, backgroundColor: C.brand, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  ctaOff: { backgroundColor: '#9CA3AF' },
  ctaText: { color: '#fff', fontSize: 18, fontWeight: '800', marginLeft: 8, flexShrink: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  sheet: { width: '100%', maxWidth: 480, backgroundColor: '#fff', borderRadius: 20, padding: 20 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: C.text },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, fontSize: 16, minHeight: 70, marginTop: 14 },
  row: { flexDirection: 'row', gap: 10, marginTop: 16 },
  btn: { flex: 1, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 17, fontWeight: '800', color: C.text },
});
