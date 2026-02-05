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
import { format } from 'date-fns';

interface Employee {
  id: string;
  name: string;
  role: string;
  hours: number;
  tipShare: number;
}

export default function TipCalculatorScreen() {
  const { currentLocation } = useStore();
  const [totalTips, setTotalTips] = useState('');
  const [distributionMethod, setDistributionMethod] = useState<'hours' | 'equal' | 'points'>('hours');
  const [employees, setEmployees] = useState<Employee[]>([
    { id: '1', name: 'Sarah M.', role: 'Server', hours: 8, tipShare: 0 },
    { id: '2', name: 'Mike T.', role: 'Server', hours: 6, tipShare: 0 },
    { id: '3', name: 'Jennifer L.', role: 'Cashier', hours: 8, tipShare: 0 },
    { id: '4', name: 'David R.', role: 'Server', hours: 4, tipShare: 0 },
    { id: '5', name: 'Emily K.', role: 'Busser', hours: 6, tipShare: 0 },
  ]);
  const [customPoints, setCustomPoints] = useState<Record<string, number>>({});

  const ROLE_POINTS: Record<string, number> = {
    Server: 1.0,
    Cashier: 0.8,
    Busser: 0.5,
    Host: 0.6,
  };

  useEffect(() => {
    calculateDistribution();
  }, [totalTips, distributionMethod, employees, customPoints]);

  const calculateDistribution = () => {
    const tips = parseFloat(totalTips) || 0;
    if (tips === 0) {
      setEmployees((prev) => prev.map((e) => ({ ...e, tipShare: 0 })));
      return;
    }

    let updatedEmployees: Employee[];

    switch (distributionMethod) {
      case 'hours':
        const totalHours = employees.reduce((sum, e) => sum + e.hours, 0);
        updatedEmployees = employees.map((e) => ({
          ...e,
          tipShare: totalHours > 0 ? (e.hours / totalHours) * tips : 0,
        }));
        break;

      case 'equal':
        const perPerson = tips / employees.length;
        updatedEmployees = employees.map((e) => ({
          ...e,
          tipShare: perPerson,
        }));
        break;

      case 'points':
        const totalPoints = employees.reduce((sum, e) => {
          const rolePoints = ROLE_POINTS[e.role] || 1;
          const custom = customPoints[e.id] || 0;
          return sum + (e.hours * rolePoints) + custom;
        }, 0);
        updatedEmployees = employees.map((e) => {
          const rolePoints = ROLE_POINTS[e.role] || 1;
          const custom = customPoints[e.id] || 0;
          const employeePoints = (e.hours * rolePoints) + custom;
          return {
            ...e,
            tipShare: totalPoints > 0 ? (employeePoints / totalPoints) * tips : 0,
          };
        });
        break;

      default:
        updatedEmployees = employees;
    }

    setEmployees(updatedEmployees);
  };

  const updateEmployeeHours = (id: string, hours: string) => {
    const hoursNum = parseFloat(hours) || 0;
    setEmployees((prev) =>
      prev.map((e) => (e.id === id ? { ...e, hours: hoursNum } : e))
    );
  };

  const handleSave = () => {
    if (!totalTips || parseFloat(totalTips) <= 0) {
      Alert.alert('Error', 'Please enter the total tips amount.');
      return;
    }

    Alert.alert(
      'Save Distribution',
      `Save tip distribution of $${parseFloat(totalTips).toFixed(2)} for ${employees.length} employees?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: () => {
            Alert.alert('Success', 'Tip distribution saved!');
          },
        },
      ]
    );
  };

  const totalDistributed = employees.reduce((sum, e) => sum + e.tipShare, 0);
  const totalHours = employees.reduce((sum, e) => sum + e.hours, 0);

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Total Tips Input */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Tips to Distribute</Text>
          <View style={styles.totalInputRow}>
            <Text style={styles.dollarSign}>$</Text>
            <TextInput
              style={styles.totalInput}
              value={totalTips}
              onChangeText={setTotalTips}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor={Colors.textLight}
            />
          </View>
        </View>

        {/* Distribution Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Distribution Method</Text>
          <View style={styles.methodRow}>
            {[
              { id: 'hours', label: 'By Hours', icon: 'time' },
              { id: 'equal', label: 'Equal', icon: 'git-compare' },
              { id: 'points', label: 'Points', icon: 'star' },
            ].map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[styles.methodButton, distributionMethod === method.id && styles.methodButtonActive]}
                onPress={() => setDistributionMethod(method.id as any)}
              >
                <Ionicons
                  name={method.icon as any}
                  size={20}
                  color={distributionMethod === method.id ? Colors.textOnPrimary : Colors.text}
                />
                <Text style={[styles.methodText, distributionMethod === method.id && styles.methodTextActive]}>
                  {method.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Employees</Text>
            <Text style={styles.summaryValue}>{employees.length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Hours</Text>
            <Text style={styles.summaryValue}>{totalHours}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>$/Hour</Text>
            <Text style={styles.summaryValue}>
              ${totalHours > 0 ? (totalDistributed / totalHours).toFixed(2) : '0.00'}
            </Text>
          </View>
        </View>

        {/* Employee List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Team Distribution</Text>
          {employees.map((employee) => (
            <View key={employee.id} style={styles.employeeCard}>
              <View style={styles.employeeInfo}>
                <View style={styles.employeeAvatar}>
                  <Text style={styles.employeeAvatarText}>
                    {employee.name.split(' ').map((n) => n[0]).join('')}
                  </Text>
                </View>
                <View>
                  <Text style={styles.employeeName}>{employee.name}</Text>
                  <Text style={styles.employeeRole}>{employee.role}</Text>
                </View>
              </View>

              <View style={styles.employeeInputs}>
                <View style={styles.hoursInput}>
                  <TextInput
                    style={styles.hoursValue}
                    value={employee.hours.toString()}
                    onChangeText={(v) => updateEmployeeHours(employee.id, v)}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.hoursLabel}>hrs</Text>
                </View>
              </View>

              <View style={styles.employeeTip}>
                <Text style={styles.tipAmount}>${employee.tipShare.toFixed(2)}</Text>
                {totalDistributed > 0 && (
                  <Text style={styles.tipPercent}>
                    {((employee.tipShare / totalDistributed) * 100).toFixed(0)}%
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Distribution Summary */}
        {parseFloat(totalTips) > 0 && (
          <View style={styles.distributionSummary}>
            <View style={styles.distributionRow}>
              <Text style={styles.distributionLabel}>Total Tips</Text>
              <Text style={styles.distributionValue}>${parseFloat(totalTips).toFixed(2)}</Text>
            </View>
            <View style={styles.distributionRow}>
              <Text style={styles.distributionLabel}>Distributed</Text>
              <Text style={[styles.distributionValue, { color: Colors.success }]}>
                ${totalDistributed.toFixed(2)}
              </Text>
            </View>
            {Math.abs(parseFloat(totalTips) - totalDistributed) > 0.01 && (
              <View style={styles.distributionRow}>
                <Text style={styles.distributionLabel}>Difference</Text>
                <Text style={[styles.distributionValue, { color: Colors.warning }]}>
                  ${(parseFloat(totalTips) - totalDistributed).toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Ionicons name="checkmark-circle" size={24} color={Colors.textOnPrimary} />
        <Text style={styles.saveButtonText}>Save Distribution</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  totalCard: { backgroundColor: Colors.primary, margin: Spacing.md, padding: Spacing.lg, borderRadius: BorderRadius.lg, alignItems: 'center' },
  totalLabel: { fontSize: FontSizes.md, color: Colors.textOnPrimary + 'CC' },
  totalInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm },
  dollarSign: { fontSize: 36, color: Colors.textOnPrimary, marginRight: Spacing.xs },
  totalInput: { fontSize: 48, fontWeight: 'bold', color: Colors.textOnPrimary, minWidth: 150, textAlign: 'center' },
  section: { padding: Spacing.md },
  sectionTitle: { fontSize: FontSizes.lg, fontWeight: '600', color: Colors.text, marginBottom: Spacing.md },
  methodRow: { flexDirection: 'row', gap: Spacing.sm },
  methodButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.md, backgroundColor: Colors.background, borderRadius: BorderRadius.lg, gap: Spacing.xs },
  methodButtonActive: { backgroundColor: Colors.primary },
  methodText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.text },
  methodTextActive: { color: Colors.textOnPrimary },
  summaryRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm },
  summaryItem: { flex: 1, backgroundColor: Colors.background, padding: Spacing.md, borderRadius: BorderRadius.lg, alignItems: 'center' },
  summaryLabel: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  summaryValue: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.text },
  employeeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, padding: Spacing.md, borderRadius: BorderRadius.lg, marginBottom: Spacing.sm },
  employeeInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  employeeAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  employeeAvatarText: { color: Colors.textOnPrimary, fontWeight: '600', fontSize: FontSizes.sm },
  employeeName: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  employeeRole: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  employeeInputs: { marginHorizontal: Spacing.md },
  hoursInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: Spacing.sm, borderRadius: BorderRadius.md },
  hoursValue: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text, width: 40, textAlign: 'center' },
  hoursLabel: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  employeeTip: { alignItems: 'flex-end', minWidth: 70 },
  tipAmount: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.success },
  tipPercent: { fontSize: FontSizes.xs, color: Colors.textSecondary },
  distributionSummary: { backgroundColor: Colors.background, margin: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg },
  distributionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  distributionLabel: { fontSize: FontSizes.md, color: Colors.textSecondary },
  distributionValue: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, margin: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, gap: Spacing.sm },
  saveButtonText: { color: Colors.textOnPrimary, fontSize: FontSizes.lg, fontWeight: '600' },
});
