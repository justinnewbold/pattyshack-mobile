import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/Colors';
import { useStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

interface WasteEntry {
  id: string;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  reason: 'expired' | 'damaged' | 'overproduction' | 'customer_return' | 'quality' | 'other';
  estimated_cost: number;
  logged_by: string;
  logged_at: string;
  notes?: string;
}

const WASTE_CATEGORIES = [
  { id: 'proteins', name: 'Proteins', icon: 'nutrition' },
  { id: 'produce', name: 'Produce', icon: 'leaf' },
  { id: 'dairy', name: 'Dairy', icon: 'water' },
  { id: 'buns_bread', name: 'Buns & Bread', icon: 'pizza' },
  { id: 'prepared', name: 'Prepared Items', icon: 'restaurant' },
  { id: 'beverages', name: 'Beverages', icon: 'cafe' },
];

const WASTE_REASONS = [
  { id: 'expired', label: 'Expired', color: Colors.error },
  { id: 'damaged', label: 'Damaged', color: Colors.warning },
  { id: 'overproduction', label: 'Overproduction', color: Colors.info },
  { id: 'customer_return', label: 'Customer Return', color: '#9333ea' },
  { id: 'quality', label: 'Quality Issue', color: '#ec4899' },
  { id: 'other', label: 'Other', color: Colors.textSecondary },
];

export default function FoodWasteScreen() {
  const { user, currentLocation } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [todayWaste, setTodayWaste] = useState<WasteEntry[]>([]);
  const [weeklyStats, setWeeklyStats] = useState({ total: 0, cost: 0, topReason: '' });

  // Form state
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('lbs');
  const [reason, setReason] = useState<WasteEntry['reason']>('expired');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchTodayWaste();
    fetchWeeklyStats();
  }, []);

  const fetchTodayWaste = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('food_waste')
      .select('*')
      .eq('location_id', currentLocation?.id)
      .gte('logged_at', `${today}T00:00:00`)
      .order('logged_at', { ascending: false });

    if (data) setTodayWaste(data);
  };

  const fetchWeeklyStats = async () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data } = await supabase
      .from('food_waste')
      .select('*')
      .eq('location_id', currentLocation?.id)
      .gte('logged_at', weekAgo.toISOString());

    if (data && data.length > 0) {
      const total = data.length;
      const cost = data.reduce((sum, item) => sum + (item.estimated_cost || 0), 0);
      const reasonCounts = data.reduce((acc, item) => {
        acc[item.reason] = (acc[item.reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const topReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

      setWeeklyStats({ total, cost, topReason });
    }
  };

  const handleSubmit = async () => {
    if (!itemName || !category || !quantity) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    try {
      const { error } = await supabase.from('food_waste').insert({
        location_id: currentLocation?.id,
        item_name: itemName,
        category,
        quantity: parseFloat(quantity),
        unit,
        reason,
        estimated_cost: parseFloat(cost) || 0,
        logged_by: user?.id,
        logged_at: new Date().toISOString(),
        notes: notes || null,
      });

      if (error) throw error;

      Alert.alert('Success', 'Waste entry logged successfully.');
      resetForm();
      setShowAddModal(false);
      fetchTodayWaste();
      fetchWeeklyStats();
    } catch (error) {
      Alert.alert('Error', 'Failed to log waste entry.');
    }
  };

  const resetForm = () => {
    setItemName('');
    setCategory('');
    setQuantity('');
    setUnit('lbs');
    setReason('expired');
    setCost('');
    setNotes('');
  };

  const todayCost = todayWaste.reduce((sum, item) => sum + (item.estimated_cost || 0), 0);

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderLeftColor: Colors.error }]}>
            <Text style={styles.summaryValue}>${todayCost.toFixed(2)}</Text>
            <Text style={styles.summaryLabel}>Today's Waste</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: Colors.warning }]}>
            <Text style={styles.summaryValue}>${weeklyStats.cost.toFixed(2)}</Text>
            <Text style={styles.summaryLabel}>This Week</Text>
          </View>
        </View>

        {/* Top Reason Alert */}
        {weeklyStats.topReason && (
          <View style={styles.alertCard}>
            <Ionicons name="alert-circle" size={24} color={Colors.warning} />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Top Waste Reason This Week</Text>
              <Text style={styles.alertText}>
                {WASTE_REASONS.find((r) => r.id === weeklyStats.topReason)?.label || weeklyStats.topReason}
              </Text>
            </View>
          </View>
        )}

        {/* Today's Entries */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Entries ({todayWaste.length})</Text>
          {todayWaste.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="trash-outline" size={48} color={Colors.textLight} />
              <Text style={styles.emptyText}>No waste logged today</Text>
            </View>
          ) : (
            todayWaste.map((entry) => (
              <View key={entry.id} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryName}>{entry.item_name}</Text>
                  <Text style={styles.entryCost}>${entry.estimated_cost?.toFixed(2)}</Text>
                </View>
                <View style={styles.entryDetails}>
                  <View style={[styles.reasonBadge, { backgroundColor: WASTE_REASONS.find((r) => r.id === entry.reason)?.color + '20' }]}>
                    <Text style={[styles.reasonText, { color: WASTE_REASONS.find((r) => r.id === entry.reason)?.color }]}>
                      {WASTE_REASONS.find((r) => r.id === entry.reason)?.label}
                    </Text>
                  </View>
                  <Text style={styles.entryQuantity}>
                    {entry.quantity} {entry.unit}
                  </Text>
                  <Text style={styles.entryTime}>
                    {format(new Date(entry.logged_at), 'h:mm a')}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Button */}
      <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
        <Ionicons name="add" size={32} color={Colors.textOnPrimary} />
      </TouchableOpacity>

      {/* Add Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Food Waste</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Item Name *</Text>
              <TextInput
                style={styles.input}
                value={itemName}
                onChangeText={setItemName}
                placeholder="e.g., Ground Beef Patties"
              />

              <Text style={styles.inputLabel}>Category *</Text>
              <View style={styles.categoryGrid}>
                {WASTE_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryButton, category === cat.id && styles.categoryButtonActive]}
                    onPress={() => setCategory(cat.id)}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={20}
                      color={category === cat.id ? Colors.textOnPrimary : Colors.text}
                    />
                    <Text style={[styles.categoryText, category === cat.id && styles.categoryTextActive]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Quantity *</Text>
                  <TextInput
                    style={styles.input}
                    value={quantity}
                    onChangeText={setQuantity}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Unit</Text>
                  <View style={styles.unitRow}>
                    {['lbs', 'oz', 'each', 'cases'].map((u) => (
                      <TouchableOpacity
                        key={u}
                        style={[styles.unitButton, unit === u && styles.unitButtonActive]}
                        onPress={() => setUnit(u)}
                      >
                        <Text style={[styles.unitText, unit === u && styles.unitTextActive]}>{u}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <Text style={styles.inputLabel}>Reason *</Text>
              <View style={styles.reasonGrid}>
                {WASTE_REASONS.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.reasonButton, reason === r.id && { backgroundColor: r.color }]}
                    onPress={() => setReason(r.id as WasteEntry['reason'])}
                  >
                    <Text style={[styles.reasonButtonText, reason === r.id && styles.reasonButtonTextActive]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Estimated Cost ($)</Text>
              <TextInput
                style={styles.input}
                value={cost}
                onChangeText={setCost}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />

              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Additional details..."
                multiline
              />

              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>Log Waste</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  summaryRow: { flexDirection: 'row', padding: Spacing.md, gap: Spacing.sm },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderLeftWidth: 4,
  },
  summaryValue: { fontSize: FontSizes.xxl, fontWeight: 'bold', color: Colors.text },
  summaryLabel: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginTop: Spacing.xs },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '15',
    margin: Spacing.md,
    marginTop: 0,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  alertContent: { marginLeft: Spacing.md, flex: 1 },
  alertTitle: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.text },
  alertText: { fontSize: FontSizes.md, color: Colors.warning, fontWeight: '600' },
  section: { padding: Spacing.md },
  sectionTitle: { fontSize: FontSizes.lg, fontWeight: '600', color: Colors.text, marginBottom: Spacing.md },
  emptyState: { alignItems: 'center', padding: Spacing.xl, backgroundColor: Colors.background, borderRadius: BorderRadius.lg },
  emptyText: { color: Colors.textSecondary, marginTop: Spacing.sm },
  entryCard: { backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entryName: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  entryCost: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.error },
  entryDetails: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm, gap: Spacing.sm },
  reasonBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  reasonText: { fontSize: FontSizes.xs, fontWeight: '600' },
  entryQuantity: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  entryTime: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginLeft: 'auto' },
  addButton: {
    position: 'absolute',
    bottom: Spacing.lg,
    right: Spacing.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.background, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  inputLabel: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm, marginTop: Spacing.md },
  input: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: FontSizes.md, color: Colors.text },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  categoryButton: { width: '31%', padding: Spacing.sm, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, alignItems: 'center' },
  categoryButtonActive: { backgroundColor: Colors.primary },
  categoryText: { fontSize: FontSizes.xs, color: Colors.text, marginTop: 4 },
  categoryTextActive: { color: Colors.textOnPrimary },
  row: { flexDirection: 'row', gap: Spacing.md },
  halfInput: { flex: 1 },
  unitRow: { flexDirection: 'row', gap: Spacing.xs },
  unitButton: { flex: 1, padding: Spacing.sm, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, alignItems: 'center' },
  unitButtonActive: { backgroundColor: Colors.primary },
  unitText: { fontSize: FontSizes.sm, color: Colors.text },
  unitTextActive: { color: Colors.textOnPrimary },
  reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  reasonButton: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.md },
  reasonButtonText: { fontSize: FontSizes.sm, color: Colors.text },
  reasonButtonTextActive: { color: Colors.textOnPrimary },
  submitButton: { backgroundColor: Colors.primary, padding: Spacing.md, borderRadius: BorderRadius.lg, alignItems: 'center', marginTop: Spacing.lg, marginBottom: Spacing.xl },
  submitButtonText: { color: Colors.textOnPrimary, fontSize: FontSizes.lg, fontWeight: '600' },
});
