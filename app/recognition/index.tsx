import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/Colors';
import { useStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { User } from '../../types';

interface Recognition {
  id: string;
  from_user: User;
  to_user: User;
  type: 'kudos' | 'shoutout' | 'award' | 'milestone';
  message: string;
  badge?: string;
  created_at: string;
  likes: number;
  liked_by_me: boolean;
}

const BADGES = [
  { id: 'star', icon: 'star', label: 'Star Performer', color: '#FFD700' },
  { id: 'team', icon: 'people', label: 'Team Player', color: '#4CAF50' },
  { id: 'customer', icon: 'heart', label: 'Customer Hero', color: '#E91E63' },
  { id: 'speed', icon: 'flash', label: 'Speed Demon', color: '#FF9800' },
  { id: 'clean', icon: 'sparkles', label: 'Clean Machine', color: '#00BCD4' },
  { id: 'mentor', icon: 'school', label: 'Mentor', color: '#9C27B0' },
];

const SAMPLE_RECOGNITIONS: Recognition[] = [
  {
    id: '1',
    from_user: { id: '1', name: 'Justin Newbold', role: 'gm', email: '', location_id: '', created_at: '' },
    to_user: { id: '2', name: 'Sarah Johnson', role: 'crew', email: '', location_id: '', created_at: '' },
    type: 'shoutout',
    message: 'Amazing job handling the lunch rush today! You kept the line moving smoothly.',
    badge: 'speed',
    created_at: '2025-01-28T14:30:00Z',
    likes: 5,
    liked_by_me: false,
  },
  {
    id: '2',
    from_user: { id: '3', name: 'Mike Chen', role: 'manager', email: '', location_id: '', created_at: '' },
    to_user: { id: '4', name: 'Emma Davis', role: 'crew', email: '', location_id: '', created_at: '' },
    type: 'kudos',
    message: 'Thank you for staying late to help with inventory. Your dedication is appreciated!',
    badge: 'team',
    created_at: '2025-01-28T10:15:00Z',
    likes: 3,
    liked_by_me: true,
  },
  {
    id: '3',
    from_user: { id: '1', name: 'Justin Newbold', role: 'gm', email: '', location_id: '', created_at: '' },
    to_user: { id: '5', name: 'Alex Martinez', role: 'crew', email: '', location_id: '', created_at: '' },
    type: 'award',
    message: 'Employee of the Month! Consistently exceeds expectations and brings positive energy to the team.',
    badge: 'star',
    created_at: '2025-01-27T09:00:00Z',
    likes: 12,
    liked_by_me: false,
  },
  {
    id: '4',
    from_user: { id: '6', name: 'Corporate', role: 'corporate', email: '', location_id: '', created_at: '' },
    to_user: { id: '7', name: 'Taylor Shack Taylorsville', role: 'manager', email: '', location_id: '', created_at: '' },
    type: 'milestone',
    message: 'Congratulations on 1 year with Patty Shack! Thank you for your dedication.',
    created_at: '2025-01-26T12:00:00Z',
    likes: 8,
    liked_by_me: true,
  },
];

export default function RecognitionScreen() {
  const { user, currentLocation } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [recognitions, setRecognitions] = useState<Recognition[]>(SAMPLE_RECOGNITIONS);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<User | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTeamMembers();
  }, [currentLocation]);

  const fetchTeamMembers = async () => {
    if (!currentLocation) return;

    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('location_id', currentLocation.id)
      .neq('id', user?.id);

    if (data) {
      setTeamMembers(data);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleLike = async (recognitionId: string) => {
    setRecognitions((prev) =>
      prev.map((r) =>
        r.id === recognitionId
          ? { ...r, likes: r.liked_by_me ? r.likes - 1 : r.likes + 1, liked_by_me: !r.liked_by_me }
          : r
      )
    );
  };

  const handleSendRecognition = async () => {
    if (!selectedRecipient) {
      Alert.alert('Missing Recipient', 'Please select who you want to recognize.');
      return;
    }

    if (!message.trim()) {
      Alert.alert('Missing Message', 'Please write a message.');
      return;
    }

    setIsSubmitting(true);

    try {
      // In real app, save to database
      const newRecognition: Recognition = {
        id: Date.now().toString(),
        from_user: user as User,
        to_user: selectedRecipient,
        type: 'kudos',
        message: message.trim(),
        badge: selectedBadge || undefined,
        created_at: new Date().toISOString(),
        likes: 0,
        liked_by_me: false,
      };

      setRecognitions((prev) => [newRecognition, ...prev]);

      Alert.alert('Recognition Sent!', `${selectedRecipient.name} will be notified.`);
      setShowComposeModal(false);
      setSelectedRecipient(null);
      setSelectedBadge(null);
      setMessage('');
    } catch (error) {
      Alert.alert('Error', 'Failed to send recognition.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBadgeInfo = (badgeId?: string) => {
    return BADGES.find((b) => b.id === badgeId);
  };

  const getTypeIcon = (type: Recognition['type']): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'kudos': return 'thumbs-up';
      case 'shoutout': return 'megaphone';
      case 'award': return 'trophy';
      case 'milestone': return 'flag';
    }
  };

  const getTypeColor = (type: Recognition['type']) => {
    switch (type) {
      case 'kudos': return Colors.primary;
      case 'shoutout': return Colors.info;
      case 'award': return Colors.warning;
      case 'milestone': return '#9C27B0';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Recognition Wall</Text>
          <Text style={styles.headerSubtitle}>Celebrate your team's wins!</Text>
        </View>
        <TouchableOpacity
          style={styles.giveButton}
          onPress={() => setShowComposeModal(true)}
        >
          <Ionicons name="add" size={24} color={Colors.textOnPrimary} />
        </TouchableOpacity>
      </View>

      {/* Recognition Feed */}
      <ScrollView
        style={styles.feed}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        {recognitions.map((recognition) => {
          const badge = getBadgeInfo(recognition.badge);
          return (
            <View key={recognition.id} style={styles.recognitionCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.typeIcon, { backgroundColor: getTypeColor(recognition.type) + '20' }]}>
                  <Ionicons
                    name={getTypeIcon(recognition.type)}
                    size={20}
                    color={getTypeColor(recognition.type)}
                  />
                </View>
                <View style={styles.headerInfo}>
                  <Text style={styles.fromUser}>{recognition.from_user.name}</Text>
                  <Text style={styles.toUser}>
                    recognized <Text style={styles.toUserName}>{recognition.to_user.name}</Text>
                  </Text>
                </View>
                <Text style={styles.timeAgo}>
                  {format(new Date(recognition.created_at), 'MMM d')}
                </Text>
              </View>

              {badge && (
                <View style={[styles.badgeContainer, { backgroundColor: badge.color + '20' }]}>
                  <Ionicons name={badge.icon as any} size={16} color={badge.color} />
                  <Text style={[styles.badgeLabel, { color: badge.color }]}>{badge.label}</Text>
                </View>
              )}

              <Text style={styles.message}>{recognition.message}</Text>

              <View style={styles.cardFooter}>
                <TouchableOpacity
                  style={styles.likeButton}
                  onPress={() => handleLike(recognition.id)}
                >
                  <Ionicons
                    name={recognition.liked_by_me ? 'heart' : 'heart-outline'}
                    size={20}
                    color={recognition.liked_by_me ? Colors.error : Colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.likeCount,
                      recognition.liked_by_me && { color: Colors.error },
                    ]}
                  >
                    {recognition.likes}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Compose Modal */}
      <Modal visible={showComposeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Give Recognition</Text>
              <TouchableOpacity onPress={() => setShowComposeModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Who do you want to recognize?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recipientScroll}>
              {teamMembers.map((member) => (
                <TouchableOpacity
                  key={member.id}
                  style={[
                    styles.recipientChip,
                    selectedRecipient?.id === member.id && styles.recipientChipActive,
                  ]}
                  onPress={() => setSelectedRecipient(member)}
                >
                  <View style={styles.recipientAvatar}>
                    <Text style={styles.recipientAvatarText}>
                      {member.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.recipientName,
                      selectedRecipient?.id === member.id && styles.recipientNameActive,
                    ]}
                  >
                    {member.name.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Choose a badge (optional)</Text>
            <View style={styles.badgeGrid}>
              {BADGES.map((badge) => (
                <TouchableOpacity
                  key={badge.id}
                  style={[
                    styles.badgeOption,
                    selectedBadge === badge.id && { borderColor: badge.color, borderWidth: 2 },
                  ]}
                  onPress={() => setSelectedBadge(selectedBadge === badge.id ? null : badge.id)}
                >
                  <Ionicons name={badge.icon as any} size={24} color={badge.color} />
                  <Text style={styles.badgeOptionLabel}>{badge.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Your message</Text>
            <TextInput
              style={styles.messageInput}
              value={message}
              onChangeText={setMessage}
              placeholder="What would you like to say?"
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity
              style={[styles.sendButton, isSubmitting && styles.sendButtonDisabled]}
              onPress={handleSendRecognition}
              disabled={isSubmitting}
            >
              <Ionicons name="paper-plane" size={24} color={Colors.textOnPrimary} />
              <Text style={styles.sendButtonText}>
                {isSubmitting ? 'Sending...' : 'Send Recognition'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.textOnPrimary,
  },
  headerSubtitle: {
    fontSize: FontSizes.md,
    color: Colors.textOnPrimary + 'CC',
  },
  giveButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.textOnPrimary + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feed: {
    flex: 1,
    padding: Spacing.md,
  },
  recognitionCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  fromUser: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  toUser: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  toUserName: {
    color: Colors.primary,
    fontWeight: '600',
  },
  timeAgo: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  badgeLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  message: {
    fontSize: FontSizes.md,
    color: Colors.text,
    lineHeight: 22,
  },
  cardFooter: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  likeCount: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  inputLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  recipientScroll: {
    flexGrow: 0,
  },
  recipientChip: {
    alignItems: 'center',
    marginRight: Spacing.md,
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  recipientChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  recipientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipientAvatarText: {
    color: Colors.textOnPrimary,
    fontWeight: '600',
    fontSize: FontSizes.md,
  },
  recipientName: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  recipientNameActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  badgeOption: {
    width: '31%',
    alignItems: 'center',
    padding: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeOptionLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  messageInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: Colors.textOnPrimary,
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
});
