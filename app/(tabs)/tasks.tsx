import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../lib/store';
import Colors from '../../constants/Colors';

export default function TasksScreen() {
  const router = useRouter();
  const { tasks, fetchTasks, isLoading, user } = useStore();
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
  };

  const getTaskProgress = (task) => {
    if (!task.subtasks || task.subtasks.length === 0) return 0;
    const completed = task.subtasks.filter(st => st.completed).length;
    return Math.round((completed / task.subtasks.length) * 100);
  };

  const getCompletedCount = (task) => {
    if (!task.subtasks) return { completed: 0, total: 0 };
    return {
      completed: task.subtasks.filter(st => st.completed).length,
      total: task.subtasks.length
    };
  };

  const TaskCard = ({ task }) => {
    const progress = getTaskProgress(task);
    const { completed, total } = getCompletedCount(task);
    const isOpening = task.title?.toLowerCase().includes('opening');

    return (
      <TouchableOpacity
        style={styles.taskCard}
        onPress={() => router.push(`/task/${task.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.taskHeader}>
          <View style={[
            styles.typeBadge,
            { backgroundColor: isOpening ? Colors.light.info + '20' : Colors.light.warning + '20' }
          ]}>
            <Text style={[
              styles.typeBadgeText,
              { color: isOpening ? Colors.light.info : Colors.light.warning }
            ]}>
              {isOpening ? 'Opening' : 'Closing'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.light.border} />
        </View>

        <Text style={styles.taskTitle}>{task.title}</Text>
        <Text style={styles.taskDescription}>{task.description}</Text>

        <View style={styles.taskMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={Colors.light.textSecondary} />
            <Text style={styles.metaText}>{task.date || 'Today'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={14} color={Colors.light.textSecondary} />
            <Text style={styles.metaText}>{task.assignee || user?.full_name || 'Unassigned'}</Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>{completed} of {total} tasks</Text>
            <Text style={styles.progressPercent}>{progress}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="checkbox-outline" size={64} color={Colors.light.border} />
      <Text style={styles.emptyTitle}>No Tasks Today</Text>
      <Text style={styles.emptyText}>You're all caught up! Check back later for new tasks.</Text>
    </View>
  );

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
        <Text style={styles.sectionTitle}>Today's Tasks</Text>
        
        {tasks.length === 0 ? (
          <EmptyState />
        ) : (
          tasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))
        )}
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
  sectionTitle: {
    fontSize: Colors.fontSize.lg,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Colors.spacing.md,
  },
  taskCard: {
    backgroundColor: Colors.light.card,
    borderRadius: Colors.borderRadius.lg,
    padding: Colors.spacing.md,
    marginBottom: Colors.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Colors.spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: Colors.spacing.sm,
    paddingVertical: 4,
    borderRadius: Colors.borderRadius.sm,
  },
  typeBadgeText: {
    fontSize: Colors.fontSize.xs,
    fontWeight: '600',
  },
  taskTitle: {
    fontSize: Colors.fontSize.md,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: Colors.fontSize.sm,
    color: Colors.light.textSecondary,
    marginBottom: Colors.spacing.sm,
  },
  taskMeta: {
    flexDirection: 'row',
    gap: Colors.spacing.md,
    marginBottom: Colors.spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: Colors.fontSize.xs,
    color: Colors.light.textSecondary,
  },
  progressContainer: {
    marginTop: Colors.spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: Colors.fontSize.xs,
    color: Colors.light.textSecondary,
  },
  progressPercent: {
    fontSize: Colors.fontSize.xs,
    color: Colors.light.textSecondary,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.light.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.light.primary,
    borderRadius: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Colors.spacing.xxl,
  },
  emptyTitle: {
    fontSize: Colors.fontSize.lg,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: Colors.spacing.md,
  },
  emptyText: {
    fontSize: Colors.fontSize.sm,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: Colors.spacing.sm,
  },
});
