// Pure logic: schedules, status colors, pass/fail. No I/O here.
import type {
  ChecklistItem, ChecklistResponse, ChecklistRun, ChecklistSchedule,
  ChecklistSlot, ChecklistTemplate, SlotStatus,
} from '../../types/checklists';

export function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** "14:30:00" on a given local date -> Date */
export function timeOnDate(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

export function formatTime(time?: string | null): string {
  if (!time) return '';
  const [hh, mm] = time.split(':').map(Number);
  const suffix = hh >= 12 ? 'pm' : 'am';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, '0')}${suffix}`;
}

export function slotStatus(date: string, schedule: ChecklistSchedule, run: ChecklistRun | undefined, now = new Date()): SlotStatus {
  if (run?.status === 'complete') return 'complete';
  const start = timeOnDate(date, schedule.window_start);
  const end = timeOnDate(date, schedule.window_end);
  if (now > end) return 'late';
  if (run) return 'in_progress';
  if (now < start) return 'not_due';
  return 'due';
}

export function buildTodaySlots(
  templates: ChecklistTemplate[],
  schedules: ChecklistSchedule[],
  runs: ChecklistRun[],
  locationId: string,
  date: string = localDateString(),
  now = new Date(),
): ChecklistSlot[] {
  const weekday = timeOnDate(date, '00:00').getDay();
  const tById = new Map(templates.filter(t => t.active).map(t => [t.id, t]));
  const slots: ChecklistSlot[] = [];
  for (const s of schedules) {
    if (!s.active) continue;
    if (s.location_id && s.location_id !== locationId) continue;
    if (!s.days?.includes(weekday)) continue;
    const template = tById.get(s.template_id);
    if (!template) continue;
    const run = runs.find(r => r.schedule_id === s.id && r.run_date === date && r.location_id === locationId);
    slots.push({
      key: `${template.id}:${s.id}:${date}`,
      template, schedule: s, date, run,
      status: slotStatus(date, s, run, now),
    });
  }
  const order: Record<SlotStatus, number> = { late: 0, in_progress: 1, due: 2, not_due: 3, complete: 4 };
  return slots.sort((a, b) =>
    order[a.status] - order[b.status] || a.schedule.window_start.localeCompare(b.schedule.window_start));
}

export const STATUS_META: Record<SlotStatus, { label: string; color: string; bg: string }> = {
  not_due:     { label: 'Not due',     color: '#6B7280', bg: '#F3F4F6' },
  due:         { label: 'Due now',     color: '#1D4ED8', bg: '#DBEAFE' },
  in_progress: { label: 'In progress', color: '#B45309', bg: '#FEF3C7' },
  late:        { label: 'Late',        color: '#B91C1C', bg: '#FEE2E2' },
  complete:    { label: 'Complete',    color: '#15803D', bg: '#DCFCE7' },
};

export type TempVerdict = 'ok' | 'too_cold' | 'too_hot';

/** Temps and numbers: min = must be at least, max = must be at most */
export function rangeVerdict(item: ChecklistItem, value: number): TempVerdict {
  if (item.min_value != null && value < Number(item.min_value)) return 'too_cold';
  if (item.max_value != null && value > Number(item.max_value)) return 'too_hot';
  return 'ok';
}

export function rangeText(item: ChecklistItem): string {
  const u = item.unit || '';
  if (item.min_value != null && item.max_value != null) return `${item.min_value}–${item.max_value}${u}`;
  if (item.min_value != null) return `≥ ${item.min_value}${u}`;
  if (item.max_value != null) return `≤ ${item.max_value}${u}`;
  return '';
}

/** Decide pass/fail for a raw answer. null = not a pass/fail item. */
export function evaluate(item: ChecklistItem, value: string): boolean | null {
  switch (item.type) {
    case 'yes_no':
      return value === 'yes';
    case 'temp':
    case 'number': {
      const n = Number(value);
      if (value.trim() === '' || Number.isNaN(n)) return null;
      return rangeVerdict(item, n) === 'ok';
    }
    case 'choice':
      return !(item.fail_options || []).includes(value);
    default:
      return null;
  }
}

export function isAnswered(item: ChecklistItem, r?: ChecklistResponse): boolean {
  if (!r) return false;
  if (r.is_na) return true;
  if (item.type === 'photo') return !!r.photo_url;
  return r.value != null && String(r.value).trim() !== '';
}

/** A failed answer needs a corrective action before the list can move on. */
export function needsCorrective(r?: ChecklistResponse): boolean {
  return !!r && r.passed === false && !r.is_na && !r.corrective_action;
}

/**
 * Index of the first item that blocks progress (failed without a corrective
 * action). Items after it are locked. -1 means nothing is blocking.
 */
export function blockingIndex(items: ChecklistItem[], responses: Record<string, ChecklistResponse>): number {
  return items.findIndex(i => needsCorrective(responses[i.id]));
}

export function canComplete(items: ChecklistItem[], responses: Record<string, ChecklistResponse>): { ok: boolean; reason?: string } {
  if (blockingIndex(items, responses) >= 0) return { ok: false, reason: 'Record a corrective action for the failed item.' };
  const missing = items.filter(i => i.required && !isAnswered(i, responses[i.id]));
  if (missing.length) return { ok: false, reason: `${missing.length} required item${missing.length > 1 ? 's' : ''} left.` };
  return { ok: true };
}

export function uuid(): string {
  // RFC4122 v4, good enough for offline client ids
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function isManagerRole(role?: string | null) {
  return role === 'manager' || role === 'gm' || role === 'corporate';
}
export function isHqRole(role?: string | null) {
  return role === 'gm' || role === 'corporate';
}
