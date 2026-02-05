import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/Colors';
import { useStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';

interface TrainingModule {
  id: string;
  title: string;
  description: string;
  category: 'safety' | 'operations' | 'customer_service' | 'food_handling' | 'equipment';
  duration_minutes: number;
  is_required: boolean;
  content_type: 'video' | 'document' | 'quiz' | 'interactive';
  thumbnail_url?: string;
}

interface UserProgress {
  module_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress_percent: number;
  score?: number;
  completed_at?: string;
}

const SAMPLE_MODULES: TrainingModule[] = [
  {
    id: '1',
    title: 'Food Safety Fundamentals',
    description: 'Learn the basics of food safety, temperature control, and HACCP compliance.',
    category: 'food_handling',
    duration_minutes: 30,
    is_required: true,
    content_type: 'interactive',
  },
  {
    id: '2',
    title: 'Fryer Safety & Maintenance',
    description: 'Proper operation and cleaning of commercial fryers.',
    category: 'equipment',
    duration_minutes: 20,
    is_required: true,
    content_type: 'video',
  },
  {
    id: '3',
    title: 'Customer Service Excellence',
    description: 'Best practices for providing excellent customer service.',
    category: 'customer_service',
    duration_minutes: 25,
    is_required: false,
    content_type: 'interactive',
  },
  {
    id: '4',
    title: 'Opening Procedures',
    description: 'Step-by-step guide for opening the restaurant.',
    category: 'operations',
    duration_minutes: 15,
    is_required: true,
    content_type: 'document',
  },
  {
    id: '5',
    title: 'Workplace Safety',
    description: 'General workplace safety and emergency procedures.',
    category: 'safety',
    duration_minutes: 20,
    is_required: true,
    content_type: 'quiz',
  },
  {
    id: '6',
    title: 'Allergen Awareness',
    description: 'Understanding food allergies and cross-contamination prevention.',
    category: 'food_handling',
    duration_minutes: 25,
    is_required: true,
    content_type: 'interactive',
  },
];

const SAMPLE_PROGRESS: UserProgress[] = [
  { module_id: '1', status: 'completed', progress_percent: 100, score: 95, completed_at: '2025-01-15' },
  { module_id: '2', status: 'completed', progress_percent: 100, score: 88, completed_at: '2025-01-20' },
  { module_id: '3', status: 'in_progress', progress_percent: 60 },
  { module_id: '4', status: 'not_started', progress_percent: 0 },
  { module_id: '5', status: 'not_started', progress_percent: 0 },
  { module_id: '6', status: 'not_started', progress_percent: 0 },
];

export default function TrainingScreen() {
  const router = useRouter();
  const { user } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [modules, setModules] = useState<TrainingModule[]>(SAMPLE_MODULES);
  const [progress, setProgress] = useState<Map<string, UserProgress>>(new Map());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const progressMap = new Map<string, UserProgress>();
    SAMPLE_PROGRESS.forEach((p) => progressMap.set(p.module_id, p));
    setProgress(progressMap);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    // Fetch modules and progress from API
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const getCategoryIcon = (category: TrainingModule['category']): keyof typeof Ionicons.glyphMap => {
    switch (category) {
      case 'safety': return 'shield-checkmark';
      case 'operations': return 'cog';
      case 'customer_service': return 'people';
      case 'food_handling': return 'restaurant';
      case 'equipment': return 'construct';
    }
  };

  const getCategoryColor = (category: TrainingModule['category']) => {
    switch (category) {
      case 'safety': return Colors.error;
      case 'operations': return Colors.info;
      case 'customer_service': return Colors.primary;
      case 'food_handling': return Colors.warning;
      case 'equipment': return '#9C27B0';
    }
  };

  const getContentTypeIcon = (type: TrainingModule['content_type']): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'video': return 'play-circle';
      case 'document': return 'document-text';
      case 'quiz': return 'help-circle';
      case 'interactive': return 'game-controller';
    }
  };

  const getStatusColor = (status: UserProgress['status']) => {
    switch (status) {
      case 'completed': return Colors.success;
      case 'in_progress': return Colors.warning;
      case 'not_started': return Colors.textLight;
    }
  };

  const completedCount = Array.from(progress.values()).filter((p) => p.status === 'completed').length;
  const requiredModules = modules.filter((m) => m.is_required);
  const requiredCompleted = requiredModules.filter((m) => progress.get(m.id)?.status === 'completed').length;

  const filteredModules = selectedCategory
    ? modules.filter((m) => m.category === selectedCategory)
    : modules;

  const categories = [...new Set(modules.map((m) => m.category))];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
      }
    >
      {/* Progress Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Ionicons name="school" size={32} color={Colors.primary} />
          <View style={styles.summaryText}>
            <Text style={styles.summaryTitle}>Training Progress</Text>
            <Text style={styles.summarySubtitle}>
              {completedCount} of {modules.length} modules completed
            </Text>
          </View>
        </View>

        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              { width: `${(completedCount / modules.length) * 100}%` },
            ]}
          />
        </View>

        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryStatValue, { color: Colors.success }]}>
              {requiredCompleted}/{requiredModules.length}
            </Text>
            <Text style={styles.summaryStatLabel}>Required</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryStatValue, { color: Colors.info }]}>
              {Array.from(progress.values()).filter((p) => p.score).reduce((a, p) => a + (p.score || 0), 0) /
                (Array.from(progress.values()).filter((p) => p.score).length || 1)}%
            </Text>
            <Text style={styles.summaryStatLabel}>Avg Score</Text>
          </View>
        </View>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        <TouchableOpacity
          style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoryChip,
              selectedCategory === cat && styles.categoryChipActive,
              { borderColor: getCategoryColor(cat) },
            ]}
            onPress={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
          >
            <Ionicons
              name={getCategoryIcon(cat)}
              size={14}
              color={selectedCategory === cat ? Colors.textOnPrimary : getCategoryColor(cat)}
            />
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === cat && styles.categoryChipTextActive,
              ]}
            >
              {cat.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Module List */}
      <View style={styles.moduleList}>
        {filteredModules.map((module) => {
          const moduleProgress = progress.get(module.id);
          const status = moduleProgress?.status || 'not_started';

          return (
            <TouchableOpacity
              key={module.id}
              style={styles.moduleCard}
              onPress={() => router.push(`/training/${module.id}`)}
            >
              <View style={[styles.moduleIcon, { backgroundColor: getCategoryColor(module.category) + '20' }]}>
                <Ionicons
                  name={getCategoryIcon(module.category)}
                  size={24}
                  color={getCategoryColor(module.category)}
                />
              </View>

              <View style={styles.moduleContent}>
                <View style={styles.moduleHeader}>
                  <Text style={styles.moduleTitle} numberOfLines={1}>
                    {module.title}
                  </Text>
                  {module.is_required && (
                    <View style={styles.requiredBadge}>
                      <Text style={styles.requiredBadgeText}>Required</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.moduleDescription} numberOfLines={2}>
                  {module.description}
                </Text>

                <View style={styles.moduleFooter}>
                  <View style={styles.moduleInfo}>
                    <Ionicons name={getContentTypeIcon(module.content_type)} size={14} color={Colors.textSecondary} />
                    <Text style={styles.moduleInfoText}>{module.duration_minutes} min</Text>
                  </View>

                  {status === 'completed' && moduleProgress?.score && (
                    <View style={styles.scoreContainer}>
                      <Ionicons name="star" size={14} color={Colors.warning} />
                      <Text style={styles.scoreText}>{moduleProgress.score}%</Text>
                    </View>
                  )}

                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) + '20' }]}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]} />
                    <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
                      {status === 'not_started' ? 'Start' : status === 'in_progress' ? `${moduleProgress?.progress_percent}%` : 'Done'}
                    </Text>
                  </View>
                </View>
              </View>

              <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
            </TouchableOpacity>
          );
        })}
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
  summaryCard: {
    backgroundColor: Colors.background,
    margin: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  summaryText: {
    marginLeft: Spacing.md,
  },
  summaryTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  summarySubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryStat: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  summaryStatValue: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
  },
  summaryStatLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  categoryScroll: {
    maxHeight: 50,
  },
  categoryContainer: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    textTransform: 'capitalize',
  },
  categoryChipTextActive: {
    color: Colors.textOnPrimary,
  },
  moduleList: {
    padding: Spacing.md,
  },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  moduleIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  moduleTitle: {
    flex: 1,
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  requiredBadge: {
    backgroundColor: Colors.error + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.sm,
  },
  requiredBadgeText: {
    fontSize: FontSizes.xs,
    color: Colors.error,
    fontWeight: '600',
  },
  moduleDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  moduleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  moduleInfoText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  scoreText: {
    fontSize: FontSizes.xs,
    color: Colors.warning,
    fontWeight: '600',
    marginLeft: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginLeft: 'auto',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.xs,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
});
