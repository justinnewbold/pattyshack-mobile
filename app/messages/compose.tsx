import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/Colors';
import { useStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import { User } from '../../types';

type RecipientType = 'user' | 'location' | 'all';
type Priority = 'low' | 'normal' | 'high' | 'urgent';

export default function ComposeMessageScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, currentLocation, locations, fetchMessages } = useStore();

  const [recipientType, setRecipientType] = useState<RecipientType>('user');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [selectedLocation, setSelectedLocation] = useState(currentLocation);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [showUserPicker, setShowUserPicker] = useState(false);

  // Handle reply prefill
  useEffect(() => {
    if (params.replyTo) {
      setSubject(`Re: ${params.replySubject || ''}`);
    }
  }, [params]);

  // Fetch team members
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

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      Alert.alert('Missing Information', 'Please enter a subject and message.');
      return;
    }

    if (recipientType === 'user' && selectedUsers.length === 0) {
      Alert.alert('No Recipients', 'Please select at least one recipient.');
      return;
    }

    setIsSubmitting(true);

    try {
      const messages: any[] = [];

      if (recipientType === 'user') {
        // Send to selected users
        selectedUsers.forEach((recipient) => {
          messages.push({
            sender_id: user?.id,
            recipient_id: recipient.id,
            subject: subject.trim(),
            body: body.trim(),
            priority,
            is_read: false,
            created_at: new Date().toISOString(),
          });
        });
      } else if (recipientType === 'location') {
        // Send to entire location
        messages.push({
          sender_id: user?.id,
          location_id: selectedLocation?.id,
          subject: subject.trim(),
          body: body.trim(),
          priority,
          is_read: false,
          created_at: new Date().toISOString(),
        });
      } else {
        // Send to all locations (corporate announcement)
        locations.forEach((loc) => {
          messages.push({
            sender_id: user?.id,
            location_id: loc.id,
            subject: subject.trim(),
            body: body.trim(),
            priority,
            is_read: false,
            created_at: new Date().toISOString(),
          });
        });
      }

      const { error } = await supabase.from('messages').insert(messages);

      if (error) throw error;

      await fetchMessages();

      Alert.alert('Success', 'Message sent successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleUserSelection = (selectedUser: User) => {
    setSelectedUsers((prev) => {
      const isSelected = prev.find((u) => u.id === selectedUser.id);
      if (isSelected) {
        return prev.filter((u) => u.id !== selectedUser.id);
      }
      return [...prev, selectedUser];
    });
  };

  const getPriorityColor = (p: Priority) => {
    switch (p) {
      case 'urgent': return Colors.error;
      case 'high': return Colors.warning;
      case 'normal': return Colors.info;
      case 'low': return Colors.textSecondary;
    }
  };

  const canSendToAll = user?.role === 'corporate' || user?.role === 'gm';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Recipient Type Selector */}
        <View style={styles.section}>
          <Text style={styles.label}>Send To</Text>
          <View style={styles.recipientTypeRow}>
            <TouchableOpacity
              style={[
                styles.recipientTypeButton,
                recipientType === 'user' && styles.recipientTypeButtonActive,
              ]}
              onPress={() => setRecipientType('user')}
            >
              <Ionicons
                name="person"
                size={20}
                color={recipientType === 'user' ? Colors.textOnPrimary : Colors.text}
              />
              <Text
                style={[
                  styles.recipientTypeText,
                  recipientType === 'user' && styles.recipientTypeTextActive,
                ]}
              >
                Individual
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.recipientTypeButton,
                recipientType === 'location' && styles.recipientTypeButtonActive,
              ]}
              onPress={() => setRecipientType('location')}
            >
              <Ionicons
                name="storefront"
                size={20}
                color={recipientType === 'location' ? Colors.textOnPrimary : Colors.text}
              />
              <Text
                style={[
                  styles.recipientTypeText,
                  recipientType === 'location' && styles.recipientTypeTextActive,
                ]}
              >
                Location
              </Text>
            </TouchableOpacity>

            {canSendToAll && (
              <TouchableOpacity
                style={[
                  styles.recipientTypeButton,
                  recipientType === 'all' && styles.recipientTypeButtonActive,
                ]}
                onPress={() => setRecipientType('all')}
              >
                <Ionicons
                  name="globe"
                  size={20}
                  color={recipientType === 'all' ? Colors.textOnPrimary : Colors.text}
                />
                <Text
                  style={[
                    styles.recipientTypeText,
                    recipientType === 'all' && styles.recipientTypeTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* User Selection */}
        {recipientType === 'user' && (
          <View style={styles.section}>
            <Text style={styles.label}>Recipients</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowUserPicker(!showUserPicker)}
            >
              <Text style={styles.pickerButtonText}>
                {selectedUsers.length === 0
                  ? 'Select recipients...'
                  : `${selectedUsers.length} selected`}
              </Text>
              <Ionicons
                name={showUserPicker ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>

            {showUserPicker && (
              <View style={styles.userList}>
                {teamMembers.map((member) => {
                  const isSelected = selectedUsers.find((u) => u.id === member.id);
                  return (
                    <TouchableOpacity
                      key={member.id}
                      style={[
                        styles.userItem,
                        isSelected && styles.userItemSelected,
                      ]}
                      onPress={() => toggleUserSelection(member)}
                    >
                      <View style={styles.userAvatar}>
                        <Text style={styles.userAvatarText}>
                          {member.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </Text>
                      </View>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{member.name}</Text>
                        <Text style={styles.userRole}>{member.role}</Text>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Selected users chips */}
            {selectedUsers.length > 0 && (
              <View style={styles.selectedChips}>
                {selectedUsers.map((selectedUser) => (
                  <View key={selectedUser.id} style={styles.chip}>
                    <Text style={styles.chipText}>{selectedUser.name}</Text>
                    <TouchableOpacity onPress={() => toggleUserSelection(selectedUser)}>
                      <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Location Selection */}
        {recipientType === 'location' && (
          <View style={styles.section}>
            <Text style={styles.label}>Location</Text>
            <View style={styles.locationList}>
              {locations.map((loc) => (
                <TouchableOpacity
                  key={loc.id}
                  style={[
                    styles.locationItem,
                    selectedLocation?.id === loc.id && styles.locationItemSelected,
                  ]}
                  onPress={() => setSelectedLocation(loc)}
                >
                  <Ionicons
                    name="storefront-outline"
                    size={20}
                    color={selectedLocation?.id === loc.id ? Colors.primary : Colors.text}
                  />
                  <Text
                    style={[
                      styles.locationName,
                      selectedLocation?.id === loc.id && styles.locationNameSelected,
                    ]}
                  >
                    {loc.name}
                  </Text>
                  {selectedLocation?.id === loc.id && (
                    <Ionicons name="checkmark" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Priority Selector */}
        <View style={styles.section}>
          <Text style={styles.label}>Priority</Text>
          <View style={styles.priorityRow}>
            {(['low', 'normal', 'high', 'urgent'] as Priority[]).map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.priorityButton,
                  priority === p && { backgroundColor: getPriorityColor(p) },
                ]}
                onPress={() => setPriority(p)}
              >
                <Text
                  style={[
                    styles.priorityText,
                    priority === p && styles.priorityTextActive,
                  ]}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Subject Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Subject</Text>
          <TextInput
            style={styles.subjectInput}
            value={subject}
            onChangeText={setSubject}
            placeholder="Enter subject..."
            maxLength={100}
          />
        </View>

        {/* Message Body */}
        <View style={styles.section}>
          <Text style={styles.label}>Message</Text>
          <TextInput
            style={styles.bodyInput}
            value={body}
            onChangeText={setBody}
            placeholder="Type your message..."
            multiline
            numberOfLines={8}
            textAlignVertical="top"
          />
        </View>

        {/* Send Button */}
        <TouchableOpacity
          style={[styles.sendButton, isSubmitting && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={isSubmitting}
        >
          <Ionicons name="send" size={24} color={Colors.textOnPrimary} />
          <Text style={styles.sendButtonText}>
            {isSubmitting ? 'Sending...' : 'Send Message'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: Spacing.md,
    paddingBottom: 0,
  },
  label: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  recipientTypeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  recipientTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  recipientTypeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  recipientTypeText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  recipientTypeTextActive: {
    color: Colors.textOnPrimary,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pickerButtonText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  userList: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  userItemSelected: {
    backgroundColor: Colors.primary + '10',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: Colors.textOnPrimary,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  userName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  userRole: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  selectedChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '20',
    paddingVertical: Spacing.xs,
    paddingLeft: Spacing.sm,
    paddingRight: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  chipText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '500',
  },
  locationList: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  locationItemSelected: {
    backgroundColor: Colors.primary + '10',
  },
  locationName: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  locationNameSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  priorityButton: {
    flex: 1,
    padding: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  priorityText: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  priorityTextActive: {
    color: Colors.textOnPrimary,
  },
  subjectInput: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bodyInput: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
    minHeight: 160,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
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
