import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/Colors';
import { useStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

interface Deposit {
  id: string;
  amount: number;
  deposit_date: string;
  bank_name: string;
  receipt_photo?: string;
  confirmation_number?: string;
  deposited_by: string;
  status: 'pending' | 'verified' | 'discrepancy';
  notes?: string;
  created_at: string;
}

export default function DepositsScreen() {
  const { user, currentLocation } = useStore();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [receiptPhoto, setReceiptPhoto] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchDeposits();
  }, []);

  const fetchDeposits = async () => {
    const { data } = await supabase
      .from('deposits')
      .select('*')
      .eq('location_id', currentLocation?.id)
      .order('deposit_date', { ascending: false })
      .limit(30);

    if (data) setDeposits(data);
  };

  const handleTakePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) setReceiptPhoto(result.assets[0].uri);
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!result.canceled) setReceiptPhoto(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!amount || !bankName) {
      Alert.alert('Missing Information', 'Please enter the amount and bank name.');
      return;
    }

    try {
      const { error } = await supabase.from('deposits').insert({
        location_id: currentLocation?.id,
        amount: parseFloat(amount),
        deposit_date: new Date().toISOString().split('T')[0],
        bank_name: bankName,
        receipt_photo: receiptPhoto,
        confirmation_number: confirmationNumber || null,
        deposited_by: user?.id,
        status: 'pending',
        notes: notes || null,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      Alert.alert('Success', 'Deposit recorded successfully.');
      resetForm();
      fetchDeposits();
    } catch (error) {
      Alert.alert('Error', 'Failed to record deposit.');
    }
  };

  const resetForm = () => {
    setAmount('');
    setBankName('');
    setConfirmationNumber('');
    setReceiptPhoto(null);
    setNotes('');
    setShowForm(false);
  };

  const weekTotal = deposits
    .filter((d) => {
      const depositDate = new Date(d.deposit_date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return depositDate >= weekAgo;
    })
    .reduce((sum, d) => sum + d.amount, 0);

  const getStatusColor = (status: Deposit['status']) => {
    switch (status) {
      case 'verified': return Colors.success;
      case 'discrepancy': return Colors.error;
      default: return Colors.warning;
    }
  };

  return (
    <View style={styles.container}>
      {/* Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>This Week</Text>
          <Text style={styles.summaryValue}>${weekTotal.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Pending</Text>
          <Text style={[styles.summaryValue, { color: Colors.warning }]}>
            {deposits.filter((d) => d.status === 'pending').length}
          </Text>
        </View>
      </View>

      {showForm ? (
        <ScrollView style={styles.formContainer}>
          <Text style={styles.inputLabel}>Amount *</Text>
          <View style={styles.amountInput}>
            <Text style={styles.dollarSign}>$</Text>
            <TextInput
              style={styles.amountValue}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
          </View>

          <Text style={styles.inputLabel}>Bank Name *</Text>
          <TextInput
            style={styles.input}
            value={bankName}
            onChangeText={setBankName}
            placeholder="e.g., Chase, Wells Fargo"
          />

          <Text style={styles.inputLabel}>Confirmation Number</Text>
          <TextInput
            style={styles.input}
            value={confirmationNumber}
            onChangeText={setConfirmationNumber}
            placeholder="Bank receipt number"
          />

          <Text style={styles.inputLabel}>Receipt Photo</Text>
          <View style={styles.photoSection}>
            {receiptPhoto ? (
              <View style={styles.photoPreview}>
                <Image source={{ uri: receiptPhoto }} style={styles.receiptImage} />
                <TouchableOpacity style={styles.removePhoto} onPress={() => setReceiptPhoto(null)}>
                  <Ionicons name="close-circle" size={28} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoButtons}>
                <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
                  <Ionicons name="camera" size={24} color={Colors.primary} />
                  <Text style={styles.photoButtonText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoButton} onPress={handlePickImage}>
                  <Ionicons name="images" size={24} color={Colors.primary} />
                  <Text style={styles.photoButtonText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <Text style={styles.inputLabel}>Notes</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Additional notes..."
            multiline
          />

          <View style={styles.formButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>Record Deposit</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <>
          <ScrollView style={styles.list}>
            {deposits.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="wallet-outline" size={64} color={Colors.textLight} />
                <Text style={styles.emptyText}>No deposits recorded</Text>
              </View>
            ) : (
              deposits.map((deposit) => (
                <View key={deposit.id} style={styles.depositCard}>
                  <View style={styles.depositHeader}>
                    <Text style={styles.depositAmount}>${deposit.amount.toFixed(2)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(deposit.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(deposit.status) }]}>
                        {deposit.status.charAt(0).toUpperCase() + deposit.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.depositDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="business" size={16} color={Colors.textSecondary} />
                      <Text style={styles.detailText}>{deposit.bank_name}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar" size={16} color={Colors.textSecondary} />
                      <Text style={styles.detailText}>
                        {format(new Date(deposit.deposit_date), 'MMM d, yyyy')}
                      </Text>
                    </View>
                    {deposit.confirmation_number && (
                      <View style={styles.detailRow}>
                        <Ionicons name="document-text" size={16} color={Colors.textSecondary} />
                        <Text style={styles.detailText}>#{deposit.confirmation_number}</Text>
                      </View>
                    )}
                  </View>
                  {deposit.receipt_photo && (
                    <View style={styles.receiptIndicator}>
                      <Ionicons name="image" size={16} color={Colors.primary} />
                      <Text style={styles.receiptIndicatorText}>Receipt attached</Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </ScrollView>

          <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(true)}>
            <Ionicons name="add" size={28} color={Colors.textOnPrimary} />
            <Text style={styles.addButtonText}>Record Deposit</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  summaryCard: { flexDirection: 'row', backgroundColor: Colors.background, margin: Spacing.md, padding: Spacing.lg, borderRadius: BorderRadius.lg },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  summaryValue: { fontSize: FontSizes.xxl, fontWeight: 'bold', color: Colors.text, marginTop: Spacing.xs },
  summaryDivider: { width: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.lg },
  list: { flex: 1, padding: Spacing.md },
  depositCard: { backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md },
  depositHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  depositAmount: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  statusText: { fontSize: FontSizes.xs, fontWeight: '600' },
  depositDetails: { gap: Spacing.xs },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  detailText: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  receiptIndicator: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm, gap: Spacing.xs },
  receiptIndicatorText: { fontSize: FontSizes.sm, color: Colors.primary },
  emptyState: { alignItems: 'center', padding: Spacing.xxl },
  emptyText: { color: Colors.textSecondary, marginTop: Spacing.md },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, margin: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, gap: Spacing.sm },
  addButtonText: { color: Colors.textOnPrimary, fontSize: FontSizes.lg, fontWeight: '600' },
  formContainer: { flex: 1, padding: Spacing.md },
  inputLabel: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm, marginTop: Spacing.md },
  input: { backgroundColor: Colors.background, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: FontSizes.md, color: Colors.text },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  amountInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: BorderRadius.md, padding: Spacing.md },
  dollarSign: { fontSize: FontSizes.xxl, color: Colors.textSecondary },
  amountValue: { flex: 1, fontSize: FontSizes.xxl, fontWeight: 'bold', color: Colors.text, marginLeft: Spacing.sm },
  photoSection: { marginTop: Spacing.sm },
  photoButtons: { flexDirection: 'row', gap: Spacing.md },
  photoButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.md, backgroundColor: Colors.background, borderRadius: BorderRadius.md, gap: Spacing.sm },
  photoButtonText: { fontSize: FontSizes.md, color: Colors.primary },
  photoPreview: { position: 'relative' },
  receiptImage: { width: '100%', height: 200, borderRadius: BorderRadius.md },
  removePhoto: { position: 'absolute', top: Spacing.sm, right: Spacing.sm },
  formButtons: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl, marginBottom: Spacing.xxl },
  cancelButton: { flex: 1, padding: Spacing.md, backgroundColor: Colors.background, borderRadius: BorderRadius.lg, alignItems: 'center' },
  cancelButtonText: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  submitButton: { flex: 2, padding: Spacing.md, backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, alignItems: 'center' },
  submitButtonText: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.textOnPrimary },
});
