import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/Colors';

interface LoyaltyMember {
  id: string;
  name: string;
  phone: string;
  email?: string;
  points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  visits: number;
  total_spent: number;
  joined_at: string;
  last_visit: string;
}

const SAMPLE_MEMBERS: LoyaltyMember[] = [
  { id: '1', name: 'Sarah Johnson', phone: '(801) 555-1234', email: 'sarah@email.com', points: 2450, tier: 'gold', visits: 45, total_spent: 892.50, joined_at: '2024-03-15', last_visit: '2025-01-28' },
  { id: '2', name: 'Mike Thompson', phone: '(801) 555-5678', points: 890, tier: 'silver', visits: 18, total_spent: 345.00, joined_at: '2024-08-20', last_visit: '2025-01-27' },
  { id: '3', name: 'Jennifer Lee', phone: '(801) 555-9012', points: 3200, tier: 'platinum', visits: 78, total_spent: 1456.75, joined_at: '2023-11-10', last_visit: '2025-01-28' },
  { id: '4', name: 'David Wilson', phone: '(801) 555-3456', points: 340, tier: 'bronze', visits: 8, total_spent: 124.50, joined_at: '2024-12-01', last_visit: '2025-01-25' },
];

const REWARDS = [
  { points: 100, reward: 'Free Drink', icon: 'cafe' },
  { points: 250, reward: 'Free Fries', icon: 'fast-food' },
  { points: 500, reward: 'Free Burger', icon: 'restaurant' },
  { points: 1000, reward: '$10 Off Order', icon: 'cash' },
  { points: 2500, reward: 'Free Meal for 2', icon: 'people' },
];

export default function LoyaltyScreen() {
  const [members] = useState<LoyaltyMember[]>(SAMPLE_MEMBERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<LoyaltyMember | null>(null);

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.phone.includes(searchQuery)
  );

  const getTierColor = (tier: LoyaltyMember['tier']) => {
    switch (tier) {
      case 'platinum': return '#7c3aed';
      case 'gold': return '#f59e0b';
      case 'silver': return '#6b7280';
      default: return '#b45309';
    }
  };

  const totalMembers = members.length;
  const activeMembers = members.filter((m) => {
    const lastVisit = new Date(m.last_visit);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return lastVisit >= thirtyDaysAgo;
  }).length;

  return (
    <View style={styles.container}>
      {selectedMember ? (
        <ScrollView style={styles.memberDetail}>
          <TouchableOpacity style={styles.backButton} onPress={() => setSelectedMember(null)}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.memberHeader}>
            <View style={[styles.memberAvatar, { backgroundColor: getTierColor(selectedMember.tier) }]}>
              <Text style={styles.memberAvatarText}>
                {selectedMember.name.split(' ').map((n) => n[0]).join('')}
              </Text>
            </View>
            <Text style={styles.memberName}>{selectedMember.name}</Text>
            <View style={[styles.tierBadge, { backgroundColor: getTierColor(selectedMember.tier) }]}>
              <Ionicons name="diamond" size={14} color={Colors.textOnPrimary} />
              <Text style={styles.tierText}>{selectedMember.tier.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.pointsCard}>
            <Text style={styles.pointsLabel}>Available Points</Text>
            <Text style={styles.pointsValue}>{selectedMember.points.toLocaleString()}</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{selectedMember.visits}</Text>
              <Text style={styles.statLabel}>Visits</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>${selectedMember.total_spent.toFixed(0)}</Text>
              <Text style={styles.statLabel}>Total Spent</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{Math.floor(selectedMember.total_spent / selectedMember.visits).toFixed(0)}</Text>
              <Text style={styles.statLabel}>Avg Order</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Info</Text>
            <View style={styles.contactRow}>
              <Ionicons name="call" size={18} color={Colors.textSecondary} />
              <Text style={styles.contactText}>{selectedMember.phone}</Text>
            </View>
            {selectedMember.email && (
              <View style={styles.contactRow}>
                <Ionicons name="mail" size={18} color={Colors.textSecondary} />
                <Text style={styles.contactText}>{selectedMember.email}</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Rewards</Text>
            {REWARDS.filter((r) => r.points <= selectedMember.points).map((reward, index) => (
              <View key={index} style={styles.rewardItem}>
                <View style={styles.rewardIcon}>
                  <Ionicons name={reward.icon as any} size={20} color={Colors.primary} />
                </View>
                <View style={styles.rewardInfo}>
                  <Text style={styles.rewardName}>{reward.reward}</Text>
                  <Text style={styles.rewardPoints}>{reward.points} points</Text>
                </View>
                <TouchableOpacity style={styles.redeemButton}>
                  <Text style={styles.redeemText}>Redeem</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <>
          {/* Summary */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { borderLeftColor: Colors.primary }]}>
              <Text style={styles.summaryValue}>{totalMembers}</Text>
              <Text style={styles.summaryLabel}>Total Members</Text>
            </View>
            <View style={[styles.summaryCard, { borderLeftColor: Colors.success }]}>
              <Text style={styles.summaryValue}>{activeMembers}</Text>
              <Text style={styles.summaryLabel}>Active (30d)</Text>
            </View>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name or phone..."
              placeholderTextColor={Colors.textSecondary}
            />
          </View>

          {/* Members List */}
          <ScrollView style={styles.membersList}>
            {filteredMembers.map((member) => (
              <TouchableOpacity
                key={member.id}
                style={styles.memberCard}
                onPress={() => setSelectedMember(member)}
              >
                <View style={[styles.memberCardAvatar, { backgroundColor: getTierColor(member.tier) }]}>
                  <Text style={styles.memberCardAvatarText}>
                    {member.name.split(' ').map((n) => n[0]).join('')}
                  </Text>
                </View>
                <View style={styles.memberCardInfo}>
                  <Text style={styles.memberCardName}>{member.name}</Text>
                  <Text style={styles.memberCardPhone}>{member.phone}</Text>
                </View>
                <View style={styles.memberCardPoints}>
                  <Text style={styles.memberCardPointsValue}>{member.points.toLocaleString()}</Text>
                  <Text style={styles.memberCardPointsLabel}>pts</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  summaryRow: { flexDirection: 'row', padding: Spacing.md, gap: Spacing.sm },
  summaryCard: { flex: 1, backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.md, borderLeftWidth: 4 },
  summaryValue: { fontSize: FontSizes.xxl, fontWeight: 'bold', color: Colors.text },
  summaryLabel: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, margin: Spacing.md, marginTop: 0, padding: Spacing.md, borderRadius: BorderRadius.lg, gap: Spacing.sm },
  searchInput: { flex: 1, fontSize: FontSizes.md, color: Colors.text },
  membersList: { flex: 1, padding: Spacing.md, paddingTop: 0 },
  memberCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  memberCardAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  memberCardAvatarText: { color: Colors.textOnPrimary, fontWeight: '600' },
  memberCardInfo: { flex: 1, marginLeft: Spacing.md },
  memberCardName: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  memberCardPhone: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  memberCardPoints: { alignItems: 'flex-end', marginRight: Spacing.sm },
  memberCardPointsValue: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.primary },
  memberCardPointsLabel: { fontSize: FontSizes.xs, color: Colors.textSecondary },
  memberDetail: { flex: 1 },
  backButton: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm },
  backText: { fontSize: FontSizes.md, color: Colors.text },
  memberHeader: { alignItems: 'center', padding: Spacing.lg },
  memberAvatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  memberAvatarText: { fontSize: FontSizes.xxl, fontWeight: 'bold', color: Colors.textOnPrimary },
  memberName: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text, marginTop: Spacing.md },
  tierBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full, marginTop: Spacing.sm, gap: Spacing.xs },
  tierText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.textOnPrimary },
  pointsCard: { backgroundColor: Colors.primary, margin: Spacing.md, padding: Spacing.lg, borderRadius: BorderRadius.lg, alignItems: 'center' },
  pointsLabel: { fontSize: FontSizes.md, color: Colors.textOnPrimary + 'CC' },
  pointsValue: { fontSize: 48, fontWeight: 'bold', color: Colors.textOnPrimary },
  statsRow: { flexDirection: 'row', paddingHorizontal: Spacing.md },
  statItem: { flex: 1, alignItems: 'center', backgroundColor: Colors.background, padding: Spacing.md, marginHorizontal: Spacing.xs, borderRadius: BorderRadius.lg },
  statValue: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  statLabel: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  section: { padding: Spacing.md },
  sectionTitle: { fontSize: FontSizes.lg, fontWeight: '600', color: Colors.text, marginBottom: Spacing.md },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  contactText: { fontSize: FontSizes.md, color: Colors.text },
  rewardItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, padding: Spacing.md, borderRadius: BorderRadius.lg, marginBottom: Spacing.sm },
  rewardIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center' },
  rewardInfo: { flex: 1, marginLeft: Spacing.md },
  rewardName: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  rewardPoints: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  redeemButton: { backgroundColor: Colors.primary, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.md },
  redeemText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.textOnPrimary },
});
