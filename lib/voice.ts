import { Alert } from 'react-native';

// Voice Commands Library
// Provides hands-free operation for common tasks

export interface VoiceCommand {
  id: string;
  phrases: string[];
  action: string;
  description: string;
  category: 'tasks' | 'temperature' | 'navigation' | 'time' | 'general';
}

export const VOICE_COMMANDS: VoiceCommand[] = [
  // Task commands
  {
    id: 'complete_task',
    phrases: ['complete task', 'task done', 'finish task', 'mark complete'],
    action: 'COMPLETE_TASK',
    description: 'Mark the current task as complete',
    category: 'tasks',
  },
  {
    id: 'next_task',
    phrases: ['next task', 'show next', 'what\'s next'],
    action: 'NEXT_TASK',
    description: 'Go to the next task in the list',
    category: 'tasks',
  },
  {
    id: 'show_tasks',
    phrases: ['show tasks', 'open tasks', 'my tasks', 'task list'],
    action: 'NAVIGATE_TASKS',
    description: 'Open the tasks screen',
    category: 'navigation',
  },

  // Temperature commands
  {
    id: 'log_temp',
    phrases: ['log temperature', 'record temperature', 'temp log'],
    action: 'OPEN_TEMP_LOG',
    description: 'Open temperature logging screen',
    category: 'temperature',
  },
  {
    id: 'log_cooler',
    phrases: ['log cooler', 'cooler temperature', 'walk-in temperature'],
    action: 'LOG_COOLER_TEMP',
    description: 'Log walk-in cooler temperature',
    category: 'temperature',
  },
  {
    id: 'log_freezer',
    phrases: ['log freezer', 'freezer temperature'],
    action: 'LOG_FREEZER_TEMP',
    description: 'Log walk-in freezer temperature',
    category: 'temperature',
  },

  // Time clock commands
  {
    id: 'clock_in',
    phrases: ['clock in', 'punch in', 'start shift', 'I\'m here'],
    action: 'CLOCK_IN',
    description: 'Clock in for your shift',
    category: 'time',
  },
  {
    id: 'clock_out',
    phrases: ['clock out', 'punch out', 'end shift', 'I\'m leaving'],
    action: 'CLOCK_OUT',
    description: 'Clock out from your shift',
    category: 'time',
  },
  {
    id: 'start_break',
    phrases: ['start break', 'take break', 'going on break'],
    action: 'START_BREAK',
    description: 'Start a break',
    category: 'time',
  },
  {
    id: 'end_break',
    phrases: ['end break', 'back from break', 'break over'],
    action: 'END_BREAK',
    description: 'End current break',
    category: 'time',
  },

  // Navigation commands
  {
    id: 'go_home',
    phrases: ['go home', 'home screen', 'dashboard', 'main screen'],
    action: 'NAVIGATE_HOME',
    description: 'Go to the dashboard',
    category: 'navigation',
  },
  {
    id: 'go_messages',
    phrases: ['show messages', 'open messages', 'my messages'],
    action: 'NAVIGATE_MESSAGES',
    description: 'Open messages screen',
    category: 'navigation',
  },
  {
    id: 'go_schedule',
    phrases: ['show schedule', 'my schedule', 'open shifts'],
    action: 'NAVIGATE_SCHEDULE',
    description: 'Open schedule screen',
    category: 'navigation',
  },

  // General commands
  {
    id: 'help',
    phrases: ['help', 'what can I say', 'voice commands', 'show commands'],
    action: 'SHOW_HELP',
    description: 'Show available voice commands',
    category: 'general',
  },
];

// Simple voice command parser
export function parseVoiceCommand(transcript: string): VoiceCommand | null {
  const lowerTranscript = transcript.toLowerCase().trim();

  for (const command of VOICE_COMMANDS) {
    for (const phrase of command.phrases) {
      if (lowerTranscript.includes(phrase)) {
        return command;
      }
    }
  }

  return null;
}

// Execute voice command
export async function executeVoiceCommand(
  command: VoiceCommand,
  context: {
    router: any;
    store: any;
  }
): Promise<{ success: boolean; message: string }> {
  const { router, store } = context;

  switch (command.action) {
    case 'NAVIGATE_HOME':
      router.navigate('/');
      return { success: true, message: 'Opening dashboard' };

    case 'NAVIGATE_TASKS':
      router.navigate('/tasks');
      return { success: true, message: 'Opening tasks' };

    case 'NAVIGATE_MESSAGES':
      router.navigate('/messages');
      return { success: true, message: 'Opening messages' };

    case 'NAVIGATE_SCHEDULE':
      router.navigate('/shifts');
      return { success: true, message: 'Opening schedule' };

    case 'OPEN_TEMP_LOG':
      router.navigate('/temperature/log');
      return { success: true, message: 'Opening temperature log' };

    case 'CLOCK_IN':
      router.navigate('/timeclock');
      return { success: true, message: 'Opening time clock' };

    case 'START_BREAK':
      router.navigate('/breaks');
      return { success: true, message: 'Opening break tracker' };

    case 'SHOW_HELP':
      Alert.alert(
        'Voice Commands',
        VOICE_COMMANDS.map((c) => `"${c.phrases[0]}" - ${c.description}`).join('\n'),
        [{ text: 'OK' }]
      );
      return { success: true, message: 'Showing help' };

    default:
      return { success: false, message: 'Command not implemented' };
  }
}

// Voice feedback messages
export const VOICE_FEEDBACK = {
  listening: 'Listening...',
  processing: 'Processing...',
  success: 'Done!',
  error: 'Sorry, I didn\'t understand that.',
  not_supported: 'Voice commands are not supported on this device.',
  permission_denied: 'Microphone permission is required for voice commands.',
};

// Check if voice is supported
export function isVoiceSupported(): boolean {
  // In production, check for Speech Recognition API support
  return true;
}

// Format command for display
export function formatCommand(command: VoiceCommand): string {
  return `"${command.phrases[0]}"`;
}
