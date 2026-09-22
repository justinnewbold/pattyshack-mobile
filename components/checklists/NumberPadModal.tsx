// Big on-screen keypad for temps and numbers. Works the same on iPad,
// Android tablets and web (no fighting with device keyboards, supports negatives).
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ChecklistItem } from '../../types/checklists';
import { rangeText, rangeVerdict } from '../../lib/checklists/logic';
import { C } from '../../lib/checklists/theme';

interface Props {
  visible: boolean;
  item: ChecklistItem | null;
  initial?: string | null;
  onClose: () => void;
  onSave: (value: string) => void;
}

const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '±', '0', '.'];

export default function NumberPadModal({ visible, item, initial, onClose, onSave }: Props) {
  const [v, setV] = useState('');
  useEffect(() => { if (visible) setV(initial ?? ''); }, [visible, initial]);
  if (!item) return null;

  const press = (k: string) => {
    if (k === '±') return setV(x => (x.startsWith('-') ? x.slice(1) : `-${x}`));
    if (k === '.' && v.includes('.')) return;
    if (v.replace('-', '').length >= 6) return;
    setV(x => x + k);
  };

  const n = Number(v);
  const valid = v !== '' && v !== '-' && !Number.isNaN(n);
  const verdict = valid ? rangeVerdict(item, n) : null;
  const vm = verdict === 'ok'
    ? { t: 'In range', c: C.ok, bg: C.okBg, i: 'checkmark-circle' as const }
    : verdict === 'too_cold'
      ? { t: item.type === 'temp' ? 'Too cold' : 'Too low', c: C.cold, bg: C.coldBg, i: 'snow' as const }
      : verdict === 'too_hot'
        ? { t: item.type === 'temp' ? 'Too hot' : 'Too high', c: C.bad, bg: C.badBg, i: 'flame' as const }
        : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>{item.label}</Text>
          {!!rangeText(item) && <Text style={styles.range}>Safe range: {rangeText(item)}</Text>}

          <View style={[styles.display, vm && { backgroundColor: vm.bg, borderColor: vm.c }]}>
            <Text style={[styles.value, vm && { color: vm.c }]}>{v || '—'}<Text style={styles.unit}>{item.unit || ''}</Text></Text>
            {vm && (
              <View style={styles.verdict}>
                <Ionicons name={vm.i} size={20} color={vm.c} />
                <Text style={[styles.verdictText, { color: vm.c }]}>{vm.t}</Text>
              </View>
            )}
          </View>

          <View style={styles.grid}>
            {KEYS.map(k => (
              <TouchableOpacity key={k} style={styles.key} onPress={() => press(k)}>
                <Text style={styles.keyText}>{k}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.row}>
            <TouchableOpacity style={[styles.btn, styles.ghost]} onPress={() => setV(x => x.slice(0, -1))}>
              <Ionicons name="backspace-outline" size={22} color={C.text} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.ghost]} onPress={onClose}>
              <Text style={styles.ghostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={!valid}
              style={[styles.btn, styles.save, !valid && { opacity: 0.4 }]}
              onPress={() => onSave(String(n))}
            >
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  sheet: { width: '100%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 20, padding: 20 },
  title: { fontSize: 18, fontWeight: '700', color: C.text },
  range: { fontSize: 14, color: C.sub, marginTop: 4 },
  display: { marginTop: 14, borderWidth: 2, borderColor: C.border, borderRadius: 14, padding: 14, alignItems: 'center' },
  value: { fontSize: 48, fontWeight: '800', color: C.text },
  unit: { fontSize: 24, fontWeight: '600' },
  verdict: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  verdictText: { fontSize: 16, fontWeight: '700', marginLeft: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 14 },
  key: { width: '31.5%', height: 64, marginBottom: 8, backgroundColor: C.bg, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 26, fontWeight: '700', color: C.text },
  row: { flexDirection: 'row', marginTop: 6, gap: 8 },
  btn: { flex: 1, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  ghost: { backgroundColor: C.bg },
  ghostText: { fontSize: 17, fontWeight: '600', color: C.text },
  save: { backgroundColor: C.brand, flex: 1.4 },
  saveText: { fontSize: 18, fontWeight: '800', color: '#fff' },
});
