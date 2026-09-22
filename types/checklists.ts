// Food safety checklist types (tablet-first, no equipment sensors)

export type ItemType = 'yes_no' | 'choice' | 'number' | 'temp' | 'photo' | 'comment' | 'signature';

export type TemplateCategory =
  | 'opening' | 'closing' | 'shift_change' | 'line_check' | 'receiving'
  | 'cleaning' | 'self_audit' | 'foh' | 'cooling';

export interface ChecklistTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  station: string;
  description?: string | null;
  requires_signoff: boolean;
  active: boolean;
}

export interface ChecklistItem {
  id: string;
  template_id: string;
  position: number;
  label: string;
  help?: string | null;
  type: ItemType;
  required: boolean;
  min_value?: number | null;
  max_value?: number | null;
  unit?: string | null;
  options?: string[] | null;
  fail_options?: string[] | null;
}

export interface ChecklistSchedule {
  id: string;
  template_id: string;
  location_id: string | null;
  label?: string | null;
  days: number[];
  window_start: string; // "HH:MM:SS"
  window_end: string;
  active: boolean;
}

export interface ChecklistRun {
  id: string;
  template_id: string;
  schedule_id: string | null;
  location_id: string;
  run_date: string; // YYYY-MM-DD
  window_start: string | null;
  window_end: string | null;
  status: 'in_progress' | 'complete';
  started_by: string | null;
  started_at: string;
  completed_by?: string | null;
  completed_at?: string | null;
  signoff_by?: string | null;
  signoff_at?: string | null;
  signoff_note?: string | null;
}

export interface ChecklistResponse {
  id: string;
  run_id: string;
  item_id: string;
  value?: string | null;
  numeric_value?: number | null;
  passed?: boolean | null;
  is_na: boolean;
  photo_url?: string | null;
  comment?: string | null;
  corrective_action?: string | null;
  corrective_note?: string | null;
  corrective_photo_url?: string | null;
  recorded_by?: string | null;
  recorded_at: string;
  edited_note?: string | null;
}

export type SlotStatus = 'not_due' | 'due' | 'in_progress' | 'late' | 'complete';

// One scheduled occurrence of a list for today
export interface ChecklistSlot {
  key: string; // template:schedule:date
  template: ChecklistTemplate;
  schedule: ChecklistSchedule;
  date: string;
  run?: ChecklistRun;
  status: SlotStatus;
}

export const CORRECTIVE_ACTIONS = [
  'Discarded product',
  'Recooked / reheated to temp',
  'Moved to ice bath / rapid cool',
  'Adjusted equipment, will recheck',
  'Moved product to working unit',
  'Rejected delivery',
  'Fixed / corrected on the spot',
  'Called manager',
] as const;
