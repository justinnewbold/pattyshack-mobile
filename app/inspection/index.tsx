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

interface InspectionItem {
  id: string;
  category: string;
  question: string;
  priority: 'critical' | 'major' | 'minor';
  passed: boolean | null;
  notes?: string;
}

const INSPECTION_CATEGORIES = [
  {
    id: 'food_safety',
    name: 'Food Safety',
    icon: 'nutrition',
    items: [
      { id: 'fs1', question: 'All food stored at proper temperatures (41°F or below for cold, 135°F+ for hot)', priority: 'critical' },
      { id: 'fs2', question: 'Raw meats stored below ready-to-eat foods', priority: 'critical' },
      { id: 'fs3', question: 'All food properly labeled and dated', priority: 'major' },
      { id: 'fs4', question: 'No expired products in storage', priority: 'critical' },
      { id: 'fs5', question: 'Proper thawing procedures followed', priority: 'critical' },
      { id: 'fs6', question: 'Food contact surfaces sanitized', priority: 'critical' },
    ],
  },
  {
    id: 'employee_hygiene',
    name: 'Employee Hygiene',
    icon: 'hand-left',
    items: [
      { id: 'eh1', question: 'Employees washing hands properly and frequently', priority: 'critical' },
      { id: 'eh2', question: 'Gloves changed between tasks', priority: 'critical' },
      { id: 'eh3', question: 'Hair restraints worn properly', priority: 'major' },
      { id: 'eh4', question: 'No jewelry on hands/wrists (except plain band)', priority: 'major' },
      { id: 'eh5', question: 'Clean uniforms/aprons worn', priority: 'minor' },
      { id: 'eh6', question: 'No eating/drinking in prep areas', priority: 'major' },
    ],
  },
  {
    id: 'equipment',
    name: 'Equipment & Facilities',
    icon: 'construct',
    items: [
      { id: 'eq1', question: 'All equipment clean and in good repair', priority: 'major' },
      { id: 'eq2', question: 'Thermometers calibrated and functional', priority: 'critical' },
      { id: 'eq3', question: 'Handwashing sinks stocked (soap, towels)', priority: 'critical' },
      { id: 'eq4', question: 'Three-compartment sink properly set up', priority: 'major' },
      { id: 'eq5', question: 'Floors, walls, ceilings clean', priority: 'minor' },
      { id: 'eq6', question: 'Proper ventilation functioning', priority: 'major' },
    ],
  },
  {
    id: 'pest_control',
    name: 'Pest Control',
    icon: 'bug',
    items: [
      { id: 'pc1', question: 'No evidence of pests (droppings, gnaw marks)', priority: 'critical' },
      { id: 'pc2', question: 'Doors and windows properly sealed', priority: 'major' },
      { id: 'pc3', question: 'Garbage properly contained and removed', priority: 'major' },
      { id: 'pc4', question: 'No standing water or food debris', priority: 'major' },
    ],
  },
  {
    id: 'chemicals',
    name: 'Chemical Storage',
    icon: 'flask',
    items: [
      { id: 'ch1', question: 'Chemicals stored away from food', priority: 'critical' },
      { id: 'ch2', question: 'All chemicals properly labeled', priority: 'major' },
      { id: 'ch3', question: 'SDS sheets available', priority: 'major' },
      { id: 'ch4', question: 'Sanitizer at proper concentration', priority: 'critical' },
    ],
  },
];

export default function HealthInspectionPrepScreen() {
  const { user, currentLocation } = useStore();
  const [selectedCategory, setSelectedCategory] = useState(INSPECTION_CATEGORIES[0].id);
  const [responses, setResponses] = useState<Record<string, boolean | null>>({});
  const [showResults, setShowResults] = useState(false);

  const currentCategory = INSPECTION_CATEGORIES.find((c) => c.id === selectedCategory);

  const handleResponse = (itemId: string, passed: boolean) => {
    setResponses((prev) => ({ ...prev, [itemId]: passed }));
  };

  const calculateScore = () => {
    const allItems = INSPECTION_CATEGORIES.flatMap((c) => c.items);
    const answered = allItems.filter((item) => responses[item.id] !== undefined && responses[item.id] !== null);
    const passed = answered.filter((item) => responses[item.id] === true);

    const criticalFails = allItems.filter(
      (item) => item.priority === 'critical' && responses[item.id] === false
    );

    return {
      total: allItems.length,
      answered: answered.length,
      passed: passed.length,
      percentage: answered.length > 0 ? Math.round((passed.length / answered.length) * 100) : 0,
      criticalFails,
    };
  };

  const score = calculateScore();

  const getCategoryProgress = (categoryId: string) => {
    const category = INSPECTION_CATEGORIES.find((c) => c.id === categoryId);
    if (!category) return { answered: 0, total: 0, passed: 0 };

    const answered = category.items.filter((item) => responses[item.id] !== undefined && responses[item.id] !== null).length;
    const passed = category.items.filter((item) => responses[item.id] === true).length;

    return { answered, total: category.items.length, passed };
  };

  const handleComplete = () => {
    if (score.answered < score.total) {
      Alert.alert('Incomplete', `You have ${score.total - score.answered} items remaining. Complete all items before finishing.`);
      return;
    }
    setShowResults(true);
  };

  const getScoreColor = () => {
    if (score.criticalFails.length > 0) return Colors.error;
    if (score.percentage >= 90) return Colors.success;
    if (score.percentage >= 70) return Colors.warning;
    return Colors.error;
  };

  if (showResults) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.resultsCard}>
          <View style={[styles.scoreCircle, { borderColor: getScoreColor() }]}>
            <Text style={[styles.scoreText, { color: getScoreColor() }]}>{score.percentage}%</Text>
          </View>
          <Text style={styles.resultsTitle}>
            {score.criticalFails.length > 0
              ? 'Critical Violations Found'
              : score.percentage >= 90
              ? 'Excellent! Ready for Inspection'
              : score.percentage >= 70
              ? 'Good - Minor Issues to Address'
              : 'Needs Improvement'}
          </Text>
          <Text style={styles.resultsSubtitle}>
            {score.passed} of {score.total} items passed
          </Text>
        </View>

        {score.criticalFails.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Critical Violations</Text>
            {score.criticalFails.map((item) => (
              <View key={item.id} style={styles.failCard}>
                <Ionicons name="alert-circle" size={24} color={Colors.error} />
                <Text style={styles.failText}>{item.question}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category Breakdown</Text>
          {INSPECTION_CATEGORIES.map((cat) => {
            const progress = getCategoryProgress(cat.id);
            return (
              <View key={cat.id} style={styles.categoryResultCard}>
                <Text style={styles.categoryResultName}>{cat.name}</Text>
                <Text style={[
                  styles.categoryResultScore,
                  { color: progress.passed === progress.total ? Colors.success : Colors.warning }
                ]}>
                  {progress.passed}/{progress.total}
                </Text>
              </View>
            );
          })}
        </View>

        <TouchableOpacity style={styles.restartButton} onPress={() => {
          setResponses({});
          setShowResults(false);
        }}>
          <Text style={styles.restartButtonText}>Start New Inspection</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Progress Header */}
      <View style={styles.progressHeader}>
        <Text style={styles.progressText}>
          {score.answered} of {score.total} items checked
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(score.answered / score.total) * 100}%` }]} />
        </View>
      </View>

      {/* Category Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryTabs}>
        {INSPECTION_CATEGORIES.map((cat) => {
          const progress = getCategoryProgress(cat.id);
          const isComplete = progress.answered === progress.total;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryTab, selectedCategory === cat.id && styles.categoryTabActive]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Ionicons
                name={cat.icon as any}
                size={20}
                color={selectedCategory === cat.id ? Colors.textOnPrimary : Colors.text}
              />
              <Text style={[styles.categoryTabText, selectedCategory === cat.id && styles.categoryTabTextActive]}>
                {cat.name}
              </Text>
              {isComplete && (
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} style={styles.checkIcon} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Items */}
      <ScrollView style={styles.itemsList}>
        {currentCategory?.items.map((item, index) => (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <View style={[styles.priorityBadge, {
                backgroundColor: item.priority === 'critical' ? Colors.error + '20' : item.priority === 'major' ? Colors.warning + '20' : Colors.info + '20'
              }]}>
                <Text style={[styles.priorityText, {
                  color: item.priority === 'critical' ? Colors.error : item.priority === 'major' ? Colors.warning : Colors.info
                }]}>
                  {item.priority.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.itemQuestion}>{item.question}</Text>
            <View style={styles.responseButtons}>
              <TouchableOpacity
                style={[styles.responseButton, styles.passButton, responses[item.id] === true && styles.passButtonActive]}
                onPress={() => handleResponse(item.id, true)}
              >
                <Ionicons name="checkmark" size={24} color={responses[item.id] === true ? Colors.textOnPrimary : Colors.success} />
                <Text style={[styles.responseButtonText, responses[item.id] === true && styles.responseButtonTextActive]}>Pass</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.responseButton, styles.failButton, responses[item.id] === false && styles.failButtonActive]}
                onPress={() => handleResponse(item.id, false)}
              >
                <Ionicons name="close" size={24} color={responses[item.id] === false ? Colors.textOnPrimary : Colors.error} />
                <Text style={[styles.responseButtonText, styles.failButtonText, responses[item.id] === false && styles.responseButtonTextActive]}>Fail</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Complete Button */}
      <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
        <Text style={styles.completeButtonText}>Complete Inspection</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  progressHeader: { padding: Spacing.md, backgroundColor: Colors.background },
  progressText: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  progressBar: { height: 8, backgroundColor: Colors.border, borderRadius: 4 },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
  categoryTabs: { backgroundColor: Colors.background, paddingVertical: Spacing.sm },
  categoryTab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginHorizontal: Spacing.xs, borderRadius: BorderRadius.lg, backgroundColor: Colors.surface },
  categoryTabActive: { backgroundColor: Colors.primary },
  categoryTabText: { fontSize: FontSizes.sm, color: Colors.text, marginLeft: Spacing.xs },
  categoryTabTextActive: { color: Colors.textOnPrimary },
  checkIcon: { marginLeft: Spacing.xs },
  itemsList: { flex: 1, padding: Spacing.md },
  itemCard: { backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md },
  itemHeader: { flexDirection: 'row', marginBottom: Spacing.sm },
  priorityBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  priorityText: { fontSize: FontSizes.xs, fontWeight: '600' },
  itemQuestion: { fontSize: FontSizes.md, color: Colors.text, lineHeight: 22, marginBottom: Spacing.md },
  responseButtons: { flexDirection: 'row', gap: Spacing.sm },
  responseButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 2 },
  passButton: { borderColor: Colors.success, backgroundColor: Colors.success + '10' },
  passButtonActive: { backgroundColor: Colors.success },
  failButton: { borderColor: Colors.error, backgroundColor: Colors.error + '10' },
  failButtonActive: { backgroundColor: Colors.error },
  responseButtonText: { fontSize: FontSizes.md, fontWeight: '600', marginLeft: Spacing.xs, color: Colors.success },
  failButtonText: { color: Colors.error },
  responseButtonTextActive: { color: Colors.textOnPrimary },
  completeButton: { backgroundColor: Colors.primary, margin: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, alignItems: 'center' },
  completeButtonText: { color: Colors.textOnPrimary, fontSize: FontSizes.lg, fontWeight: '600' },
  resultsCard: { backgroundColor: Colors.background, margin: Spacing.md, padding: Spacing.xl, borderRadius: BorderRadius.lg, alignItems: 'center' },
  scoreCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 8, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  scoreText: { fontSize: 36, fontWeight: 'bold' },
  resultsTitle: { fontSize: FontSizes.xl, fontWeight: '600', color: Colors.text, textAlign: 'center' },
  resultsSubtitle: { fontSize: FontSizes.md, color: Colors.textSecondary, marginTop: Spacing.sm },
  section: { padding: Spacing.md },
  sectionTitle: { fontSize: FontSizes.lg, fontWeight: '600', color: Colors.text, marginBottom: Spacing.md },
  failCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.error + '10', padding: Spacing.md, borderRadius: BorderRadius.lg, marginBottom: Spacing.sm },
  failText: { flex: 1, fontSize: FontSizes.md, color: Colors.text, marginLeft: Spacing.md },
  categoryResultCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: Colors.background, padding: Spacing.md, borderRadius: BorderRadius.lg, marginBottom: Spacing.sm },
  categoryResultName: { fontSize: FontSizes.md, color: Colors.text },
  categoryResultScore: { fontSize: FontSizes.md, fontWeight: '600' },
  restartButton: { backgroundColor: Colors.primary, margin: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, alignItems: 'center' },
  restartButtonText: { color: Colors.textOnPrimary, fontSize: FontSizes.lg, fontWeight: '600' },
});
