import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/Colors';
import { useStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import { format, differenceInDays, addDays } from 'date-fns';

interface Equipment {
  id: string;
  name: string;
  type: 'fryer' | 'grill' | 'cooler' | 'freezer' | 'oven' | 'mixer' | 'other';
  serial_number?: string;
  last_maintenance?: string;
  next_maintenance?: string;
  status: 'operational' | 'needs_maintenance' | 'out_of_service';
  notes?: string;
}

interface MaintenanceLog {
  id: string;
  equipment_id: string;
  type: 'routine' | 'repair' | 'inspection' | 'cleaning';
  description: string;
  performed_by: string;
  performed_at: string;
  cost?: number;
}

const SAMPLE_EQUIPMENT: Equipment[] = [
  {
    id: '1',
    name: 'Fryer #1',
    type: 'fryer',
    serial_number: 'FR-2023-001',
    last_maintenance: '2025-01-15',
    next_maintenance: '2025-02-15',
    status: 'operational',
  },
  {
    id: '2',
    name: 'Fryer #2',
    type: 'fryer',
    serial_number: 'FR-2023-002',
    last_maintenance: '2025-01-10',
    next_maintenance: '2025-02-10',
    status: 'needs_maintenance',
  },
  {
    id: '3',
    name: 'Main Grill',
    type: 'grill',
    serial_number: 'GR-2022-001',
    last_maintenance: '2025-01-20',
    next_maintenance: '2025-03-20',
    status: 'operational',
  },
  {
    id: '4',
    name: 'Walk-in Cooler',
    type: 'cooler',
    serial_number: 'WC-2021-001',
    last_maintenance: '2025-01-05',
    next_maintenance: '2025-04-05',
    status: 'operational',
  },
  {
    id: '5',
    name: 'Walk-in Freezer',
    type: 'freezer',
    serial_number: 'WF-2021-001',
    last_maintenance: '2024-12-15',
    next_maintenance: '2025-01-30',
    status: 'out_of_service',
    notes: 'Compressor issue - technician scheduled',
  },
];

export default function EquipmentMaintenanceScreen() {
  const { user, currentLocation } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [equipment, setEquipment] = useState<Equipment[]>(SAMPLE_EQUIPMENT);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logType, setLogType] = useState<MaintenanceLog['type']>('routine');
  const [logDescription, setLogDescription] = useState('');

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const getTypeIcon = (type: Equipment['type']): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'fryer': return 'flame';
      case 'grill': return 'restaurant';
      case 'cooler': return 'snow';
      case 'freezer': return 'snow';
      case 'oven': return 'bonfire';
      case 'mixer': return 'sync';
      default: return 'construct';
    }
  };

  const getStatusColor = (status: Equipment['status']) => {
    switch (status) {
      case 'operational': return Colors.success;
      case 'needs_maintenance': return Colors.warning;
      case 'out_of_service': return Colors.error;
    }
  };

  const getStatusText = (status: Equipment['status']) => {
    switch (status) {
      case 'operational': return 'Operational';
      case 'needs_maintenance': return 'Needs Maintenance';
      case 'out_of_service': return 'Out of Service';
    }
  };

  const getDaysUntilMaintenance = (nextMaintenance?: string) => {
    if (!nextMaintenance) return null;
    return differenceInDays(new Date(nextMaintenance), new Date());
  };

  const handleLogMaintenance = async () => {
    if (!selectedEquipment || !logDescription.trim()) {
      Alert.alert('Missing Information', 'Please enter a description.');
      return;
    }

    try {
      // In real app, save to database
      Alert.alert('Success', 'Maintenance logged successfully!');
      setShowLogModal(false);
      setLogDescription('');
      setSelectedEquipment(null);

      // Update local state
      setEquipment((prev) =>
        prev.map((e) =>
          e.id === selectedEquipment.id
            ? {
                ...e,
                last_maintenance: new Date().toISOString().split('T')[0],
                next_maintenance: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
                status: 'operational',
              }
            : e
        )
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to log maintenance.');
    }
  };

  const needsAttention = equipment.filter(
    (e) => e.status !== 'operational' || (getDaysUntilMaintenance(e.next_maintenance) || 999) <= 7
  );

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderLeftColor: Colors.success }]}>
            <Text style={styles.summaryValue}>
              {equipment.filter((e) => e.status === 'operational').length}
            </Text>
            <Text style={styles.summaryLabel}>Operational</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: Colors.warning }]}>
            <Text style={styles.summaryValue}>
              {equipment.filter((e) => e.status === 'needs_maintenance').length}
            </Text>
            <Text style={styles.summaryLabel}>Needs Service</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: Colors.error }]}>
            <Text style={styles.summaryValue}>
              {equipment.filter((e) => e.status === 'out_of_service').length}
            </Text>
            <Text style={styles.summaryLabel}>Out of Service</Text>
          </View>
        </View>

        {/* Needs Attention Section */}
        {needsAttention.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="warning" size={20} color={Colors.warning} />
              <Text style={styles.sectionTitle}>Needs Attention</Text>
            </View>
            {needsAttention.map((item) => {
              const daysUntil = getDaysUntilMaintenance(item.next_maintenance);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.equipmentCard, styles.equipmentCardWarning]}
                  onPress={() => {
                    setSelectedEquipment(item);
                    setShowLogModal(true);
                  }}
                >
                  <View style={[styles.equipmentIcon, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <Ionicons name={getTypeIcon(item.type)} size={24} color={getStatusColor(item.status)} />
                  </View>
                  <View style={styles.equipmentInfo}>
                    <Text style={styles.equipmentName}>{item.name}</Text>
                    <Text style={styles.equipmentStatus}>
                      {item.status === 'out_of_service'
                        ? item.notes
                        : daysUntil !== null && daysUntil <= 7
                        ? `Maintenance due in ${daysUntil} days`
                        : getStatusText(item.status)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* All Equipment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Equipment</Text>
          {equipment.map((item) => {
            const daysUntil = getDaysUntilMaintenance(item.next_maintenance);
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.equipmentCard}
                onPress={() => {
                  setSelectedEquipment(item);
                  setShowLogModal(true);
                }}
              >
                <View style={[styles.equipmentIcon, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                  <Ionicons name={getTypeIcon(item.type)} size={24} color={getStatusColor(item.status)} />
                </View>
                <View style={styles.equipmentInfo}>
                  <Text style={styles.equipmentName}>{item.name}</Text>
                  <Text style={styles.equipmentSerial}>{item.serial_number}</Text>
                  <View style={styles.maintenanceInfo}>
                    <Text style={styles.maintenanceLabel}>Last: </Text>
                    <Text style={styles.maintenanceDate}>
                      {item.last_maintenance ? format(new Date(item.last_maintenance), 'MMM d, yyyy') : 'Never'}
                    </Text>
                    {daysUntil !== null && (
                      <>
                        <Text style={styles.maintenanceLabel}> | Next in </Text>
                        <Text
                          style={[
                            styles.maintenanceDate,
                            daysUntil <= 7 && { color: Colors.warning },
                            daysUntil <= 0 && { color: Colors.error },
                          ]}
                        >
                          {daysUntil <= 0 ? 'Overdue!' : `${daysUntil} days`}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Log Maintenance Modal */}
      <Modal visible={showLogModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Maintenance</Text>
              <TouchableOpacity onPress={() => setShowLogModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {selectedEquipment && (
              <>
                <Text style={styles.modalEquipmentName}>{selectedEquipment.name}</Text>

                <Text style={styles.inputLabel}>Type</Text>
                <View style={styles.typeRow}>
                  {(['routine', 'repair', 'inspection', 'cleaning'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.typeButton, logType === type && styles.typeButtonActive]}
                      onPress={() => setLogType(type)}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          logType === type && styles.typeButtonTextActive,
                        ]}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={styles.descriptionInput}
                  value={logDescription}
                  onChangeText={setLogDescription}
                  placeholder="Describe the maintenance performed..."
                  multiline
                  numberOfLines={4}
                />

                <TouchableOpacity style={styles.submitButton} onPress={handleLogMaintenance}>
                  <Ionicons name="checkmark" size={24} color={Colors.textOnPrimary} />
                  <Text style={styles.submitButtonText}>Log Maintenance</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  summaryRow: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderLeftWidth: 4,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  summaryLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  section: {
    padding: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  equipmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  equipmentCardWarning: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  equipmentIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  equipmentInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  equipmentName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  equipmentSerial: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  equipmentStatus: {
    fontSize: FontSizes.sm,
    color: Colors.warning,
    marginTop: 2,
  },
  maintenanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  maintenanceLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  maintenanceDate: {
    fontSize: FontSizes.xs,
    color: Colors.text,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  modalEquipmentName: {
    fontSize: FontSizes.lg,
    color: Colors.primary,
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  typeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  typeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  typeButtonTextActive: {
    color: Colors.textOnPrimary,
  },
  descriptionInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: Spacing.lg,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  submitButtonText: {
    color: Colors.textOnPrimary,
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
});
