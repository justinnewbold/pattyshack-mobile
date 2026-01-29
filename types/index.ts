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

// Navigation Types
export type RootStackParamList = {
  '(tabs)': undefined;
  'task/[id]': { id: string };
  'auth/login': undefined;
  'auth/register': undefined;
};
