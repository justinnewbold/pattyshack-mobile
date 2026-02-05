import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/Colors';
import { useStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';

interface EquipmentItem {
  id: string;
  name: string;
  minTemp: number;
  maxTemp: number;
  lastReading?: number;
  lastReadingTime?: string;
}

const EQUIPMENT_LIST: EquipmentItem[] = [
  { id: 'walk-in-cooler', name: 'Walk-in Cooler', minTemp: 35, maxTemp: 40 },
  { id: 'walk-in-freezer', name: 'Walk-in Freezer', minTemp: -10, maxTemp: 0 },
  { id: 'prep-cooler', name: 'Prep Cooler', minTemp: 35, maxTemp: 40 },
  { id: 'burger-cooler', name: 'Burger Cooler', minTemp: 35, maxTemp: 40 },
  { id: 'ice-cream-freezer', name: 'Ice Cream Freezer', minTemp: -20, maxTemp: -10 },
  { id: 'drink-cooler', name: 'Drink Cooler', minTemp: 35, maxTemp: 45 },
];

export default function TemperatureLogScreen() {
  const router = useRouter();
  const { user, currentLocation, fetchStats } = useStore();
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentItem | null>(null);
  const [temperature, setTemperature] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchRecentLogs();
  }, []);

  const fetchRecentLogs = async () => {
    if (!currentLocation) return;

    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('temperature_logs')
      .select('*')
      .eq('location_id', currentLocation.id)
      .gte('logged_at', `${today}T00:00:00`)
      .order('logged_at', { ascending: false })
      .limit(10);

    if (data) {
      setRecentLogs(data);
    }
  };

  const handleSubmit = async () => {
    if (!selectedEquipment || !temperature) {
      Alert.alert('Missing Information', 'Please select equipment and enter a temperature.');
      return;
    }

    const tempValue = parseFloat(temperature);
    if (isNaN(tempValue)) {
      Alert.alert('Invalid Temperature', 'Please enter a valid number.');
      return;
    }

    const isCompliant = tempValue >= selectedEquipment.minTemp && tempValue <= selectedEquipment.maxTemp;

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('temperature_logs').insert({
        location_id: currentLocation?.id,
        equipment_name: selectedEquipment.name,
        temperature: tempValue,
        unit: 'F',
        logged_by: user?.id,
        logged_at: new Date().toISOString(),
        is_compliant: isCompliant,
        min_temp: selectedEquipment.minTemp,
        max_temp: selectedEquipment.maxTemp,
        notes: notes || null,
      });

      if (error) throw error;

      if (!isCompliant) {
        Alert.alert(
          'Temperature Out of Range',
          `The temperature ${tempValue}°F is outside the acceptable range (${selectedEquipment.minTemp}°F - ${selectedEquipment.maxTemp}°F). Please take corrective action.`,
          [{ text: 'OK', onPress: () => resetForm() }]
        );
      } else {
        Alert.alert('Success', 'Temperature logged successfully!', [
          { text: 'Log Another', onPress: () => resetForm() },
          { text: 'Done', onPress: () => router.back() },
        ]);
      }

      fetchRecentLogs();
      fetchStats();
    } catch (error) {
      Alert.alert('Error', 'Failed to log temperature. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedEquipment(null);
    setTemperature('');
    setNotes('');
  };

  const getComplianceColor = (temp: number, min: number, max: number) => {
    if (temp >= min && temp <= max) return Colors.success;
    return Colors.error;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Equipment Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Equipment</Text>
          <View style={styles.equipmentGrid}>
            {EQUIPMENT_LIST.map((equipment) => (
              <TouchableOpacity
                key={equipment.id}
                style={[
                  styles.equipmentCard,
                  selectedEquipment?.id === equipment.id && styles.equipmentCardSelected,
                ]}
                onPress={() => setSelectedEquipment(equipment)}
              >
                <Ionicons
                  name="thermometer-outline"
                  size={24}
                  color={selectedEquipment?.id === equipment.id ? Colors.textOnPrimary : Colors.primary}
                />
                <Text
                  style={[
                    styles.equipmentName,
                    selectedEquipment?.id === equipment.id && styles.equipmentNameSelected,
                  ]}
                >
                  {equipment.name}
                </Text>
                <Text
                  style={[
                    styles.equipmentRange,
                    selectedEquipment?.id === equipment.id && styles.equipmentRangeSelected,
                  ]}
                >
                  {equipment.minTemp}°F - {equipment.maxTemp}°F
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Temperature Input */}
        {selectedEquipment && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Enter Temperature</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.temperatureInput}
                value={temperature}
                onChangeText={setTemperature}
                placeholder="0"
                keyboardType="numeric"
                maxLength={5}
              />
              <Text style={styles.temperatureUnit}>°F</Text>
            </View>
            <Text style={styles.rangeHint}>
              Acceptable range: {selectedEquipment.minTemp}°F - {selectedEquipment.maxTemp}°F
            </Text>

            {/* Notes Input */}
            <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any notes about this reading..."
              multiline
              numberOfLines={3}
            />

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Ionicons name="checkmark-circle" size={24} color={Colors.textOnPrimary} />
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Logging...' : 'Log Temperature'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Recent Logs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Logs</Text>
          {recentLogs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color={Colors.textLight} />
              <Text style={styles.emptyText}>No logs recorded today</Text>
            </View>
          ) : (
            recentLogs.map((log, index) => (
              <View key={log.id || index} style={styles.logCard}>
                <View style={styles.logHeader}>
                  <Text style={styles.logEquipment}>{log.equipment_name}</Text>
                  <View
                    style={[
                      styles.complianceBadge,
                      { backgroundColor: log.is_compliant ? Colors.success : Colors.error },
                    ]}
                  >
                    <Text style={styles.complianceBadgeText}>
                      {log.is_compliant ? 'OK' : 'ALERT'}
                    </Text>
                  </View>
                </View>
                <View style={styles.logDetails}>
                  <Text
                    style={[
                      styles.logTemp,
                      { color: getComplianceColor(log.temperature, log.min_temp, log.max_temp) },
                    ]}
                  >
                    {log.temperature}°{log.unit}
                  </Text>
                  <Text style={styles.logTime}>
                    {new Date(log.logged_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                {log.notes && <Text style={styles.logNotes}>{log.notes}</Text>}
              </View>
            ))
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  scrollView: {
    flex: 1,
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
  equipmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.xs,
  },
  equipmentCard: {
    width: '48%',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    margin: '1%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  equipmentCardSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  equipmentName: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  equipmentNameSelected: {
    color: Colors.textOnPrimary,
  },
  equipmentRange: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  equipmentRangeSelected: {
    color: Colors.textOnPrimary + 'CC',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  temperatureInput: {
    fontSize: 64,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    minWidth: 150,
  },
  temperatureUnit: {
    fontSize: 32,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
  rangeHint: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  notesInput: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: Colors.textOnPrimary,
    fontSize: FontSizes.lg,
    fontWeight: '600',
    marginLeft: Spacing.sm,
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
  logCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logEquipment: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  complianceBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  complianceBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: 'bold',
    color: Colors.textOnPrimary,
  },
  logDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  logTemp: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
  },
  logTime: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  logNotes: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
});
