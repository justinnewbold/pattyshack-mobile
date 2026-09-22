// Store tablet: today's food safety lists
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, useWindowDimensions, ActivityIndicator } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../lib/store';
import { useChecklists, usePendingCount } from '../../lib/checklists/store';
import { buildTodaySlots, formatTime, isHqRole, isManagerRole, isAnswered, localDateString } from '../../lib/checklists/logic';
import { scheduleChecklistReminders } from '../../lib/checklists/reminders';
import { C, STATION_LABELS } from '../../lib/checklists/theme';
import StatusBadge from '../../components/checklists/StatusBadge';
import type { ChecklistSlot } from '../../types/checklists';

export default function TodayChecklists() {
  const router = useRouter();
  const { user, currentLocation, locations, setCurrentLocation } = useStore();
  const ck = useChecklists();
  const pending = usePendingCount();
  const { width } = useWindowDimensions();
  const [station, setStation] = useState('all');
  const [now, setNow] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const locationId = currentLocation?.id;

  useEffect(() => { if (locationId) ck.load(locationId); }, [locationId]);
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  useFocusEffect(useCallback(() => { setNow(new Date()); }, []));

  const runs = useMemo(() => Object.values(ck.runs), [ck.runs]);
  const slots = useMemo(
    () => (locationId ? buildTodaySlots(ck.templates, ck.schedules, runs, locationId, localDateString(now), now) : []),
    [ck.templates, ck.schedules, runs, locationId, now],
  );
  const stations = useMemo(() => ['all', ...Array.from(new Set(ck.templates.map(t => t.station).filter(s => s !== 'all')))], [ck.templates]);
  const visible = slots.filter(s => station === 'all' || s.template.station === station || s.template.station === 'all');

  useEffect(() => { if (slots.length) scheduleChecklistReminders(slots); }, [slots.length, ck.lastSynced]);

  const late = slots.filter(s => s.status === 'late');
  const done = slots.filter(s => s.status === 'complete').length;
  const needSignoff = slots.filter(s => s.status === 'complete' && s.template.requires_signoff && !s.run?.signoff_at);

  const open = async (slot: ChecklistSlot) => {
    if (!user || !locationId) return;
    const run = await ck.startRun(slot, locationId, user.id);
    router.push(`/checklists/run/${run.id}`);
  };

  const onRefresh = async () => {
    if (!locationId) return;
    setRefreshing(true);
    await ck.refresh(locationId);
    setNow(new Date());
    setRefreshing(false);
  };

  const cols = width >= 1000 ? 3 : width >= 680 ? 2 : 1;

  if (!user) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Food Safety' }} />
        <Text style={styles.emptyTitle}>Sign in to see today's lists</Text>
        <TouchableOpacity style={styles.primary} onPress={() => router.push('/auth/login')}>
          <Text style={styles.primaryText}>Sign in</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ title: 'Food Safety Checklists' }} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.store}>{currentLocation?.name || 'No store selected'}</Text>
            <Text style={styles.date}>{now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })} · {done}/{slots.length} done</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: ck.online ? C.okBg : C.warnBg }]}>
            <Ionicons name={ck.online ? 'cloud-done-outline' : 'cloud-offline-outline'} size={16} color={ck.online ? C.ok : C.warn} />
            <Text style={[styles.pillText, { color: ck.online ? C.ok : C.warn }]}>
              {ck.online ? (ck.syncing ? 'Syncing…' : pending ? `${pending} to sync` : 'Synced') : `Offline${pending ? ` · ${pending} saved` : ''}`}
            </Text>
          </View>
        </View>

        {/* Store switcher for managers */}
        {isManagerRole(user.role) && locations.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            {locations.map(l => (
              <TouchableOpacity key={l.id} onPress={() => setCurrentLocation(l)} style={[styles.chip, l.id === locationId && styles.chipOn]}>
                <Text style={[styles.chipText, l.id === locationId && styles.chipTextOn]}>{l.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Station filter */}
        {stations.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {stations.map(s => (
              <TouchableOpacity key={s} onPress={() => setStation(s)} style={[styles.chip, station === s && styles.chipOn]}>
                <Text style={[styles.chipText, station === s && styles.chipTextOn]}>{STATION_LABELS[s] || s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {late.length > 0 && (
          <View style={styles.lateBanner}>
            <Ionicons name="alarm" size={22} color={C.bad} />
            <Text style={styles.lateText}>{late.length} list{late.length > 1 ? 's' : ''} missed or late: {late.map(s => s.template.name + (s.schedule.label ? ` ${s.schedule.label}` : '')).join(', ')}</Text>
          </View>
        )}
        {isManagerRole(user.role) && needSignoff.length > 0 && (
          <View style={[styles.lateBanner, { backgroundColor: C.warnBg }]}>
            <Ionicons name="create-outline" size={22} color={C.warn} />
            <Text style={[styles.lateText, { color: C.warn }]}>{needSignoff.length} list{needSignoff.length > 1 ? 's' : ''} waiting for your sign-off</Text>
          </View>
        )}
        {!!ck.syncError && ck.online && <Text style={styles.err}>{ck.syncError}</Text>}

        {!ck.loaded ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={C.brand} />
        ) : visible.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="checkmark-done-circle-outline" size={56} color={C.sub} />
            <Text style={styles.emptyTitle}>No lists scheduled {station === 'all' ? 'today' : 'for this station'}</Text>
            <Text style={styles.emptySub}>{ck.templates.length ? 'Pull down to refresh.' : 'Connect to the internet once to download your lists.'}</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {visible.map(slot => {
              const items = ck.itemsFor(slot.template.id);
              const resp = slot.run ? ck.responses[slot.run.id] || {} : {};
              const answered = items.filter(i => isAnswered(i, resp[i.id])).length;
              const fails = items.filter(i => resp[i.id]?.passed === false).length;
              return (
                <TouchableOpacity key={slot.key} style={[styles.card, { width: `${100 / cols - 2}%` as any }]} onPress={() => open(slot)}>
                  <View style={styles.cardTop}>
                    <StatusBadge status={slot.status} />
                    {slot.status === 'complete' && slot.template.requires_signoff && (
                      <Text style={[styles.small, { color: slot.run?.signoff_at ? C.ok : C.warn }]}>
                        {slot.run?.signoff_at ? '✓ Signed off' : 'Needs sign-off'}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.cardTitle}>{slot.template.name}{slot.schedule.label ? ` · ${slot.schedule.label}` : ''}</Text>
                  <Text style={styles.cardSub}>{formatTime(slot.schedule.window_start)} – {formatTime(slot.schedule.window_end)} · {STATION_LABELS[slot.template.station] || slot.template.station}</Text>
                  <View style={styles.bar}><View style={[styles.barFill, { width: `${items.length ? (answered / items.length) * 100 : 0}%`, backgroundColor: fails ? C.warn : C.brand }]} /></View>
                  <View style={styles.cardFoot}>
                    <Text style={styles.small}>{answered}/{items.length} items{fails ? ` · ${fails} fail${fails > 1 ? 's' : ''} fixed` : ''}</Text>
                    <Text style={styles.action}>{slot.status === 'complete' ? 'View' : slot.run ? 'Resume' : 'Start'} ›</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {isManagerRole(user.role) && (
          <View style={styles.tools}>
            <TouchableOpacity style={styles.tool} onPress={() => router.push('/checklists/manager')}>
              <Ionicons name="stats-chart-outline" size={22} color={C.info} />
              <Text style={styles.toolText}>Dashboard & inspector export</Text>
            </TouchableOpacity>
            {isHqRole(user.role) && (
              <TouchableOpacity style={styles.tool} onPress={() => router.push('/checklists/builder')}>
                <Ionicons name="construct-outline" size={22} color={C.info} />
                <Text style={styles.toolText}>List builder</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48, maxWidth: 1400, width: '100%', alignSelf: 'center' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 40, flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  store: { fontSize: 26, fontWeight: '800', color: C.text },
  date: { fontSize: 15, color: C.sub, marginTop: 2 },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  pillText: { marginLeft: 6, fontSize: 13, fontWeight: '700' },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, marginRight: 8 },
  chipOn: { backgroundColor: C.brand, borderColor: C.brand },
  chipText: { fontSize: 15, fontWeight: '700', color: C.text },
  chipTextOn: { color: '#fff' },
  lateBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.badBg, padding: 14, borderRadius: 14, marginBottom: 12 },
  lateText: { flex: 1, marginLeft: 10, fontSize: 15, fontWeight: '700', color: C.bad },
  err: { color: C.warn, fontSize: 13, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 14, minWidth: 260, flexGrow: 1, marginHorizontal: '1%', borderWidth: 1, borderColor: C.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 21, fontWeight: '800', color: C.text, marginTop: 12 },
  cardSub: { fontSize: 14, color: C.sub, marginTop: 4 },
  bar: { height: 8, backgroundColor: C.bg, borderRadius: 4, marginTop: 14, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  small: { fontSize: 13, color: C.sub, fontWeight: '600' },
  action: { fontSize: 15, fontWeight: '800', color: C.brand },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginTop: 12, textAlign: 'center' },
  emptySub: { fontSize: 14, color: C.sub, marginTop: 4, textAlign: 'center' },
  primary: { marginTop: 16, backgroundColor: C.brand, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  tools: { marginTop: 12, gap: 10 },
  tool: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: C.border },
  toolText: { marginLeft: 10, fontSize: 16, fontWeight: '700', color: C.info },
});
