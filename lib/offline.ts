import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { supabase } from './supabase';

const OFFLINE_QUEUE_KEY = '@pattyshack_offline_queue';
const OFFLINE_CACHE_KEY = '@pattyshack_offline_cache';

interface QueuedAction {
  id: string;
  type: 'insert' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: string;
}

interface CachedData {
  tasks: any[];
  messages: any[];
  shifts: any[];
  temperatureLogs: any[];
  lastSynced: string;
}

// Check network connectivity
export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected === true && state.isInternetReachable === true;
}

// Subscribe to network changes
export function subscribeToNetworkChanges(
  callback: (isConnected: boolean) => void
): () => void {
  const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    callback(state.isConnected === true && state.isInternetReachable === true);
  });
  return unsubscribe;
}

// Queue an action for later sync
export async function queueOfflineAction(action: Omit<QueuedAction, 'id' | 'timestamp'>) {
  const queue = await getOfflineQueue();

  const newAction: QueuedAction = {
    ...action,
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
  };

  queue.push(newAction);
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));

  return newAction;
}

// Get all queued actions
export async function getOfflineQueue(): Promise<QueuedAction[]> {
  const data = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
  return data ? JSON.parse(data) : [];
}

// Clear the offline queue
export async function clearOfflineQueue() {
  await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
}

// Process queued actions when back online
export async function syncOfflineActions(): Promise<{ success: number; failed: number }> {
  const online = await isOnline();
  if (!online) {
    return { success: 0, failed: 0 };
  }

  const queue = await getOfflineQueue();
  let success = 0;
  let failed = 0;
  const remainingActions: QueuedAction[] = [];

  for (const action of queue) {
    try {
      let error;

      switch (action.type) {
        case 'insert':
          ({ error } = await supabase.from(action.table).insert(action.data));
          break;
        case 'update':
          ({ error } = await supabase
            .from(action.table)
            .update(action.data.updates)
            .eq('id', action.data.id));
          break;
        case 'delete':
          ({ error } = await supabase
            .from(action.table)
            .delete()
            .eq('id', action.data.id));
          break;
      }

      if (error) {
        throw error;
      }

      success++;
    } catch (error) {
      console.error('Failed to sync action:', action, error);
      remainingActions.push(action);
      failed++;
    }
  }

  // Save remaining failed actions
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingActions));

  return { success, failed };
}

// Cache data for offline use
export async function cacheDataForOffline(data: Partial<CachedData>) {
  const existingCache = await getCachedData();

  const updatedCache: CachedData = {
    ...existingCache,
    ...data,
    lastSynced: new Date().toISOString(),
  };

  await AsyncStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(updatedCache));
}

// Get cached data
export async function getCachedData(): Promise<CachedData> {
  const data = await AsyncStorage.getItem(OFFLINE_CACHE_KEY);
  return data
    ? JSON.parse(data)
    : {
        tasks: [],
        messages: [],
        shifts: [],
        temperatureLogs: [],
        lastSynced: null,
      };
}

// Clear cached data
export async function clearCachedData() {
  await AsyncStorage.removeItem(OFFLINE_CACHE_KEY);
}

// Offline-aware data operations
export const offlineOperations = {
  // Insert with offline support
  async insert(table: string, data: any) {
    const online = await isOnline();

    if (online) {
      return supabase.from(table).insert(data);
    }

    // Queue for later
    await queueOfflineAction({ type: 'insert', table, data });
    return { data: { ...data, id: `offline_${Date.now()}` }, error: null };
  },

  // Update with offline support
  async update(table: string, id: string, updates: any) {
    const online = await isOnline();

    if (online) {
      return supabase.from(table).update(updates).eq('id', id);
    }

    // Queue for later
    await queueOfflineAction({ type: 'update', table, data: { id, updates } });
    return { data: { id, ...updates }, error: null };
  },

  // Delete with offline support
  async delete(table: string, id: string) {
    const online = await isOnline();

    if (online) {
      return supabase.from(table).delete().eq('id', id);
    }

    // Queue for later
    await queueOfflineAction({ type: 'delete', table, data: { id } });
    return { data: null, error: null };
  },
};

// Hook for tracking offline status
export function createOfflineStatusTracker() {
  let isConnected = true;
  const listeners: Set<(online: boolean) => void> = new Set();

  const unsubscribe = NetInfo.addEventListener((state) => {
    const newStatus = state.isConnected === true && state.isInternetReachable === true;

    if (newStatus !== isConnected) {
      isConnected = newStatus;
      listeners.forEach((listener) => listener(isConnected));

      // Auto-sync when coming back online
      if (isConnected) {
        syncOfflineActions();
      }
    }
  });

  return {
    isOnline: () => isConnected,
    subscribe: (callback: (online: boolean) => void) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    destroy: () => {
      unsubscribe();
      listeners.clear();
    },
  };
}
