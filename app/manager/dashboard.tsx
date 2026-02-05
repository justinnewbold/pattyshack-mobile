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

interface TeamMember {
  id: string;
  name: string;
  role: string;
  status: 'clocked_in' | 'scheduled' | 'off';
  clockInTime?: string;
}

interface LocationStats {
  tasksCompleted: number;
  tasksPending: number;
  tempLogsToday: number;
  complianceRate: number;
  clockedInCount: number;
  scheduledCount: number;
}

export default function ManagerDashboardScreen() {
  const router = useRouter();
  const { user, currentLocation } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<LocationStats | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, [currentLocation]);

  const fetchDashboardData = async () => {
    if (!currentLocation) return;

    await Promise.all([
      fetchLocationStats(),
      fetchTeamStatus(),
      fetchPendingRequests(),
    ]);
  };

  const fetchLocationStats = async () => {
    if (!currentLocation) return;

    const today = new Date().toISOString().split('T')[0];

    // Fetch task stats
    const { data: taskData } = await supabase
      .from('tasks')
      .select('status')
      .eq('location_id', currentLocation.id)
      .eq('date', today);

    // Fetch temperature logs
    const { data: tempData } = await supabase
      .from('temperature_logs')
      .select('is_compliant')
      .eq('location_id', currentLocation.id)
      .gte('logged_at', `${today}T00:00:00`);

    // Fetch time entries
    const { data: timeData } = await supabase
      .from('time_entries')
      .select('*')
      .eq('location_id', currentLocation.id)
      .is('clock_out', null);

    // Fetch scheduled shifts
    const { data: shiftData } = await supabase
      .from('shifts')
      .select('*')
      .eq('location_id', currentLocation.id)
      .eq('date', today);

    const tasksCompleted = taskData?.filter((t) => t.status === 'completed').length || 0;
    const tasksPending = taskData?.filter((t) => t.status !== 'completed').length || 0;
    const tempLogsToday = tempData?.length || 0;
    const tempCompliant = tempData?.filter((t) => t.is_compliant).length || 0;
    const complianceRate = tempLogsToday > 0 ? (tempCompliant / tempLogsToday) * 100 : 100;

    setStats({
      tasksCompleted,
      tasksPending,
      tempLogsToday,
      complianceRate,
      clockedInCount: timeData?.length || 0,
      scheduledCount: shiftData?.length || 0,
    });
  };

  const fetchTeamStatus = async () => {
    if (!currentLocation) return;

    const today = new Date().toISOString().split('T')[0];

    // Get team members
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .eq('location_id', currentLocation.id);

    // Get who's clocked in
    const { data: clockedIn } = await supabase
      .from('time_entries')
      .select('user_id, clock_in')
      .eq('location_id', currentLocation.id)
      .is('clock_out', null);

    // Get today's shifts
    const { data: shifts } = await supabase
      .from('shifts')
      .select('user_id')
      .eq('location_id', currentLocation.id)
      .eq('date', today);

    const clockedInMap = new Map(clockedIn?.map((e) => [e.user_id, e.clock_in]) || []);
    const scheduledSet = new Set(shifts?.map((s) => s.user_id) || []);

    const members: TeamMember[] = (users || []).map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      status: clockedInMap.has(u.id)
        ? 'clocked_in'
        : scheduledSet.has(u.id)
        ? 'scheduled'
        : 'off',
      clockInTime: clockedInMap.get(u.id),
    }));

    // Sort: clocked in first, then scheduled, then off
    members.sort((a, b) => {
      const order = { clocked_in: 0, scheduled: 1, off: 2 };
      return order[a.status] - order[b.status];
    });

    setTeamMembers(members);
  };

  const fetchPendingRequests = async () => {
    if (!currentLocation) return;

    const { data } = await supabase
      .from('shift_requests')
      .select('*, user:users!user_id(*)')
      .eq('location_id', currentLocation.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5);

    setPendingRequests(data || []);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const getStatusColor = (status: TeamMember['status']) => {
    switch (status) {
      case 'clocked_in': return Colors.success;
      case 'scheduled': return Colors.warning;
      case 'off': return Colors.textLight;
    }
  };

  const getStatusText = (status: TeamMember['status']) => {
    switch (status) {
      case 'clocked_in': return 'Working';
      case 'scheduled': return 'Scheduled';
      case 'off': return 'Off Today';
    }
  };

  // Check if user is a manager
  if (user?.role !== 'manager' && user?.role !== 'gm' && user?.role !== 'corporate') {
    return (
      <View style={styles.accessDenied}>
        <Ionicons name="lock-closed" size={64} color={Colors.textLight} />
        <Text style={styles.accessDeniedTitle}>Manager Access Required</Text>
        <Text style={styles.accessDeniedText}>
          This dashboard is only available to managers.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
      }
    >
      {/* Location Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Manager Dashboard</Text>
          <View style={styles.locationBadge}>
            <Ionicons name="storefront" size={14} color={Colors.primary} />
            <Text style={styles.locationText}>{currentLocation?.name}</Text>
          </View>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { borderLeftColor: Colors.success }]}>
          <Text style={styles.statValue}>{stats?.clockedInCount || 0}</Text>
          <Text style={styles.statLabel}>Clocked In</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: Colors.warning }]}>
          <Text style={styles.statValue}>{stats?.tasksPending || 0}</Text>
          <Text style={styles.statLabel}>Tasks Pending</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: Colors.info }]}>
          <Text style={styles.statValue}>{stats?.tempLogsToday || 0}</Text>
          <Text style={styles.statLabel}>Temp Logs</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: stats?.complianceRate === 100 ? Colors.success : Colors.error }]}>
          <Text style={styles.statValue}>{Math.round(stats?.complianceRate || 100)}%</Text>
          <Text style={styles.statLabel}>Compliance</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/manager/schedule')}
          >
            <Ionicons name="calendar" size={24} color={Colors.primary} />
            <Text style={styles.actionText}>Schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/manager/timecards')}
          >
            <Ionicons name="time" size={24} color={Colors.info} />
            <Text style={styles.actionText}>Timecards</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/manager/reports')}
          >
            <Ionicons name="stats-chart" size={24} color={Colors.warning} />
            <Text style={styles.actionText}>Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/messages/compose')}
          >
            <Ionicons name="megaphone" size={24} color={Colors.error} />
            <Text style={styles.actionText}>Announce</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pending Requests</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingRequests.length}</Text>
            </View>
          </View>
          {pendingRequests.map((request) => (
            <TouchableOpacity
              key={request.id}
              style={styles.requestCard}
              onPress={() => router.push(`/manager/request/${request.id}`)}
            >
              <View style={styles.requestInfo}>
                <Text style={styles.requestName}>{request.user?.name}</Text>
                <Text style={styles.requestType}>{request.type}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Team Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Team Status</Text>
        {teamMembers.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No team members found</Text>
          </View>
        ) : (
          teamMembers.map((member) => (
            <View key={member.id} style={styles.memberCard}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberAvatarText}>
                  {member.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberRole}>{member.role}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(member.status) + '20' }]}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(member.status) }]} />
                <Text style={[styles.statusText, { color: getStatusColor(member.status) }]}>
                  {getStatusText(member.status)}
                </Text>
              </View>
            </View>
          ))
        )}
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
  },
  headerTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  locationText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    marginLeft: Spacing.xs,
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
    borderLeftWidth: 4,
  },
  statValue: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSizes.sm,
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
    marginBottom: Spacing.md,
  },
  badge: {
    backgroundColor: Colors.error,
    borderRadius: 12,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    marginLeft: Spacing.sm,
  },
  badgeText: {
    color: Colors.textOnPrimary,
    fontSize: FontSizes.xs,
    fontWeight: 'bold',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    width: '23%',
  },
  actionText: {
    fontSize: FontSizes.xs,
    color: Colors.text,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  requestType: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    color: Colors.textOnPrimary,
    fontWeight: '600',
    fontSize: FontSizes.sm,
  },
  memberInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  memberName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  memberRole: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
  },
  emptyText: {
    color: Colors.textSecondary,
  },
  accessDenied: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },
  accessDeniedTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  accessDeniedText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});
