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
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/Colors';
import { useStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

interface DrawerCount {
  pennies: number;
  nickels: number;
  dimes: number;
  quarters: number;
  ones: number;
  fives: number;
  tens: number;
  twenties: number;
  fifties: number;
  hundreds: number;
}

const DENOMINATIONS = [
  { key: 'hundreds', label: '$100', value: 100 },
  { key: 'fifties', label: '$50', value: 50 },
  { key: 'twenties', label: '$20', value: 20 },
  { key: 'tens', label: '$10', value: 10 },
  { key: 'fives', label: '$5', value: 5 },
  { key: 'ones', label: '$1', value: 1 },
  { key: 'quarters', label: '25¢', value: 0.25 },
  { key: 'dimes', label: '10¢', value: 0.1 },
  { key: 'nickels', label: '5¢', value: 0.05 },
  { key: 'pennies', label: '1¢', value: 0.01 },
];

const DEFAULT_COUNT: DrawerCount = {
  pennies: 0, nickels: 0, dimes: 0, quarters: 0,
  ones: 0, fives: 0, tens: 0, twenties: 0, fifties: 0, hundreds: 0,
};

export default function CashDrawerScreen() {
  const { user, currentLocation } = useStore();
  const [mode, setMode] = useState<'count' | 'history'>('count');
  const [countType, setCountType] = useState<'opening' | 'closing' | 'drop'>('opening');
  const [counts, setCounts] = useState<DrawerCount>(DEFAULT_COUNT);
  const [expectedAmount, setExpectedAmount] = useState('200');
  const [history, setHistory] = useState<any[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('cash_counts')
      .select('*')
      .eq('location_id', currentLocation?.id)
      .order('counted_at', { ascending: false })
      .limit(20);

    if (data) setHistory(data);
  };

  const calculateTotal = () => {
    return DENOMINATIONS.reduce((total, denom) => {
      return total + (counts[denom.key as keyof DrawerCount] * denom.value);
    }, 0);
  };

  const getVariance = () => {
    const total = calculateTotal();
    const expected = parseFloat(expectedAmount) || 0;
    return total - expected;
  };

  const handleCountChange = (key: keyof DrawerCount, value: string) => {
    const numValue = parseInt(value) || 0;
    setCounts((prev) => ({ ...prev, [key]: numValue }));
  };

  const handleSubmit = async () => {
    const total = calculateTotal();
    const variance = getVariance();

    try {
      const { error } = await supabase.from('cash_counts').insert({
        location_id: currentLocation?.id,
        type: countType,
        total_amount: total,
        expected_amount: parseFloat(expectedAmount) || 0,
        variance,
        denomination_breakdown: counts,
        counted_by: user?.id,
        counted_at: new Date().toISOString(),
        notes: notes || null,
      });

      if (error) throw error;

      const varianceMsg = variance === 0
        ? 'Drawer is balanced!'
        : variance > 0
          ? `Drawer is OVER by $${variance.toFixed(2)}`
          : `Drawer is SHORT by $${Math.abs(variance).toFixed(2)}`;

      Alert.alert('Count Submitted', varianceMsg);
      setCounts(DEFAULT_COUNT);
      setNotes('');
      fetchHistory();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit count.');
    }
  };

  const total = calculateTotal();
  const variance = getVariance();

  return (
    <View style={styles.container}>
      {/* Mode Tabs */}
      <View style={styles.modeTabs}>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'count' && styles.modeTabActive]}
          onPress={() => setMode('count')}
        >
          <Ionicons name="calculator" size={20} color={mode === 'count' ? Colors.textOnPrimary : Colors.text} />
          <Text style={[styles.modeTabText, mode === 'count' && styles.modeTabTextActive]}>Count</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'history' && styles.modeTabActive]}
          onPress={() => setMode('history')}
        >
          <Ionicons name="time" size={20} color={mode === 'history' ? Colors.textOnPrimary : Colors.text} />
          <Text style={[styles.modeTabText, mode === 'history' && styles.modeTabTextActive]}>History</Text>
        </TouchableOpacity>
      </View>

      {mode === 'count' ? (
        <ScrollView style={styles.content}>
          {/* Count Type */}
          <View style={styles.typeRow}>
            {(['opening', 'closing', 'drop'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeButton, countType === t && styles.typeButtonActive]}
                onPress={() => setCountType(t)}
              >
                <Text style={[styles.typeButtonText, countType === t && styles.typeButtonTextActive]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Expected Amount */}
          <View style={styles.expectedRow}>
            <Text style={styles.expectedLabel}>Expected Amount</Text>
            <View style={styles.expectedInput}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.expectedValue}
                value={expectedAmount}
                onChangeText={setExpectedAmount}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Denomination Grid */}
          <View style={styles.denominationGrid}>
            {DENOMINATIONS.map((denom) => (
              <View key={denom.key} style={styles.denominationItem}>
                <Text style={styles.denomLabel}>{denom.label}</Text>
                <TextInput
                  style={styles.denomInput}
                  value={counts[denom.key as keyof DrawerCount].toString()}
                  onChangeText={(v) => handleCountChange(denom.key as keyof DrawerCount, v)}
                  keyboardType="number-pad"
                  selectTextOnFocus
                />
                <Text style={styles.denomTotal}>
                  ${(counts[denom.key as keyof DrawerCount] * denom.value).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>

          {/* Notes */}
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes (optional)"
            multiline
          />

          {/* Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Counted</Text>
              <Text style={styles.summaryValue}>${total.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Expected</Text>
              <Text style={styles.summaryValue}>${(parseFloat(expectedAmount) || 0).toFixed(2)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.varianceRow]}>
              <Text style={styles.summaryLabel}>Variance</Text>
              <Text style={[
                styles.varianceValue,
                { color: variance === 0 ? Colors.success : variance > 0 ? Colors.warning : Colors.error }
              ]}>
                {variance >= 0 ? '+' : ''}{variance.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Submit Count</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView style={styles.content}>
          {history.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={64} color={Colors.textLight} />
              <Text style={styles.emptyText}>No counts recorded</Text>
            </View>
          ) : (
            history.map((record) => (
              <View key={record.id} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <View style={[styles.typeBadge, {
                    backgroundColor: record.type === 'opening' ? Colors.success + '20' :
                      record.type === 'closing' ? Colors.info + '20' : Colors.warning + '20'
                  }]}>
                    <Text style={[styles.typeBadgeText, {
                      color: record.type === 'opening' ? Colors.success :
                        record.type === 'closing' ? Colors.info : Colors.warning
                    }]}>
                      {record.type.charAt(0).toUpperCase() + record.type.slice(1)}
                    </Text>
                  </View>
                  <Text style={styles.historyDate}>
                    {format(new Date(record.counted_at), 'MMM d, h:mm a')}
                  </Text>
                </View>
                <View style={styles.historyDetails}>
                  <View style={styles.historyAmount}>
                    <Text style={styles.historyAmountLabel}>Counted</Text>
                    <Text style={styles.historyAmountValue}>${record.total_amount.toFixed(2)}</Text>
                  </View>
                  <View style={styles.historyAmount}>
                    <Text style={styles.historyAmountLabel}>Expected</Text>
                    <Text style={styles.historyAmountValue}>${record.expected_amount.toFixed(2)}</Text>
                  </View>
                  <View style={styles.historyAmount}>
                    <Text style={styles.historyAmountLabel}>Variance</Text>
                    <Text style={[styles.historyVariance, {
                      color: record.variance === 0 ? Colors.success : record.variance > 0 ? Colors.warning : Colors.error
                    }]}>
                      {record.variance >= 0 ? '+' : ''}${record.variance.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  modeTabs: { flexDirection: 'row', padding: Spacing.md, gap: Spacing.sm, backgroundColor: Colors.background },
  modeTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.md, borderRadius: BorderRadius.lg, backgroundColor: Colors.surface, gap: Spacing.sm },
  modeTabActive: { backgroundColor: Colors.primary },
  modeTabText: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  modeTabTextActive: { color: Colors.textOnPrimary },
  content: { flex: 1, padding: Spacing.md },
  typeRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  typeButton: { flex: 1, padding: Spacing.sm, backgroundColor: Colors.background, borderRadius: BorderRadius.md, alignItems: 'center' },
  typeButtonActive: { backgroundColor: Colors.primary },
  typeButtonText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.text },
  typeButtonTextActive: { color: Colors.textOnPrimary },
  expectedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.background, padding: Spacing.md, borderRadius: BorderRadius.lg, marginBottom: Spacing.lg },
  expectedLabel: { fontSize: FontSizes.md, color: Colors.text },
  expectedInput: { flexDirection: 'row', alignItems: 'center' },
  dollarSign: { fontSize: FontSizes.xl, color: Colors.textSecondary },
  expectedValue: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text, minWidth: 100, textAlign: 'right' },
  denominationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  denominationItem: { width: '48%', backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center' },
  denomLabel: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm },
  denomInput: { fontSize: FontSizes.xxl, fontWeight: 'bold', color: Colors.primary, textAlign: 'center', width: '100%', padding: Spacing.sm, backgroundColor: Colors.surface, borderRadius: BorderRadius.md },
  denomTotal: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginTop: Spacing.sm },
  notesInput: { backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.md, fontSize: FontSizes.md, color: Colors.text, marginTop: Spacing.lg, minHeight: 60 },
  summaryCard: { backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginTop: Spacing.lg },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  summaryLabel: { fontSize: FontSizes.md, color: Colors.textSecondary },
  summaryValue: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  varianceRow: { marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  varianceValue: { fontSize: FontSizes.xl, fontWeight: 'bold' },
  submitButton: { backgroundColor: Colors.primary, padding: Spacing.md, borderRadius: BorderRadius.lg, alignItems: 'center', marginTop: Spacing.lg, marginBottom: Spacing.xl },
  submitButtonText: { color: Colors.textOnPrimary, fontSize: FontSizes.lg, fontWeight: '600' },
  emptyState: { alignItems: 'center', padding: Spacing.xxl },
  emptyText: { color: Colors.textSecondary, marginTop: Spacing.md },
  historyCard: { backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  typeBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  typeBadgeText: { fontSize: FontSizes.xs, fontWeight: '600' },
  historyDate: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  historyDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  historyAmount: { alignItems: 'center' },
  historyAmountLabel: { fontSize: FontSizes.xs, color: Colors.textSecondary },
  historyAmountValue: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  historyVariance: { fontSize: FontSizes.md, fontWeight: 'bold' },
});
