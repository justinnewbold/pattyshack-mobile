import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushNotificationToken {
  token: string;
  platform: 'ios' | 'android' | 'web';
}

// Register for push notifications and get token
export async function registerForPushNotifications(): Promise<PushNotificationToken | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permission if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied');
    return null;
  }

  // Get Expo push token
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  });

  // Configure Android channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4CAF50',
    });

    await Notifications.setNotificationChannelAsync('shifts', {
      name: 'Shift Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });

    await Notifications.setNotificationChannelAsync('tasks', {
      name: 'Task Notifications',
      importance: Notifications.AndroidImportance.HIGH,
    });

    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  return {
    token: tokenData.data,
    platform: Platform.OS as 'ios' | 'android',
  };
}

// Save push token to database
export async function savePushToken(userId: string, token: string, platform: string) {
  const { error } = await supabase.from('push_tokens').upsert(
    {
      user_id: userId,
      token,
      platform,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    console.error('Error saving push token:', error);
  }
}

// Schedule a local notification
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
  trigger?: Notifications.NotificationTriggerInput
) {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: trigger || null,
  });
}

// Schedule shift reminder
export async function scheduleShiftReminder(
  shiftDate: Date,
  shiftTime: string,
  locationName: string
) {
  // Remind 1 hour before shift
  const reminderTime = new Date(shiftDate);
  const [hours, minutes] = shiftTime.split(':').map(Number);
  reminderTime.setHours(hours - 1, minutes, 0, 0);

  // Only schedule if reminder time is in the future
  if (reminderTime > new Date()) {
    await scheduleLocalNotification(
      'Shift Reminder',
      `Your shift at ${locationName} starts in 1 hour (${shiftTime})`,
      { type: 'shift_reminder', shiftTime },
      { date: reminderTime }
    );
  }
}

// Cancel all scheduled notifications
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Get badge count
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

// Set badge count
export async function setBadgeCount(count: number) {
  await Notifications.setBadgeCountAsync(count);
}

// Add notification listeners
export function addNotificationListeners(
  onReceived: (notification: Notifications.Notification) => void,
  onResponse: (response: Notifications.NotificationResponse) => void
) {
  const receivedSubscription = Notifications.addNotificationReceivedListener(onReceived);
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(onResponse);

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}

// Send notification types
export const NotificationTypes = {
  NEW_MESSAGE: 'new_message',
  TASK_ASSIGNED: 'task_assigned',
  TASK_DUE: 'task_due',
  SHIFT_REMINDER: 'shift_reminder',
  SHIFT_CHANGE: 'shift_change',
  TEMP_ALERT: 'temp_alert',
  ANNOUNCEMENT: 'announcement',
  RECOGNITION: 'recognition',
} as const;
