import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../lib/store';
import { signOut } from '../../lib/supabase';
import Colors from '../../constants/Colors';

export default function MoreScreen() {
  const router = useRouter();
  const { user, selectedLocation, clearStore } = useStore();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            clearStore();
            router.replace('/auth/login');
          },
        },
      ]
    );
  };

  const MenuItem = ({ icon, label, color, onPress, showBadge, badgeCount }) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <View style={styles.menuRight}>
        {showBadge && badgeCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeCount}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={20} color={Colors.light.border} />
      </View>
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>
            {user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'PS'}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.full_name || 'Patty Shack Employee'}</Text>
          <Text style={styles.profileRole}>{user?.role || 'Crew Member'}</Text>
          <View style={styles.locationBadge}>
            <Ionicons name="location" size={14} color={Colors.light.primary} />
            <Text style={styles.locationText}>
              {selectedLocation?.name || 'Taylorsville UT'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.editButton}>
          <Ionicons name="pencil" size={18} color={Colors.light.primary} />
        </TouchableOpacity>
      </View>

      {/* Account Section */}
      <SectionHeader title="Account" />
      <View style={styles.menuSection}>
        <MenuItem
          icon="person-outline"
          label="My Profile"
          color={Colors.light.primary}
          onPress={() => {}}
        />
        <MenuItem
          icon="notifications-outline"
          label="Notifications"
          color={Colors.light.warning}
          onPress={() => {}}
          showBadge
          badgeCount={3}
        />
        <MenuItem
          icon="lock-closed-outline"
          label="Privacy & Security"
          color={Colors.light.info}
          onPress={() => {}}
        />
      </View>

      {/* Work Section */}
      <SectionHeader title="Work" />
      <View style={styles.menuSection}>
        <MenuItem
          icon="calendar-outline"
          label="Time & Attendance"
          color="#3b82f6"
          onPress={() => {}}
        />
        <MenuItem
          icon="thermometer-outline"
          label="Temperature Logs"
          color="#ef4444"
          onPress={() => {}}
        />
        <MenuItem
          icon="clipboard-outline"
          label="Training & SOPs"
          color="#8b5cf6"
          onPress={() => {}}
        />
        <MenuItem
          icon="stats-chart-outline"
          label="My Performance"
          color="#10b981"
          onPress={() => {}}
        />
      </View>

      {/* Support Section */}
      <SectionHeader title="Support" />
      <View style={styles.menuSection}>
        <MenuItem
          icon="help-circle-outline"
          label="Help Center"
          color="#6b7280"
          onPress={() => {}}
        />
        <MenuItem
          icon="chatbubble-ellipses-outline"
          label="Contact Support"
          color="#6b7280"
          onPress={() => {}}
        />
        <MenuItem
          icon="document-text-outline"
          label="Terms & Conditions"
          color="#6b7280"
          onPress={() => {}}
        />
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appName}>Patty Shack Operations</Text>
        <Text style={styles.appVersion}>Version 1.0.0</Text>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity
        style={styles.signOutButton}
        onPress={handleSignOut}
        activeOpacity={0.7}
      >
        <Ionicons name="log-out-outline" size={20} color={Colors.light.error} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    padding: Colors.spacing.md,
  },
  profileCard: {
    backgroundColor: Colors.light.card,
    borderRadius: Colors.borderRadius.lg,
    padding: Colors.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Colors.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: Colors.fontSize.xl,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
    marginLeft: Colors.spacing.md,
  },
  profileName: {
    fontSize: Colors.fontSize.lg,
    fontWeight: '700',
    color: Colors.light.text,
  },
  profileRole: {
    fontSize: Colors.fontSize.sm,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Colors.spacing.sm,
  },
  locationText: {
    fontSize: Colors.fontSize.sm,
    color: Colors.light.primary,
    fontWeight: '500',
  },
  editButton: {
    padding: Colors.spacing.sm,
  },
  sectionHeader: {
    fontSize: Colors.fontSize.sm,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Colors.spacing.sm,
    marginTop: Colors.spacing.sm,
  },
  menuSection: {
    backgroundColor: Colors.light.card,
    borderRadius: Colors.borderRadius.lg,
    marginBottom: Colors.spacing.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Colors.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Colors.spacing.md,
  },
  menuLabel: {
    flex: 1,
    fontSize: Colors.fontSize.md,
    color: Colors.light.text,
    fontWeight: '500',
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Colors.spacing.sm,
  },
  badge: {
    backgroundColor: Colors.light.error,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: Colors.fontSize.xs,
    fontWeight: '600',
  },
  appInfo: {
    alignItems: 'center',
    marginVertical: Colors.spacing.lg,
  },
  appName: {
    fontSize: Colors.fontSize.sm,
    fontWeight: '600',
    color: Colors.light.text,
  },
  appVersion: {
    fontSize: Colors.fontSize.xs,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Colors.spacing.sm,
    backgroundColor: Colors.light.error + '10',
    padding: Colors.spacing.md,
    borderRadius: Colors.borderRadius.md,
  },
  signOutText: {
    fontSize: Colors.fontSize.md,
    fontWeight: '600',
    color: Colors.light.error,
  },
  bottomSpacer: {
    height: Colors.spacing.xl,
  },
});
