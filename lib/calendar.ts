import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import { Shift } from '../types';

const CALENDAR_NAME = 'Patty Shack Shifts';

// Request calendar permissions
export async function requestCalendarPermissions(): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
}

// Get or create the Patty Shack calendar
export async function getOrCreateCalendar(): Promise<string | null> {
  const hasPermission = await requestCalendarPermissions();
  if (!hasPermission) {
    return null;
  }

  // Check for existing calendar
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const existingCalendar = calendars.find((cal) => cal.title === CALENDAR_NAME);

  if (existingCalendar) {
    return existingCalendar.id;
  }

  // Create new calendar
  let defaultCalendarSource: Calendar.Source | undefined;

  if (Platform.OS === 'ios') {
    const defaultCalendar = await Calendar.getDefaultCalendarAsync();
    defaultCalendarSource = defaultCalendar.source;
  } else {
    const sources = calendars.map((cal) => cal.source);
    defaultCalendarSource = sources.find((source) => source.isLocalAccount) || sources[0];
  }

  if (!defaultCalendarSource) {
    return null;
  }

  const newCalendarId = await Calendar.createCalendarAsync({
    title: CALENDAR_NAME,
    color: '#4CAF50',
    entityType: Calendar.EntityTypes.EVENT,
    sourceId: defaultCalendarSource.id,
    source: defaultCalendarSource,
    name: CALENDAR_NAME,
    ownerAccount: 'personal',
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });

  return newCalendarId;
}

// Add a shift to the calendar
export async function addShiftToCalendar(
  shift: Shift,
  locationName: string
): Promise<string | null> {
  const calendarId = await getOrCreateCalendar();
  if (!calendarId) {
    return null;
  }

  // Parse shift date and times
  const [year, month, day] = shift.date.split('-').map(Number);
  const [startHour, startMinute] = shift.start_time.split(':').map(Number);
  const [endHour, endMinute] = shift.end_time.split(':').map(Number);

  const startDate = new Date(year, month - 1, day, startHour, startMinute);
  const endDate = new Date(year, month - 1, day, endHour, endMinute);

  // Handle overnight shifts
  if (endDate <= startDate) {
    endDate.setDate(endDate.getDate() + 1);
  }

  const eventId = await Calendar.createEventAsync(calendarId, {
    title: `Work Shift - ${locationName}`,
    startDate,
    endDate,
    location: locationName,
    notes: `Position: ${shift.position || 'Crew Member'}\n${shift.notes || ''}`,
    alarms: [
      { relativeOffset: -60 }, // 1 hour before
      { relativeOffset: -30 }, // 30 minutes before
    ],
  });

  return eventId;
}

// Add multiple shifts to calendar
export async function syncShiftsToCalendar(
  shifts: Shift[],
  locationName: string
): Promise<{ added: number; failed: number }> {
  let added = 0;
  let failed = 0;

  for (const shift of shifts) {
    const eventId = await addShiftToCalendar(shift, locationName);
    if (eventId) {
      added++;
    } else {
      failed++;
    }
  }

  return { added, failed };
}

// Remove a shift from calendar
export async function removeShiftFromCalendar(eventId: string): Promise<boolean> {
  try {
    await Calendar.deleteEventAsync(eventId);
    return true;
  } catch (error) {
    console.error('Error removing event:', error);
    return false;
  }
}

// Get all Patty Shack events
export async function getPattyShackEvents(
  startDate: Date,
  endDate: Date
): Promise<Calendar.Event[]> {
  const calendarId = await getOrCreateCalendar();
  if (!calendarId) {
    return [];
  }

  const events = await Calendar.getEventsAsync([calendarId], startDate, endDate);
  return events;
}

// Clear all Patty Shack events
export async function clearAllPattyShackEvents(): Promise<boolean> {
  const calendarId = await getOrCreateCalendar();
  if (!calendarId) {
    return false;
  }

  try {
    // Get all events for the next year
    const now = new Date();
    const endDate = new Date(now);
    endDate.setFullYear(endDate.getFullYear() + 1);

    const events = await Calendar.getEventsAsync([calendarId], now, endDate);

    for (const event of events) {
      await Calendar.deleteEventAsync(event.id);
    }

    return true;
  } catch (error) {
    console.error('Error clearing events:', error);
    return false;
  }
}

// Delete the entire Patty Shack calendar
export async function deletePattyShackCalendar(): Promise<boolean> {
  const calendarId = await getOrCreateCalendar();
  if (!calendarId) {
    return false;
  }

  try {
    await Calendar.deleteCalendarAsync(calendarId);
    return true;
  } catch (error) {
    console.error('Error deleting calendar:', error);
    return false;
  }
}

// Create a reminder for a shift
export async function createShiftReminder(
  shift: Shift,
  locationName: string,
  minutesBefore: number = 60
): Promise<string | null> {
  const hasPermission = await requestCalendarPermissions();
  if (!hasPermission) {
    return null;
  }

  try {
    const [year, month, day] = shift.date.split('-').map(Number);
    const [startHour, startMinute] = shift.start_time.split(':').map(Number);

    const shiftStart = new Date(year, month - 1, day, startHour, startMinute);
    const reminderDate = new Date(shiftStart.getTime() - minutesBefore * 60 * 1000);

    // Only create if reminder is in the future
    if (reminderDate <= new Date()) {
      return null;
    }

    const calendarId = await getOrCreateCalendar();
    if (!calendarId) {
      return null;
    }

    const eventId = await Calendar.createEventAsync(calendarId, {
      title: `Reminder: Shift at ${locationName}`,
      startDate: reminderDate,
      endDate: new Date(reminderDate.getTime() + 15 * 60 * 1000), // 15 min event
      notes: `Your shift starts at ${shift.start_time}`,
      alarms: [{ relativeOffset: 0 }],
    });

    return eventId;
  } catch (error) {
    console.error('Error creating reminder:', error);
    return null;
  }
}
