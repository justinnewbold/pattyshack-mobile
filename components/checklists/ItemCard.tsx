import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ChecklistItem, ChecklistResponse } from '../../types/checklists';
import { needsCorrective, rangeText, rangeVerdict } from '../../lib/checklists/logic';
import { takePhoto } from '../../lib/photos';
import { C } from '../../lib/checklists/theme';

interface Props {
  index: number;
  item: ChecklistItem;
  response?: ChecklistResponse;
  locked: boolean;
  readOnly: boolean;
  signerName?: string;
  onAnswer: (patch: Partial<ChecklistResponse>) => void;
  onOpenPad: () => void;
  onCorrective: () => void;
}

export default function ItemCard({ index, item, response: r, locked, readOnly, signerName, onAnswer, onOpenPad, onCorrective }: Props) {
  const [text, setText] = useState(r?.value ?? '');
  useEffect(() => { setText(r?.value ?? ''); }, [r?.value]);

  const disabled = locked || readOnly;
  const failed = r?.passed === false && !r?.is_na;
  const open = needsCorrective(r);
  const answered = !!r && (r.is_na || !!r.value || !!r.photo_url);

  const borderColor = failed ? C.bad : answered ? C.ok : C.border;

  const renderInput = () => {
    switch (item.type) {
      case 'yes_no':
        return (
          <View style={styles.row}>
            {(['yes', 'no'] as const).map(v => {
              const on = r?.value === v && !r?.is_na;
              const color = v === 'yes' ? C.ok : C.bad;
              return (
                <TouchableOpacity key={v} disabled={disabled} onPress={() => onAnswer({ value: v, is_na: false })}
                  style={[styles.bigBtn, on && { backgroundColor: color, borderColor: color }]}>
                  <Ionicons name={v === 'yes' ? 'checkmark' : 'close'} size={24} color={on ? '#fff' : color} />
                  <Text style={[styles.bigBtnText, { color: on ? '#fff' : color }]}>{v === 'yes' ? 'Yes' : 'No'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );
      case 'choice':
        return (
          <View style={[styles.row, { flexWrap: 'wrap' }]}>
            {(item.options || []).map(o => {
              const on = r?.value === o && !r?.is_na;
              const bad = (item.fail_options || []).includes(o);
              const color = bad ? C.bad : C.brand;
              return (
                <TouchableOpacity key={o} disabled={disabled} onPress={() => onAnswer({ value: o, is_na: false })}
                  style={[styles.chip, on && { backgroundColor: color, borderColor: color }]}>
                  <Text style={[styles.chipText, on && { color: '#fff' }]}>{o}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );
      case 'temp':
      case 'number': {
        const has = r?.value != null && r.value !== '' && !r.is_na;
        const verdict = has ? rangeVerdict(item, Number(r!.value)) : null;
        const tone = verdict === 'ok' ? { c: C.ok, bg: C.okBg, t: 'In range' }
          : verdict === 'too_cold' ? { c: C.cold, bg: C.coldBg, t: item.type === 'temp' ? 'Too cold' : 'Too low' }
          : verdict === 'too_hot' ? { c: C.bad, bg: C.badBg, t: item.type === 'temp' ? 'Too hot' : 'Too high' }
          : null;
        return (
          <TouchableOpacity disabled={disabled} onPress={onOpenPad}
            style={[styles.tempBox, tone && { backgroundColor: tone.bg, borderColor: tone.c }]}>
            <Ionicons name={item.type === 'temp' ? 'thermometer-outline' : 'calculator-outline'} size={26} color={tone?.c || C.sub} />
            <Text style={[styles.tempValue, tone && { color: tone.c }]}>
              {has ? `${r!.value}${item.unit || ''}` : 'Tap to enter'}
            </Text>
            {tone && <Text style={[styles.tempVerdict, { color: tone.c }]}>{tone.t}</Text>}
          </TouchableOpacity>
        );
      }
      case 'photo':
        return r?.photo_url ? (
          <TouchableOpacity disabled={disabled} onPress={async () => { const p = await takePhoto(); if (p) onAnswer({ photo_url: p.uri, value: 'photo' }); }}>
            <Image source={{ uri: r.photo_url }} style={styles.photo} />
            {!disabled && <Text style={styles.hint}>Tap to retake</Text>}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity disabled={disabled} style={styles.photoBtn}
            onPress={async () => { const p = await takePhoto(); if (p) onAnswer({ photo_url: p.uri, value: 'photo' }); }}>
            <Ionicons name="camera-outline" size={24} color={C.text} />
            <Text style={styles.photoBtnText}>Take photo</Text>
          </TouchableOpacity>
        );
      case 'comment':
        return (
          <TextInput
            editable={!disabled}
            style={styles.input}
            value={text}
            onChangeText={setText}
            onBlur={() => { if ((text || '') !== (r?.value || '')) onAnswer({ value: text.trim() || null, is_na: false }); }}
            placeholder="Type here"
            multiline
          />
        );
      case 'signature':
        return r?.value ? (
          <View style={styles.signed}>
            <Ionicons name="create-outline" size={20} color={C.ok} />
            <Text style={styles.signedText}>{r.value}</Text>
            <Text style={styles.hint}>  {new Date(r.recorded_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
          </View>
        ) : (
          <View style={styles.row}>
            <TextInput
              editable={!disabled}
              style={[styles.input, { flex: 1, minHeight: 50 }]}
              value={text}
              onChangeText={setText}
              placeholder={signerName ? `Type your full name (${signerName})` : 'Type your full name'}
            />
            <TouchableOpacity disabled={disabled || text.trim().length < 2} onPress={() => onAnswer({ value: text.trim(), is_na: false })}
              style={[styles.signBtn, (disabled || text.trim().length < 2) && { opacity: 0.4 }]}>
              <Text style={styles.signBtnText}>Sign</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <View style={[styles.card, { borderColor }, locked && styles.locked]}>
      <View style={styles.head}>
        <View style={[styles.num, answered && !failed && { backgroundColor: C.ok }, failed && { backgroundColor: C.bad }]}>
          {answered && !failed ? <Ionicons name="checkmark" size={16} color="#fff" />
            : <Text style={[styles.numText, failed && { color: '#fff' }]}>{index + 1}</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{item.label}{item.required ? '' : '  (optional)'}</Text>
          {!!item.help && <Text style={styles.help}>{item.help}</Text>}
          {(item.type === 'temp' || item.type === 'number') && !!rangeText(item) && !item.help && (
            <Text style={styles.help}>Range {rangeText(item)}</Text>
          )}
        </View>
        {locked && <Ionicons name="lock-closed" size={20} color={C.sub} />}
      </View>

      {r?.is_na ? <Text style={styles.na}>Marked N/A</Text> : renderInput()}

      {!item.required && !disabled && !r?.value && (
        <TouchableOpacity onPress={() => onAnswer({ is_na: !r?.is_na, value: null })} style={styles.naBtn}>
          <Text style={styles.naBtnText}>{r?.is_na ? 'Undo N/A' : 'Skip / N/A'}</Text>
        </TouchableOpacity>
      )}

      {open && !readOnly && (
        <TouchableOpacity style={styles.fixBtn} onPress={onCorrective}>
          <Ionicons name="warning" size={20} color="#fff" />
          <Text style={styles.fixBtnText}>Record corrective action to continue</Text>
        </TouchableOpacity>
      )}
      {failed && !!r?.corrective_action && (
        <View style={styles.fixed}>
          <Ionicons name="shield-checkmark" size={18} color={C.warn} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.fixedTitle}>{r.corrective_action}</Text>
            {!!r.corrective_note && <Text style={styles.fixedNote}>{r.corrective_note}</Text>}
          </View>
          {!!r.corrective_photo_url && <Image source={{ uri: r.corrective_photo_url }} style={styles.thumb} />}
        </View>
      )}
      {!!r?.edited_note && <Text style={styles.edited}>Edited after completion: {r.edited_note}</Text>}
      {locked && <Text style={styles.lockedText}>Locked until the failed item above has a corrective action.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 2, padding: 16, marginBottom: 12 },
  locked: { opacity: 0.45 },
  head: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  num: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  numText: { fontSize: 14, fontWeight: '800', color: C.sub },
  label: { fontSize: 18, fontWeight: '700', color: C.text },
  help: { fontSize: 14, color: C.sub, marginTop: 2 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  bigBtn: { flex: 1, height: 60, borderRadius: 14, borderWidth: 2, borderColor: C.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  bigBtnText: { fontSize: 19, fontWeight: '800', marginLeft: 6 },
  chip: { paddingHorizontal: 18, paddingVertical: 14, borderRadius: 12, borderWidth: 2, borderColor: C.border },
  chipText: { fontSize: 16, fontWeight: '700', color: C.text },
  tempBox: { height: 72, borderRadius: 14, borderWidth: 2, borderColor: C.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  tempValue: { fontSize: 28, fontWeight: '800', color: C.sub, marginLeft: 10, flex: 1 },
  tempVerdict: { fontSize: 16, fontWeight: '800' },
  photoBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', padding: 14, borderRadius: 12, backgroundColor: C.bg },
  photoBtnText: { marginLeft: 8, fontSize: 17, fontWeight: '700', color: C.text },
  photo: { width: 200, height: 150, borderRadius: 12 },
  hint: { fontSize: 12, color: C.sub, marginTop: 4 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, fontSize: 17, minHeight: 60 },
  signed: { flexDirection: 'row', alignItems: 'center' },
  signedText: { fontSize: 22, fontStyle: 'italic', fontWeight: '600', color: C.text, marginLeft: 8 },
  signBtn: { height: 50, paddingHorizontal: 22, borderRadius: 12, backgroundColor: C.brand, justifyContent: 'center' },
  signBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  na: { fontSize: 16, fontWeight: '700', color: C.sub },
  naBtn: { alignSelf: 'flex-start', marginTop: 10 },
  naBtnText: { fontSize: 14, fontWeight: '700', color: C.info },
  fixBtn: { marginTop: 12, backgroundColor: C.bad, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  fixBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', marginLeft: 8 },
  fixed: { marginTop: 12, backgroundColor: C.warnBg, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center' },
  fixedTitle: { fontSize: 15, fontWeight: '800', color: C.warn },
  fixedNote: { fontSize: 14, color: C.text, marginTop: 2 },
  thumb: { width: 48, height: 48, borderRadius: 8, marginLeft: 8 },
  edited: { marginTop: 8, fontSize: 12, color: C.info, fontStyle: 'italic' },
  lockedText: { marginTop: 8, fontSize: 13, color: C.sub, fontWeight: '600' },
});
