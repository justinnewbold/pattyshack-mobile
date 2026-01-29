import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../lib/store';
import Colors from '../../constants/Colors';

export default function MessagesScreen() {
  const { messages, fetchMessages, markMessageRead } = useStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMessages();
    setRefreshing(false);
  };

  // Sample messages if none loaded
  const displayMessages = messages.length > 0 ? messages : [
    { id: 1, from: 'Justin Newbold', subject: 'Health Inspection Results', body: 'Great job on the health inspection! Zero violations - $1000 bonus incoming!', time: '2:30 PM', unread: true, type: 'announcement' },
    { id: 2, from: 'Corporate', subject: 'New Menu Items', body: 'New menu items launching next week. Training materials available in the app.', time: '11:00 AM', unread: true, type: 'announcement' },
    { id: 3, from: 'Shift Lead', subject: 'Napkin Restock', body: 'Please restock napkins before close tonight.', time: '9:15 AM', unread: false, type: 'task' },
    { id: 4, from: 'HR Department', subject: 'Schedule Update', body: 'Your schedule for next week has been posted. Please review.', time: 'Yesterday', unread: false, type: 'info' },
    { id: 5, from: 'Training', subject: 'New SOP Available', body: 'A new Standard Operating Procedure for fryer maintenance has been added.', time: 'Mon', unread: false, type: 'training' },
  ];

  const unreadCount = displayMessages.filter(m => m.unread).length;

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'announcement': return Colors.light.primary;
      case 'task': return Colors.light.warning;
      case 'training': return Colors.light.info;
      default: return Colors.light.textSecondary;
    }
  };

  const MessageCard = ({ message }) => (
    <TouchableOpacity
      style={[styles.messageCard, message.unread && styles.messageCardUnread]}
      onPress={() => markMessageRead(message.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { backgroundColor: getTypeColor(message.type) }]}>
        <Text style={styles.avatarText}>{getInitials(message.from)}</Text>
      </View>
      
      <View style={styles.messageContent}>
        <View style={styles.messageHeader}>
          <Text style={[styles.messageSender, message.unread && styles.textBold]}>
            {message.from}
          </Text>
          <Text style={styles.messageTime}>{message.time}</Text>
        </View>
        <Text style={[styles.messageSubject, message.unread && styles.textBold]} numberOfLines={1}>
          {message.subject}
        </Text>
        <Text style={styles.messagePreview} numberOfLines={2}>
          {message.body}
        </Text>
      </View>

      {message.unread && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      {unreadCount > 0 && (
        <View style={styles.headerStats}>
          <Ionicons name="mail-unread" size={20} color={Colors.light.primary} />
          <Text style={styles.headerStatsText}>
            {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

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
        {displayMessages.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color={Colors.light.border} />
            <Text style={styles.emptyTitle}>No Messages</Text>
            <Text style={styles.emptyText}>You're all caught up!</Text>
          </View>
        ) : (
          displayMessages.map(message => (
            <MessageCard key={message.id} message={message} />
          ))
        )}
      </ScrollView>

      {/* Compose Button */}
      <TouchableOpacity style={styles.composeButton} activeOpacity={0.8}>
        <Ionicons name="create-outline" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Colors.spacing.sm,
    paddingVertical: Colors.spacing.sm,
    backgroundColor: Colors.light.primary + '10',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerStatsText: {
    fontSize: Colors.fontSize.sm,
    color: Colors.light.primary,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: Colors.spacing.sm,
  },
  messageCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Colors.spacing.md,
    backgroundColor: Colors.light.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  messageCardUnread: {
    backgroundColor: Colors.light.primary + '08',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Colors.spacing.md,
  },
  avatarText: {
    color: '#fff',
    fontSize: Colors.fontSize.md,
    fontWeight: '600',
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  messageSender: {
    fontSize: Colors.fontSize.md,
    color: Colors.light.text,
  },
  messageTime: {
    fontSize: Colors.fontSize.xs,
    color: Colors.light.textSecondary,
  },
  messageSubject: {
    fontSize: Colors.fontSize.sm,
    color: Colors.light.text,
    marginBottom: 4,
  },
  messagePreview: {
    fontSize: Colors.fontSize.sm,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  textBold: {
    fontWeight: '600',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.light.primary,
    marginLeft: Colors.spacing.sm,
    marginTop: Colors.spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Colors.spacing.xxl * 2,
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
    marginTop: Colors.spacing.sm,
  },
  composeButton: {
    position: 'absolute',
    bottom: Colors.spacing.lg,
    right: Colors.spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});
