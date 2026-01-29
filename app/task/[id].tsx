import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../lib/store';
import Colors from '../../constants/Colors';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { tasks, toggleSubtask, user } = useStore();
  const [task, setTask] = useState(null);

  useEffect(() => {
    const foundTask = tasks.find(t => t.id === id || t.id === Number(id));
    if (foundTask) {
      setTask(foundTask);
    }
  }, [id, tasks]);

  if (!task) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading task...</Text>
      </View>
    );
  }

  const completedCount = task.subtasks?.filter(st => st.completed).length || 0;
  const totalCount = task.subtasks?.length || 0;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const isOpening = task.title?.toLowerCase().includes('opening');

  const handleToggleSubtask = async (subtaskId) => {
    await toggleSubtask(task.id, subtaskId);
  };

  const handleCompleteAll = () => {
    Alert.alert(
      'Complete All Tasks',
      'Are you sure you want to mark all subtasks as complete?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Complete All', 
          onPress: () => {
            task.subtasks?.forEach(st => {
              if (!st.completed) {
                toggleSubtask(task.id, st.id);
              }
            });
          }
        },
      ]
    );
  };

  const SubtaskItem = ({ subtask, index }) => (
    <TouchableOpacity
      style={styles.subtaskItem}
      onPress={() => handleToggleSubtask(subtask.id)}
      activeOpacity={0.7}
    >
      <View style={[
        styles.checkbox,
        subtask.completed && styles.checkboxChecked
      ]}>
        {subtask.completed && (
          <Ionicons name="checkmark" size={14} color="#fff" />
        )}
      </View>
      <Text style={[
        styles.subtaskText,
        subtask.completed && styles.subtaskTextCompleted
      ]}>
        {subtask.text || subtask.title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Task',
          headerStyle: { backgroundColor: Colors.light.primary },
          headerTintColor: '#fff',
        }} 
      />
      
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Task Header */}
        <View style={styles.header}>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={16} color={Colors.light.textSecondary} />
            <Text style={styles.dateText}>{task.date || 'Today'}</Text>
          </View>

          <View style={styles.assigneeRow}>
            <Text style={styles.assigneeName}>{task.assignee || user?.full_name}</Text>
            <Text style={styles.shiftTime}>• {task.shift || '9:00 AM - 9:30 PM'}</Text>
          </View>

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

          <Text style={styles.taskTitle}>{task.title}</Text>
          <Text style={styles.taskDescription}>{task.description}</Text>

          {/* Progress Card */}
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Progress</Text>
              <Text style={styles.progressCount}>{completedCount} / {totalCount}</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressPercent}>{Math.round(progress)}% Complete</Text>
          </View>
        </View>

        {/* Subtasks Section */}
        <View style={styles.subtasksSection}>
          <View style={styles.subtasksHeader}>
            <Text style={styles.subtasksTitle}>Subtasks</Text>
            {totalCount > 0 && completedCount < totalCount && (
              <TouchableOpacity onPress={handleCompleteAll}>
                <Text style={styles.completeAllText}>Complete All</Text>
              </TouchableOpacity>
            )}
          </View>

          {task.subtasks?.map((subtask, index) => (
            <SubtaskItem key={subtask.id} subtask={subtask} index={index} />
          ))}

          {(!task.subtasks || task.subtasks.length === 0) && (
            <View style={styles.emptySubtasks}>
              <Text style={styles.emptyText}>No subtasks for this checklist</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {progress === 100 && (
          <View style={styles.completeSection}>
            <View style={styles.completeIcon}>
              <Ionicons name="checkmark-circle" size={48} color={Colors.light.success} />
            </View>
            <Text style={styles.completeTitle}>All Tasks Complete! 🎉</Text>
            <Text style={styles.completeText}>Great job completing all your tasks.</Text>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>Back to Tasks</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    paddingBottom: Colors.spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    backgroundColor: Colors.light.card,
    padding: Colors.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Colors.spacing.sm,
  },
  dateText: {
    fontSize: Colors.fontSize.sm,
    color: Colors.light.textSecondary,
  },
  assigneeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Colors.spacing.sm,
  },
  assigneeName: {
    fontSize: Colors.fontSize.md,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  shiftTime: {
    fontSize: Colors.fontSize.md,
    color: Colors.light.textSecondary,
    marginLeft: 8,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Colors.spacing.sm,
    paddingVertical: 4,
    borderRadius: Colors.borderRadius.sm,
    marginBottom: Colors.spacing.sm,
  },
  typeBadgeText: {
    fontSize: Colors.fontSize.xs,
    fontWeight: '600',
  },
  taskTitle: {
    fontSize: Colors.fontSize.xl,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: Colors.fontSize.sm,
    color: Colors.light.textSecondary,
    marginBottom: Colors.spacing.md,
  },
  progressCard: {
    backgroundColor: Colors.light.primary + '10',
    borderRadius: Colors.borderRadius.md,
    padding: Colors.spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Colors.spacing.sm,
  },
  progressLabel: {
    fontSize: Colors.fontSize.sm,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  progressCount: {
    fontSize: Colors.fontSize.sm,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.light.primary + '30',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.light.primary,
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: Colors.fontSize.xs,
    color: Colors.light.primary,
    marginTop: Colors.spacing.sm,
    textAlign: 'center',
  },
  subtasksSection: {
    padding: Colors.spacing.md,
  },
  subtasksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Colors.spacing.md,
  },
  subtasksTitle: {
    fontSize: Colors.fontSize.lg,
    fontWeight: '600',
    color: Colors.light.text,
  },
  completeAllText: {
    fontSize: Colors.fontSize.sm,
    color: Colors.light.primary,
    fontWeight: '600',
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Colors.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Colors.spacing.md,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  subtaskText: {
    flex: 1,
    fontSize: Colors.fontSize.sm,
    color: Colors.light.text,
    lineHeight: 22,
  },
  subtaskTextCompleted: {
    color: Colors.light.textSecondary,
    textDecorationLine: 'line-through',
  },
  emptySubtasks: {
    padding: Colors.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: Colors.fontSize.sm,
    color: Colors.light.textSecondary,
  },
  completeSection: {
    alignItems: 'center',
    padding: Colors.spacing.xl,
    backgroundColor: Colors.light.card,
    marginHorizontal: Colors.spacing.md,
    borderRadius: Colors.borderRadius.lg,
  },
  completeIcon: {
    marginBottom: Colors.spacing.md,
  },
  completeTitle: {
    fontSize: Colors.fontSize.lg,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: Colors.spacing.sm,
  },
  completeText: {
    fontSize: Colors.fontSize.sm,
    color: Colors.light.textSecondary,
    marginBottom: Colors.spacing.md,
  },
  backButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: Colors.spacing.xl,
    paddingVertical: Colors.spacing.md,
    borderRadius: Colors.borderRadius.md,
  },
  backButtonText: {
    color: '#fff',
    fontSize: Colors.fontSize.md,
    fontWeight: '600',
  },
});
