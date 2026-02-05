import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/Colors';
import { useStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import { format, addDays, startOfWeek } from 'date-fns';

type RequestType = 'time_off' | 'shift_swap' | 'schedule_change' | 'availability';

interface ShiftForSwap {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  user_name: string;
}

export default function ShiftRequestScreen() {
  const router = useRouter();
  const { user, currentLocation, shifts } = useStore();
  const [requestType, setRequestType] = useState<RequestType>('time_off');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableShifts, setAvailableShifts] = useState<ShiftForSwap[]>([]);
  const [selectedSwapShift, setSelectedSwapShift] = useState<string | null>(null);
  const [myShiftToSwap, setMyShiftToSwap] = useState<string | null>(null);

  // Generate next 14 days for date selection
  const upcomingDates = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(new Date(), i + 1);
    return {
      date: format(date, 'yyyy-MM-dd'),
      display: format(date, 'EEE, MMM d'),
      dayName: format(date, 'EEEE'),
    };
  });

  useEffect(() => {
    if (requestType === 'shift_swap') {
      fetchAvailableShifts();
    }
  }, [requestType]);

  const fetchAvailableShifts = async () => {
    if (!currentLocation || !user) return;

    const { data } = await supabase
      .from('shifts')
      .select('*, user:users!user_id(name)')
      .eq('location_id', currentLocation.id)
      .neq('user_id', user.id)
      .gte('date', format(new Date(), 'yyyy-MM-dd'))
      .order('date', { ascending: true })
      .limit(20);

    if (data) {
      setAvailableShifts(
        data.map((s) => ({
          id: s.id,
          date: s.date,
          start_time: s.start_time,
          end_time: s.end_time,
          user_name: s.user?.name || 'Unknown',
        }))
      );
    }
  };

  const toggleDate = (date: string) => {
    setSelectedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]
    );
  };

  const handleSubmit = async () => {
    if (requestType === 'time_off' && selectedDates.length === 0) {
      Alert.alert('Missing Information', 'Please select at least one date.');
      return;
    }

    if (requestType === 'shift_swap' && (!myShiftToSwap || !selectedSwapShift)) {
      Alert.alert('Missing Information', 'Please select your shift and the shift you want to swap with.');
      return;
    }

    if (!reason.trim()) {
      Alert.alert('Missing Information', 'Please provide a reason for your request.');
      return;
    }

    setIsSubmitting(true);

    try {
      const requestData: any = {
        user_id: user?.id,
        location_id: currentLocation?.id,
        type: requestType,
        reason: reason.trim(),
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      if (requestType === 'time_off') {
        requestData.dates = selectedDates;
      } else if (requestType === 'shift_swap') {
        requestData.my_shift_id = myShiftToSwap;
        requestData.swap_shift_id = selectedSwapShift;
      }

      const { error } = await supabase.from('shift_requests').insert(requestData);

      if (error) throw error;

      Alert.alert(
        'Request Submitted',
        'Your request has been submitted and is pending manager approval.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const myUpcomingShifts = shifts.filter(
    (s) => s.user_id === user?.id && new Date(s.date) >= new Date()
  );

  return (
    <ScrollView style={styles.container}>
      {/* Request Type Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Request Type</Text>
        <View style={styles.typeGrid}>
          <TouchableOpacity
            style={[styles.typeCard, requestType === 'time_off' && styles.typeCardActive]}
            onPress={() => setRequestType('time_off')}
          >
            <Ionicons
              name="calendar-outline"
              size={28}
              color={requestType === 'time_off' ? Colors.textOnPrimary : Colors.primary}
            />
            <Text style={[styles.typeText, requestType === 'time_off' && styles.typeTextActive]}>
              Time Off
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeCard, requestType === 'shift_swap' && styles.typeCardActive]}
            onPress={() => setRequestType('shift_swap')}
          >
            <Ionicons
              name="swap-horizontal"
              size={28}
              color={requestType === 'shift_swap' ? Colors.textOnPrimary : Colors.info}
            />
            <Text style={[styles.typeText, requestType === 'shift_swap' && styles.typeTextActive]}>
              Shift Swap
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeCard, requestType === 'schedule_change' && styles.typeCardActive]}
            onPress={() => setRequestType('schedule_change')}
          >
            <Ionicons
              name="time-outline"
              size={28}
              color={requestType === 'schedule_change' ? Colors.textOnPrimary : Colors.warning}
            />
            <Text style={[styles.typeText, requestType === 'schedule_change' && styles.typeTextActive]}>
              Schedule Change
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeCard, requestType === 'availability' && styles.typeCardActive]}
            onPress={() => setRequestType('availability')}
          >
            <Ionicons
              name="options-outline"
              size={28}
              color={requestType === 'availability' ? Colors.textOnPrimary : Colors.success}
            />
            <Text style={[styles.typeText, requestType === 'availability' && styles.typeTextActive]}>
              Availability
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Time Off: Date Selection */}
      {requestType === 'time_off' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Dates</Text>
          <Text style={styles.sectionSubtitle}>Tap to select multiple dates</Text>
          <View style={styles.dateGrid}>
            {upcomingDates.map((d) => (
              <TouchableOpacity
                key={d.date}
                style={[
                  styles.dateCard,
                  selectedDates.includes(d.date) && styles.dateCardSelected,
                ]}
                onPress={() => toggleDate(d.date)}
              >
                <Text
                  style={[
                    styles.dateDayName,
                    selectedDates.includes(d.date) && styles.dateTextSelected,
                  ]}
                >
                  {d.dayName.slice(0, 3)}
                </Text>
                <Text
                  style={[
                    styles.dateNumber,
                    selectedDates.includes(d.date) && styles.dateTextSelected,
                  ]}
                >
                  {format(new Date(d.date), 'd')}
                </Text>
                {selectedDates.includes(d.date) && (
                  <Ionicons name="checkmark-circle" size={16} color={Colors.textOnPrimary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
          {selectedDates.length > 0 && (
            <Text style={styles.selectedCount}>
              {selectedDates.length} day{selectedDates.length !== 1 ? 's' : ''} selected
            </Text>
          )}
        </View>
      )}

      {/* Shift Swap: Select Shifts */}
      {requestType === 'shift_swap' && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Shift to Swap</Text>
            {myUpcomingShifts.length === 0 ? (
              <Text style={styles.emptyText}>No upcoming shifts found</Text>
            ) : (
              myUpcomingShifts.map((shift) => (
                <TouchableOpacity
                  key={shift.id}
                  style={[
                    styles.shiftCard,
                    myShiftToSwap === shift.id && styles.shiftCardSelected,
                  ]}
                  onPress={() => setMyShiftToSwap(shift.id)}
                >
                  <View style={styles.shiftInfo}>
                    <Text style={styles.shiftDate}>
                      {format(new Date(shift.date), 'EEE, MMM d')}
                    </Text>
                    <Text style={styles.shiftTime}>
                      {shift.start_time} - {shift.end_time}
                    </Text>
                  </View>
                  {myShiftToSwap === shift.id && (
                    <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Swap With</Text>
            {availableShifts.length === 0 ? (
              <Text style={styles.emptyText}>No available shifts for swap</Text>
            ) : (
              availableShifts.map((shift) => (
                <TouchableOpacity
                  key={shift.id}
                  style={[
                    styles.shiftCard,
                    selectedSwapShift === shift.id && styles.shiftCardSelected,
                  ]}
                  onPress={() => setSelectedSwapShift(shift.id)}
                >
                  <View style={styles.shiftInfo}>
                    <Text style={styles.shiftDate}>
                      {format(new Date(shift.date), 'EEE, MMM d')}
                    </Text>
                    <Text style={styles.shiftTime}>
                      {shift.start_time} - {shift.end_time}
                    </Text>
                    <Text style={styles.shiftUser}>{shift.user_name}</Text>
                  </View>
                  {selectedSwapShift === shift.id && (
                    <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        </>
      )}

      {/* Reason Input */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reason</Text>
        <TextInput
          style={styles.reasonInput}
          value={reason}
          onChangeText={setReason}
          placeholder="Please provide a reason for your request..."
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <Ionicons name="paper-plane" size={24} color={Colors.textOnPrimary} />
        <Text style={styles.submitButtonText}>
          {isSubmitting ? 'Submitting...' : 'Submit Request'}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  section: {
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  sectionSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.xs,
  },
  typeCard: {
    width: '48%',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    margin: '1%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  typeCardActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  typeTextActive: {
    color: Colors.textOnPrimary,
  },
  dateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.xs,
  },
  dateCard: {
    width: '18%',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    margin: '1%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateCardSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dateDayName: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  dateNumber: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.text,
    marginVertical: 2,
  },
  dateTextSelected: {
    color: Colors.textOnPrimary,
  },
  selectedCount: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  shiftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  shiftCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  shiftInfo: {
    flex: 1,
  },
  shiftDate: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  shiftTime: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  shiftUser: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    marginTop: 2,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    padding: Spacing.lg,
  },
  reasonInput: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
    minHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: Colors.textOnPrimary,
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
});
