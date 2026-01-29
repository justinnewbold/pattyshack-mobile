import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../lib/store';
import Colors from '../../constants/Colors';

export default function ShiftsScreen() {
  const { shifts, fetchShifts, user } = useStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchShifts();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchShifts();
    setRefreshing(false);
  };

  // Sample shifts if none loaded
  const displayShifts = shifts.length > 0 ? shifts : [
    { id: 1, date: 'Mon, Jan 27', time: '9:00 AM - 9:30 PM', location: 'Taylorsville', status: 'scheduled' },
    { id: 2, date: 'Tue, Jan 28', time: '10:00 AM - 6:00 PM', location: 'Taylorsville', status: 'scheduled' },
    { id: 3, date: 'Wed, Jan 29', time: 'OFF', location: '-', status: 'off' },
    { id: 4, date: 'Thu, Jan 30', time: '9:00 AM - 5:00 PM', location: 'Taylorsville', status: 'scheduled' },
    { id: 5, date: 'Fri, Jan 31', time: '11:00 AM - 8:00 PM', location: 'Salt Lake City', status: 'scheduled' },
    { id: 6, date: 'Sat, Feb 1', time: '9:00 AM - 9:30 PM', location: 'Taylorsville', status: 'scheduled' },
    { id: 7, date: 'Sun, Feb 2', time: 'OFF', location: '-', status: 'off' },
  ];

  const ShiftCard = ({ shift }) => {
    const isOff = shift.status === 'off' || shift.time === 'OFF';
    
    return (
      <View style={[styles.shiftCard, isOff && styles.shiftCardOff]}>
        <View style={styles.shiftLeft}>
          <View style={[styles.statusDot, isOff ? styles.statusOff : styles.statusScheduled]} />
          <View>
            <Text style={styles.shiftDate}>{shift.date}</Text>
            <Text style={[styles.shiftTime, isOff && styles.shiftTimeOff]}>
              {shift.time}
            </Text>
          </View>
        </View>
        <View style={styles.shiftRight}>
          <Text style={styles.shiftLocation}>{shift.location}</Text>
          {!isOff && (
            <View style={styles.hoursContainer}>
              <Ionicons name="time-outline" size={12} color={Colors.light.textSecondary} />
              <Text style={styles.hoursText}>
                {calculateHours(shift.time)}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const calculateHours = (timeString) => {
    if (!timeString || timeString === 'OFF') return '0h';
    const parts = timeString.split(' - ');
    if (parts.length !== 2) return '?h';
    
    // Simple calculation (not handling all edge cases)
    try {
      const parseTime = (t) => {
        const [time, period] = t.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return hours + (minutes || 0) / 60;
      };
      
      const start = parseTime(parts[0]);
      const end = parseTime(parts[1]);
      const diff = end > start ? end - start : (24 - start) + end;
      return `${Math.round(diff)}h`;
    } catch {
      return '?h';
    }
  };

  const totalHours = displayShifts.reduce((acc, shift) => {
    if (shift.time === 'OFF') return acc;
    const hours = parseFloat(calculateHours(shift.time));
    return acc + (isNaN(hours) ? 0 : hours);
  }, 0);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.light.primary}
          />
        }
      >
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{displayShifts.filter(s => s.time !== 'OFF').length}</Text>
            <Text style={styles.summaryLabel}>Shifts</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalHours}h</Text>
            <Text style={styles.summaryLabel}>Hours</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{displayShifts.filter(s => s.time === 'OFF').length}</Text>
            <Text style={styles.summaryLabel}>Days Off</Text>
          </View>
        </View>

        {/* Week Label */}
        <Text style={styles.sectionTitle}>This Week</Text>

        {/* Shift Cards */}
        {displayShifts.map(shift => (
          <ShiftCard key={shift.id} shift={shift} />
        ))}

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.statusScheduled]} />
            <Text style={styles.legendText}>Scheduled</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.statusOff]} />
            <Text style={styles.legendText}>Day Off</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Colors.spacing.md,
  },
  summaryCard: {
    backgroundColor: Colors.light.card,
    borderRadius: Colors.borderRadius.lg,
    padding: Colors.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: Colors.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: Colors.fontSize.xxl,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  summaryLabel: {
    fontSize: Colors.fontSize.sm,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.light.border,
  },
  sectionTitle: {
    fontSize: Colors.fontSize.lg,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Colors.spacing.md,
  },
  shiftCard: {
    backgroundColor: Colors.light.card,
    borderRadius: Colors.borderRadius.md,
    padding: Colors.spacing.md,
    marginBottom: Colors.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1,
  },
  shiftCardOff: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  shiftLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Colors.spacing.md,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusScheduled: {
    backgroundColor: Colors.light.primary,
  },
  statusOff: {
    backgroundColor: Colors.light.error,
  },
  shiftDate: {
    fontSize: Colors.fontSize.md,
    fontWeight: '600',
    color: Colors.light.text,
  },
  shiftTime: {
    fontSize: Colors.fontSize.sm,
    color: Colors.light.primary,
    marginTop: 2,
  },
  shiftTimeOff: {
    color: Colors.light.error,
  },
  shiftRight: {
    alignItems: 'flex-end',
  },
  shiftLocation: {
    fontSize: Colors.fontSize.sm,
    color: Colors.light.textSecondary,
  },
  hoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  hoursText: {
    fontSize: Colors.fontSize.xs,
    color: Colors.light.textSecondary,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Colors.spacing.xl,
    marginTop: Colors.spacing.lg,
    paddingTop: Colors.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Colors.spacing.sm,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: Colors.fontSize.sm,
    color: Colors.light.textSecondary,
  },
});
