// Local reminders on the tablet: one when a list opens, one if it is missed.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { ChecklistSlot } from '../../types/checklists';
import { formatTime, timeOnDate } from './logic';

export async function scheduleChecklistReminders(slots: ChecklistSlot[]) {
  if (Platform.OS === 'web') return;
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) {
      const req = await Notifications.requestPermissionsAsync();
      if (!req.granted) return;
    }
    // Clear old checklist reminders
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      pending
        .filter(n => (n.content.data as any)?.kind === 'checklist')
        .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );

    const now = Date.now();
    for (const slot of slots) {
      if (slot.status === 'complete') continue;
      const name = `${slot.template.name}${slot.schedule.label ? ` (${slot.schedule.label})` : ''}`;
      const start = timeOnDate(slot.date, slot.schedule.window_start);
      const end = timeOnDate(slot.date, slot.schedule.window_end);
      // Reminder 15 minutes before a list is late
      const warn = new Date(end.getTime() - 15 * 60000);
      if (start.getTime() > now) {
        await Notifications.scheduleNotificationAsync({
          content: { title: `${name} is due`, body: `Complete by ${formatTime(slot.schedule.window_end)}`, data: { kind: 'checklist', key: slot.key } },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: start },
        });
      }
      if (warn.getTime() > now && warn > start) {
        await Notifications.scheduleNotificationAsync({
          content: { title: `${name} is almost late`, body: `15 minutes left (due ${formatTime(slot.schedule.window_end)})`, data: { kind: 'checklist', key: slot.key } },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: warn },
        });
      }
    }
  } catch (e) {
    console.warn('checklist reminders failed', e);
  }
}
