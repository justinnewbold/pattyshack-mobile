import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import type { SlotStatus } from '../../types/checklists';
import { STATUS_META } from '../../lib/checklists/logic';

export default function StatusBadge({ status, label }: { status: SlotStatus; label?: string }) {
  const m = STATUS_META[status];
  return (
    <View style={[styles.badge, { backgroundColor: m.bg }]}>
      <View style={[styles.dot, { backgroundColor: m.color }]} />
      <Text style={[styles.text, { color: m.color }]}>{label || m.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  text: { fontSize: 13, fontWeight: '700' },
});
