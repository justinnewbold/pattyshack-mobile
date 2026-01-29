import { create } from 'zustand';
import { User, Task, Message, Location, DashboardStats, Shift } from '../types';
import { supabase } from './supabase';

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Data
  currentLocation: Location | null;
  locations: Location[];
  tasks: Task[];
  messages: Message[];
  shifts: Shift[];
  stats: DashboardStats | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setCurrentLocation: (location: Location | null) => void;
  setLocations: (locations: Location[]) => void;
  setTasks: (tasks: Task[]) => void;
  setMessages: (messages: Message[]) => void;
  setShifts: (shifts: Shift[]) => void;
  setStats: (stats: DashboardStats | null) => void;
  
  // Data fetching
  fetchTasks: (date?: string) => Promise<void>;
  fetchMessages: () => Promise<void>;
  fetchShifts: (date?: string) => Promise<void>;
  fetchStats: () => Promise<void>;
  
  // Task actions
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  
  // Message actions
  markMessageRead: (messageId: string) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  isLoading: true,
  currentLocation: null,
  locations: [],
  tasks: [],
  messages: [],
  shifts: [],
  stats: null,
  
  // Basic setters
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setLoading: (isLoading) => set({ isLoading }),
  setCurrentLocation: (currentLocation) => set({ currentLocation }),
  setLocations: (locations) => set({ locations }),
  setTasks: (tasks) => set({ tasks }),
  setMessages: (messages) => set({ messages }),
  setShifts: (shifts) => set({ shifts }),
  setStats: (stats) => set({ stats }),
  
  // Fetch tasks for a date
  fetchTasks: async (date) => {
    const { user, currentLocation } = get();
    if (!user || !currentLocation) return;
    
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        subtasks (*),
        assigned_user:users!assigned_to (*)
      `)
      .eq('location_id', currentLocation.id)
      .eq('date', targetDate)
      .order('shift_start', { ascending: true });
    
    if (!error && data) {
      set({ tasks: data });
    }
  },
  
  // Fetch messages
  fetchMessages: async () => {
    const { user, currentLocation } = get();
    if (!user) return;
    
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!sender_id (*)
      `)
      .or(`recipient_id.eq.${user.id},location_id.eq.${currentLocation?.id}`)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (!error && data) {
      set({ messages: data });
    }
  },
  
  // Fetch shifts
  fetchShifts: async (date) => {
    const { currentLocation } = get();
    if (!currentLocation) return;
    
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('shifts')
      .select(`
        *,
        user:users!user_id (*)
      `)
      .eq('location_id', currentLocation.id)
      .eq('date', targetDate)
      .order('start_time', { ascending: true });
    
    if (!error && data) {
      set({ shifts: data });
    }
  },
  
  // Fetch dashboard stats
  fetchStats: async () => {
    const { user, currentLocation } = get();
    if (!user || !currentLocation) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    // Get task stats
    const { data: taskData } = await supabase
      .from('tasks')
      .select('status')
      .eq('location_id', currentLocation.id)
      .eq('date', today);
    
    const tasksCompleted = taskData?.filter(t => t.status === 'completed').length || 0;
    const tasksPending = taskData?.filter(t => t.status !== 'completed').length || 0;
    
    // Get temp log stats
    const { data: tempData } = await supabase
      .from('temperature_logs')
      .select('is_compliant')
      .eq('location_id', currentLocation.id)
      .gte('logged_at', `${today}T00:00:00`);
    
    const tempLogsToday = tempData?.length || 0;
    const tempCompliant = tempData?.filter(t => t.is_compliant).length || 0;
    const tempComplianceRate = tempLogsToday > 0 ? (tempCompliant / tempLogsToday) * 100 : 100;
    
    // Get unread messages
    const { count: unreadCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .or(`recipient_id.eq.${user.id},location_id.eq.${currentLocation.id}`)
      .eq('is_read', false);
    
    set({
      stats: {
        tasks_completed_today: tasksCompleted,
        tasks_pending_today: tasksPending,
        temp_logs_today: tempLogsToday,
        temp_compliance_rate: tempComplianceRate,
        messages_unread: unreadCount || 0,
      },
    });
  },
  
  // Toggle subtask completion
  toggleSubtask: async (taskId, subtaskId) => {
    const { tasks, user } = get();
    const task = tasks.find(t => t.id === taskId);
    const subtask = task?.subtasks.find(s => s.id === subtaskId);
    
    if (!subtask || !user) return;
    
    const newCompleted = !subtask.completed;
    
    const { error } = await supabase
      .from('subtasks')
      .update({
        completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
        completed_by: newCompleted ? user.id : null,
      })
      .eq('id', subtaskId);
    
    if (!error) {
      // Update local state
      set({
        tasks: tasks.map(t => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            subtasks: t.subtasks.map(s => {
              if (s.id !== subtaskId) return s;
              return {
                ...s,
                completed: newCompleted,
                completed_at: newCompleted ? new Date().toISOString() : undefined,
                completed_by: newCompleted ? user.id : undefined,
              };
            }),
          };
        }),
      });
    }
  },
  
  // Mark message as read
  markMessageRead: async (messageId) => {
    const { messages } = get();
    
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId);
    
    if (!error) {
      set({
        messages: messages.map(m => 
          m.id === messageId ? { ...m, is_read: true } : m
        ),
      });
    }
  },
}));
