// User & Auth Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'crew' | 'manager' | 'gm' | 'corporate';
  location_id: string;
  avatar_url?: string;
  created_at: string;
}

// Location Types
export interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone?: string;
  manager_id?: string;
}

// Task & Checklist Types
export interface Task {
  id: string;
  title: string;
  description?: string;
  type: 'opening' | 'closing' | 'mid-shift' | 'custom';
  location_id: string;
  date: string;
  shift_start: string;
  shift_end: string;
  assigned_to: string;
  assigned_user?: User;
  subtasks: Subtask[];
  status: 'pending' | 'in_progress' | 'completed';
  completed_at?: string;
  created_at: string;
}

export interface Subtask {
  id: string;
  task_id: string;
  text: string;
  completed: boolean;
  completed_at?: string;
  completed_by?: string;
  order: number;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  type: 'opening' | 'closing' | 'mid-shift';
  location_id?: string; // null = all locations
  items: string[];
  created_at: string;
}

// Temperature Log Types
export interface TemperatureLog {
  id: string;
  location_id: string;
  equipment_name: string;
  temperature: number;
  unit: 'F' | 'C';
  logged_by: string;
  logged_at: string;
  is_compliant: boolean;
  min_temp: number;
  max_temp: number;
  notes?: string;
}

// Inventory Types
export interface InventoryItem {
  id: string;
  location_id: string;
  name: string;
  category: string;
  current_quantity: number;
  unit: string;
  par_level: number;
  vendor: 'sysco' | 'us_foods' | 'relish' | 'ezcater' | 'other';
  last_ordered?: string;
  last_counted?: string;
}

// Message Types
export interface Message {
  id: string;
  sender_id: string;
  sender?: User;
  recipient_id?: string;
  location_id?: string;
  subject: string;
  body: string;
  is_read: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
}

// Shift Types
export interface Shift {
  id: string;
  user_id: string;
  user?: User;
  location_id: string;
  date: string;
  start_time: string;
  end_time: string;
  position: string;
  notes?: string;
  clock_in?: string;
  clock_out?: string;
}

// Dashboard Stats
export interface DashboardStats {
  tasks_completed_today: number;
  tasks_pending_today: number;
  temp_logs_today: number;
  temp_compliance_rate: number;
  messages_unread: number;
  sales_today?: number;
  labor_percent?: number;
}

// Time Entry Types
export interface TimeEntry {
  id: string;
  user_id: string;
  location_id: string;
  location_name: string;
  clock_in: string;
  clock_out?: string;
  total_hours?: number;
  created_at: string;
}

// Shift Request Types
export interface ShiftRequest {
  id: string;
  user_id: string;
  location_id: string;
  type: 'time_off' | 'shift_swap' | 'schedule_change' | 'availability';
  dates?: string[];
  my_shift_id?: string;
  swap_shift_id?: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  manager_notes?: string;
  created_at: string;
  updated_at?: string;
}

// Training Types
export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  category: 'safety' | 'operations' | 'customer_service' | 'food_handling' | 'equipment';
  duration_minutes: number;
  is_required: boolean;
  content_type: 'video' | 'document' | 'quiz' | 'interactive';
  content_url?: string;
  thumbnail_url?: string;
  created_at: string;
}

export interface TrainingProgress {
  id: string;
  user_id: string;
  module_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress_percent: number;
  score?: number;
  started_at?: string;
  completed_at?: string;
}

// Equipment Types
export interface Equipment {
  id: string;
  location_id: string;
  name: string;
  type: 'fryer' | 'grill' | 'cooler' | 'freezer' | 'oven' | 'mixer' | 'other';
  serial_number?: string;
  last_maintenance?: string;
  next_maintenance?: string;
  status: 'operational' | 'needs_maintenance' | 'out_of_service';
  notes?: string;
}

export interface MaintenanceLog {
  id: string;
  equipment_id: string;
  type: 'routine' | 'repair' | 'inspection' | 'cleaning';
  description: string;
  performed_by: string;
  performed_at: string;
  cost?: number;
}

// Recognition Types
export interface Recognition {
  id: string;
  from_user_id: string;
  to_user_id: string;
  type: 'kudos' | 'shoutout' | 'award' | 'milestone';
  message: string;
  badge?: string;
  likes: number;
  created_at: string;
}

// Navigation Types
export type RootStackParamList = {
  '(tabs)': undefined;
  'task/[id]': { id: string };
  'auth/login': undefined;
  'auth/register': undefined;
  'temperature/log': undefined;
  'timeclock/index': undefined;
  'messages/compose': { replyTo?: string; replySubject?: string };
  'manager/dashboard': undefined;
  'manager/sales': undefined;
  'training/index': undefined;
  'training/[id]': { id: string };
  'shifts/request': undefined;
  'equipment/index': undefined;
  'inventory/count': undefined;
  'recognition/index': undefined;
};
