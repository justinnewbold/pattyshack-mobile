import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/Colors';
import { useStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import * as Location from 'expo-location';

interface TimeEntry {
  id: string;
  clock_in: string;
  clock_out?: string;
  location_name: string;
  total_hours?: number;
}

export default function TimeClockScreen() {
  const { user, currentLocation } = useStore();
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [isLoading, setIsLoading] = useState(false);
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    checkCurrentStatus();
    fetchRecentEntries();

    // Update current time every second
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Update elapsed time when clocked in
    if (isClockedIn && currentEntry) {
      const interval = setInterval(() => {
        const start = new Date(currentEntry.clock_in);
        const now = new Date();
        const diff = now.getTime() - start.getTime();

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setElapsedTime(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isClockedIn, currentEntry]);

  const checkCurrentStatus = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', user.id)
      .is('clock_out', null)
      .single();

    if (data) {
      setIsClockedIn(true);
      setCurrentEntry(data);
    }
  };

  const fetchRecentEntries = async () => {
    if (!user) return;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('clock_in', weekAgo.toISOString())
      .order('clock_in', { ascending: false })
      .limit(10);

    if (data) {
      setRecentEntries(data);
    }
  };

  const verifyLocation = async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Required',
          'Please enable location services to clock in/out.'
        );
        return false;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // In production, verify against store location coordinates
      // For now, just return true
      return true;
    } catch (error) {
      Alert.alert('Error', 'Unable to verify location. Please try again.');
      return false;
    }
  };

  const handleClockIn = async () => {
    if (!user || !currentLocation) return;

    setIsLoading(true);

    const locationVerified = await verifyLocation();
    if (!locationVerified) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          user_id: user.id,
          location_id: currentLocation.id,
          location_name: currentLocation.name,
          clock_in: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setIsClockedIn(true);
      setCurrentEntry(data);
      fetchRecentEntries();

      Alert.alert('Clocked In', `You've clocked in at ${currentLocation.name}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to clock in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!currentEntry) return;

    Alert.alert(
      'Clock Out',
      'Are you sure you want to clock out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clock Out',
          onPress: async () => {
            setIsLoading(true);

            const locationVerified = await verifyLocation();
            if (!locationVerified) {
              setIsLoading(false);
              return;
            }

            try {
              const clockOut = new Date();
              const clockIn = new Date(currentEntry.clock_in);
              const totalHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);

              const { error } = await supabase
                .from('time_entries')
                .update({
                  clock_out: clockOut.toISOString(),
                  total_hours: parseFloat(totalHours.toFixed(2)),
                })
                .eq('id', currentEntry.id);

              if (error) throw error;

              setIsClockedIn(false);
              setCurrentEntry(null);
              setElapsedTime('00:00:00');
              fetchRecentEntries();

              Alert.alert(
                'Clocked Out',
                `Total time: ${totalHours.toFixed(2)} hours`
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to clock out. Please try again.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const calculateHours = (clockIn: string, clockOut?: string) => {
    const start = new Date(clockIn);
    const end = clockOut ? new Date(clockOut) : new Date();
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return hours.toFixed(2);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Current Time Display */}
      <View style={styles.timeDisplay}>
        <Text style={styles.currentTime}>
          {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </Text>
        <Text style={styles.currentDate}>
          {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
      </View>

      {/* Clock Status Card */}
      <View style={[styles.statusCard, isClockedIn && styles.statusCardActive]}>
        <View style={styles.statusHeader}>
          <Ionicons
            name={isClockedIn ? 'time' : 'time-outline'}
            size={32}
            color={isClockedIn ? Colors.success : Colors.textSecondary}
          />
          <Text style={styles.statusText}>
            {isClockedIn ? 'Currently Working' : 'Not Clocked In'}
          </Text>
        </View>

        {isClockedIn && currentEntry && (
          <View style={styles.activeSession}>
            <Text style={styles.elapsedLabel}>Time Worked</Text>
            <Text style={styles.elapsedTime}>{elapsedTime}</Text>
            <Text style={styles.clockInTime}>
              Clocked in at {formatTime(new Date(currentEntry.clock_in))}
            </Text>
            <Text style={styles.locationText}>{currentEntry.location_name}</Text>
          </View>
        )}

        {/* Clock In/Out Button */}
        <TouchableOpacity
          style={[
            styles.clockButton,
            isClockedIn ? styles.clockOutButton : styles.clockInButton,
            isLoading && styles.clockButtonDisabled,
          ]}
          onPress={isClockedIn ? handleClockOut : handleClockIn}
          disabled={isLoading}
        >
          <Ionicons
            name={isClockedIn ? 'log-out-outline' : 'log-in-outline'}
            size={28}
            color={Colors.textOnPrimary}
          />
          <Text style={styles.clockButtonText}>
            {isLoading ? 'Please wait...' : isClockedIn ? 'Clock Out' : 'Clock In'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.locationNote}>
          <Ionicons name="location" size={14} color={Colors.textSecondary} />
          {' '}{currentLocation?.name || 'No location selected'}
        </Text>
      </View>

      {/* Recent Time Entries */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Time Entries</Text>
        {recentEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>No recent entries</Text>
          </View>
        ) : (
          recentEntries.map((entry) => (
            <View key={entry.id} style={styles.entryCard}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryDate}>{formatDate(entry.clock_in)}</Text>
                <Text style={styles.entryHours}>
                  {entry.clock_out
                    ? `${calculateHours(entry.clock_in, entry.clock_out)} hrs`
                    : 'In Progress'
                  }
                </Text>
              </View>
              <View style={styles.entryTimes}>
                <View style={styles.entryTimeItem}>
                  <Ionicons name="log-in-outline" size={16} color={Colors.success} />
                  <Text style={styles.entryTimeText}>
                    {formatTime(new Date(entry.clock_in))}
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color={Colors.textLight} />
                <View style={styles.entryTimeItem}>
                  <Ionicons name="log-out-outline" size={16} color={Colors.error} />
                  <Text style={styles.entryTimeText}>
                    {entry.clock_out
                      ? formatTime(new Date(entry.clock_out))
                      : '--:--'
                    }
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  timeDisplay: {
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.primary,
  },
  currentTime: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.textOnPrimary,
  },
  currentDate: {
    fontSize: FontSizes.lg,
    color: Colors.textOnPrimary + 'CC',
    marginTop: Spacing.xs,
  },
  statusCard: {
    backgroundColor: Colors.background,
    margin: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusCardActive: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  statusText: {
    fontSize: FontSizes.xl,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: Spacing.md,
  },
  activeSession: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  elapsedLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  elapsedTime: {
    fontSize: 56,
    fontWeight: 'bold',
    color: Colors.success,
    marginVertical: Spacing.sm,
  },
  clockInTime: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  locationText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    marginTop: Spacing.xs,
  },
  clockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  clockInButton: {
    backgroundColor: Colors.success,
  },
  clockOutButton: {
    backgroundColor: Colors.error,
  },
  clockButtonDisabled: {
    opacity: 0.6,
  },
  clockButtonText: {
    color: Colors.textOnPrimary,
    fontSize: FontSizes.xl,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  locationNote: {
    textAlign: 'center',
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  section: {
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
  },
  emptyText: {
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  entryCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  entryDate: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  entryHours: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.primary,
  },
  entryTimes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  entryTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  entryTimeText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
});
