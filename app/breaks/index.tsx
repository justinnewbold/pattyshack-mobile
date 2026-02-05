import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/Colors';
import { useStore } from '../../lib/store';
import { format, differenceInMinutes } from 'date-fns';

interface BreakEntry {
  id: string;
  type: 'meal' | 'rest';
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  status: 'active' | 'completed' | 'missed';
}

export default function BreakTrackingScreen() {
  const { user } = useStore();
  const [currentBreak, setCurrentBreak] = useState<BreakEntry | null>(null);
  const [breaks, setBreaks] = useState<BreakEntry[]>([
    { id: '1', type: 'meal', start_time: '2025-01-28T12:00:00', end_time: '2025-01-28T12:30:00', duration_minutes: 30, status: 'completed' },
    { id: '2', type: 'rest', start_time: '2025-01-28T10:00:00', end_time: '2025-01-28T10:10:00', duration_minutes: 10, status: 'completed' },
  ]);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Timer for active break
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentBreak) {
      interval = setInterval(() => {
        const elapsed = differenceInMinutes(new Date(), new Date(currentBreak.start_time));
        setElapsedTime(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentBreak]);

  const startBreak = (type: 'meal' | 'rest') => {
    if (currentBreak) {
      Alert.alert('Break In Progress', 'Please end your current break first.');
      return;
    }

    const newBreak: BreakEntry = {
      id: Date.now().toString(),
      type,
      start_time: new Date().toISOString(),
      status: 'active',
    };

    setCurrentBreak(newBreak);
    setElapsedTime(0);
  };

  const endBreak = () => {
    if (!currentBreak) return;

    const endTime = new Date();
    const duration = differenceInMinutes(endTime, new Date(currentBreak.start_time));

    const completedBreak: BreakEntry = {
      ...currentBreak,
      end_time: endTime.toISOString(),
      duration_minutes: duration,
      status: 'completed',
    };

    setBreaks((prev) => [completedBreak, ...prev]);
    setCurrentBreak(null);
    setElapsedTime(0);

    // Check compliance
    if (currentBreak.type === 'meal' && duration < 30) {
      Alert.alert('Compliance Warning', 'Meal breaks should be at least 30 minutes.');
    } else if (currentBreak.type === 'rest' && duration < 10) {
      Alert.alert('Compliance Warning', 'Rest breaks should be at least 10 minutes.');
    }
  };

  const getBreakRequirements = () => {
    // Based on typical labor laws (varies by state)
    return {
      mealBreak: { required: true, afterHours: 5, duration: 30 },
      restBreak: { required: true, afterHours: 4, duration: 10 },
    };
  };

  const requirements = getBreakRequirements();
  const todayBreaks = breaks.filter((b) => {
    const breakDate = new Date(b.start_time).toDateString();
    return breakDate === new Date().toDateString();
  });
  const todayMealBreaks = todayBreaks.filter((b) => b.type === 'meal');
  const todayRestBreaks = todayBreaks.filter((b) => b.type === 'rest');

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m`;
  };

  return (
    <View style={styles.container}>
      {/* Current Break Status */}
      {currentBreak ? (
        <View style={[styles.activeBreakCard, currentBreak.type === 'meal' ? styles.mealBreak : styles.restBreak]}>
          <View style={styles.activeBreakHeader}>
            <Ionicons
              name={currentBreak.type === 'meal' ? 'restaurant' : 'cafe'}
              size={32}
              color={Colors.textOnPrimary}
            />
            <Text style={styles.activeBreakTitle}>
              {currentBreak.type === 'meal' ? 'Meal Break' : 'Rest Break'} in Progress
            </Text>
          </View>
          <Text style={styles.activeBreakTime}>{elapsedTime} min</Text>
          <Text style={styles.activeBreakStarted}>
            Started at {format(new Date(currentBreak.start_time), 'h:mm a')}
          </Text>
          <TouchableOpacity style={styles.endBreakButton} onPress={endBreak}>
            <Ionicons name="stop-circle" size={24} color={Colors.error} />
            <Text style={styles.endBreakText}>End Break</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.startBreakCard}>
          <Text style={styles.startBreakTitle}>Start a Break</Text>
          <View style={styles.breakButtons}>
            <TouchableOpacity
              style={[styles.breakButton, styles.mealBreakButton]}
              onPress={() => startBreak('meal')}
            >
              <Ionicons name="restaurant" size={32} color={Colors.textOnPrimary} />
              <Text style={styles.breakButtonTitle}>Meal Break</Text>
              <Text style={styles.breakButtonSubtitle}>30 min minimum</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.breakButton, styles.restBreakButton]}
              onPress={() => startBreak('rest')}
            >
              <Ionicons name="cafe" size={32} color={Colors.textOnPrimary} />
              <Text style={styles.breakButtonTitle}>Rest Break</Text>
              <Text style={styles.breakButtonSubtitle}>10 min minimum</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Compliance Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Compliance</Text>
        <View style={styles.complianceRow}>
          <View style={styles.complianceItem}>
            <View style={[styles.complianceIcon, { backgroundColor: todayMealBreaks.length > 0 ? Colors.success + '20' : Colors.warning + '20' }]}>
              <Ionicons
                name="restaurant"
                size={24}
                color={todayMealBreaks.length > 0 ? Colors.success : Colors.warning}
              />
            </View>
            <Text style={styles.complianceLabel}>Meal Breaks</Text>
            <Text style={[styles.complianceValue, { color: todayMealBreaks.length > 0 ? Colors.success : Colors.warning }]}>
              {todayMealBreaks.length} taken
            </Text>
          </View>
          <View style={styles.complianceItem}>
            <View style={[styles.complianceIcon, { backgroundColor: todayRestBreaks.length > 0 ? Colors.success + '20' : Colors.warning + '20' }]}>
              <Ionicons
                name="cafe"
                size={24}
                color={todayRestBreaks.length > 0 ? Colors.success : Colors.warning}
              />
            </View>
            <Text style={styles.complianceLabel}>Rest Breaks</Text>
            <Text style={[styles.complianceValue, { color: todayRestBreaks.length > 0 ? Colors.success : Colors.warning }]}>
              {todayRestBreaks.length} taken
            </Text>
          </View>
        </View>
      </View>

      {/* Break History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Break History</Text>
        <ScrollView>
          {todayBreaks.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={48} color={Colors.textLight} />
              <Text style={styles.emptyText}>No breaks taken today</Text>
            </View>
          ) : (
            todayBreaks.map((breakEntry) => (
              <View key={breakEntry.id} style={styles.historyCard}>
                <View style={[styles.historyIcon, breakEntry.type === 'meal' ? styles.mealIcon : styles.restIcon]}>
                  <Ionicons
                    name={breakEntry.type === 'meal' ? 'restaurant' : 'cafe'}
                    size={20}
                    color={Colors.textOnPrimary}
                  />
                </View>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyType}>
                    {breakEntry.type === 'meal' ? 'Meal Break' : 'Rest Break'}
                  </Text>
                  <Text style={styles.historyTime}>
                    {format(new Date(breakEntry.start_time), 'h:mm a')}
                    {breakEntry.end_time && ` - ${format(new Date(breakEntry.end_time), 'h:mm a')}`}
                  </Text>
                </View>
                <View style={styles.historyDuration}>
                  <Text style={styles.durationValue}>{breakEntry.duration_minutes || 0}</Text>
                  <Text style={styles.durationLabel}>min</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  activeBreakCard: { margin: Spacing.md, padding: Spacing.xl, borderRadius: BorderRadius.lg, alignItems: 'center' },
  mealBreak: { backgroundColor: Colors.primary },
  restBreak: { backgroundColor: Colors.info },
  activeBreakHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  activeBreakTitle: { fontSize: FontSizes.lg, fontWeight: '600', color: Colors.textOnPrimary },
  activeBreakTime: { fontSize: 64, fontWeight: 'bold', color: Colors.textOnPrimary, marginVertical: Spacing.md },
  activeBreakStarted: { fontSize: FontSizes.md, color: Colors.textOnPrimary + 'CC' },
  endBreakButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.lg, marginTop: Spacing.lg, gap: Spacing.sm },
  endBreakText: { fontSize: FontSizes.lg, fontWeight: '600', color: Colors.error },
  startBreakCard: { margin: Spacing.md, padding: Spacing.lg, backgroundColor: Colors.background, borderRadius: BorderRadius.lg },
  startBreakTitle: { fontSize: FontSizes.lg, fontWeight: '600', color: Colors.text, marginBottom: Spacing.md, textAlign: 'center' },
  breakButtons: { flexDirection: 'row', gap: Spacing.md },
  breakButton: { flex: 1, padding: Spacing.lg, borderRadius: BorderRadius.lg, alignItems: 'center' },
  mealBreakButton: { backgroundColor: Colors.primary },
  restBreakButton: { backgroundColor: Colors.info },
  breakButtonTitle: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.textOnPrimary, marginTop: Spacing.sm },
  breakButtonSubtitle: { fontSize: FontSizes.sm, color: Colors.textOnPrimary + 'CC' },
  section: { padding: Spacing.md },
  sectionTitle: { fontSize: FontSizes.lg, fontWeight: '600', color: Colors.text, marginBottom: Spacing.md },
  complianceRow: { flexDirection: 'row', gap: Spacing.md },
  complianceItem: { flex: 1, backgroundColor: Colors.background, padding: Spacing.md, borderRadius: BorderRadius.lg, alignItems: 'center' },
  complianceIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  complianceLabel: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  complianceValue: { fontSize: FontSizes.md, fontWeight: '600', marginTop: Spacing.xs },
  emptyState: { alignItems: 'center', padding: Spacing.xl, backgroundColor: Colors.background, borderRadius: BorderRadius.lg },
  emptyText: { color: Colors.textSecondary, marginTop: Spacing.sm },
  historyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, padding: Spacing.md, borderRadius: BorderRadius.lg, marginBottom: Spacing.sm },
  historyIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  mealIcon: { backgroundColor: Colors.primary },
  restIcon: { backgroundColor: Colors.info },
  historyInfo: { flex: 1, marginLeft: Spacing.md },
  historyType: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  historyTime: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  historyDuration: { alignItems: 'center' },
  durationValue: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  durationLabel: { fontSize: FontSizes.xs, color: Colors.textSecondary },
});
