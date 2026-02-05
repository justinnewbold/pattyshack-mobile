import { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/Colors';
import { useStore } from '../../lib/store';
import { useState } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress?: () => void;
}

function StatCard({ title, value, icon, color, onPress }: StatCardProps) {
  return (
    <TouchableOpacity 
      style={[styles.statCard, { borderLeftColor: color }]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
}

interface QuickActionProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
}

function QuickAction({ title, icon, color, onPress }: QuickActionProps) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={28} color={Colors.textOnPrimary} />
      </View>
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user, currentLocation, stats, fetchStats, isAuthenticated } = useStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
    }
  }, [isAuthenticated]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.authPrompt}>
        <Ionicons name="restaurant" size={64} color={Colors.primary} />
        <Text style={styles.authTitle}>Patty Shack</Text>
        <Text style={styles.authSubtitle}>Sign in to access operations</Text>
        <TouchableOpacity 
          style={styles.signInButton}
          onPress={() => router.push('/auth/login')}
        >
          <Text style={styles.signInButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'Team'}!</Text>
          <Text style={styles.date}>{dateString}</Text>
        </View>
        <View style={styles.locationBadge}>
          <Ionicons name="location" size={14} color={Colors.primary} />
          <Text style={styles.locationText}>{currentLocation?.name || 'Select Location'}</Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          title="Tasks Pending"
          value={stats?.tasks_pending_today || 0}
          icon="list-outline"
          color={Colors.warning}
          onPress={() => router.push('/tasks')}
        />
        <StatCard
          title="Tasks Complete"
          value={stats?.tasks_completed_today || 0}
          icon="checkmark-circle"
          color={Colors.success}
          onPress={() => router.push('/tasks')}
        />
        <StatCard
          title="Temp Logs"
          value={stats?.temp_logs_today || 0}
          icon="thermometer-outline"
          color={Colors.info}
        />
        <StatCard
          title="Compliance"
          value={`${Math.round(stats?.temp_compliance_rate || 100)}%`}
          icon="shield-checkmark"
          color={stats?.temp_compliance_rate === 100 ? Colors.success : Colors.warning}
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <QuickAction
            title="Opening Checklist"
            icon="sunny-outline"
            color={Colors.primary}
            onPress={() => router.push('/tasks?type=opening')}
          />
          <QuickAction
            title="Log Temperature"
            icon="thermometer-outline"
            color={Colors.info}
            onPress={() => router.push('/temperature/log')}
          />
          <QuickAction
            title="Closing Checklist"
            icon="moon-outline"
            color="#673AB7"
            onPress={() => router.push('/tasks?type=closing')}
          />
          <QuickAction
            title="View Messages"
            icon="chatbubble-outline"
            color={Colors.warning}
            onPress={() => router.push('/messages')}
          />
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Overview</Text>
        <View style={styles.overviewCard}>
          <View style={styles.overviewRow}>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>Unread Messages</Text>
              <Text style={[styles.overviewValue, { color: (stats?.messages_unread || 0) > 0 ? Colors.error : Colors.success }]}>
                {stats?.messages_unread || 0}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>Your Shift</Text>
              <Text style={styles.overviewValue}>9:00 AM - 5:00 PM</Text>
            </View>
          </View>
        </View>
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
  header: {
    backgroundColor: Colors.background,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  date: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  locationText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.sm,
  },
  statCard: {
    width: '48%',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    margin: '1%',
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    marginLeft: Spacing.sm,
    flex: 1,
  },
  statValue: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statTitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
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
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAction: {
    width: '48%',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  quickActionText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  overviewCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overviewItem: {
    flex: 1,
    alignItems: 'center',
  },
  overviewLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  overviewValue: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  authPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },
  authTitle: {
    fontSize: FontSizes.header,
    fontWeight: 'bold',
    color: Colors.primary,
    marginTop: Spacing.md,
  },
  authSubtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  signInButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  signInButtonText: {
    color: Colors.textOnPrimary,
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
});
