// Built-in sample data used until the Supabase database is connected.
// Mirrors the seed in supabase/migrations/20260922000000_food_safety_checklists.sql
import type { User, Location } from '../../types';
import type { ChecklistItem, ChecklistSchedule, ChecklistTemplate } from '../../types/checklists';

export const DEMO_USER: User = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'demo@pattyshack.com',
  name: 'Justin Newbold',
  role: 'corporate',
  location_id: 'loc-taylorsville',
  created_at: new Date().toISOString(),
};

export const DEMO_LOCATIONS: Location[] = [
  { id: 'loc-taylorsville', name: 'Taylorsville', address: '1207 W 4800 S', city: 'Taylorsville', state: 'UT' },
  { id: 'loc-layton', name: 'Layton', address: '2056 N Hill Field Rd', city: 'Layton', state: 'UT' },
  { id: 'loc-slc', name: 'Salt Lake City Kitchen', address: '23 N 900 W', city: 'Salt Lake City', state: 'UT' },
  { id: 'loc-denver', name: 'Denver Kitchen', address: '810 N Vallejo St', city: 'Denver', state: 'CO' },
];

const T = (id: string, name: string, category: ChecklistTemplate['category'], station: string, description: string, requires_signoff: boolean): ChecklistTemplate =>
  ({ id, name, category, station, description, requires_signoff, active: true });

export const DEMO_TEMPLATES: ChecklistTemplate[] = [
  T('t-open', 'Opening Checklist', 'opening', 'all', 'Sanitizer, hand sinks, cooler spot-check, date labels', true),
  T('t-line', 'Line Check', 'line_check', 'all', 'Grill, fryer, hot hold, cold rail, shake product temps', true),
  T('t-recv', 'Receiving', 'receiving', 'back', 'Truck and case temps. Reject anything out of spec.', false),
  T('t-cool', 'Cooling Log', 'cooling', 'back', 'Chili, soup, sauce: 135°F → 70°F in 2 hrs, → 41°F within 6 hrs total', true),
  T('t-close', 'Closing Checklist', 'closing', 'all', 'Covers, temps, discard log, signature', true),
];

type Row = [string, number, string, string | null, ChecklistItem['type'], boolean, number | null, number | null, string | null, string[] | null, string[] | null];
const rows: Row[] = [
  ['t-open', 1, 'Sanitizer buckets set up at correct strength', 'Test strip in range', 'yes_no', true, null, null, null, null, null],
  ['t-open', 2, 'Sanitizer concentration (quat)', 'Target 200–400 ppm', 'number', true, 200, 400, 'ppm', null, null],
  ['t-open', 3, 'All hand sinks stocked (soap, towels) and unblocked', null, 'yes_no', true, null, null, null, null, null],
  ['t-open', 4, 'Walk-in cooler temp (probe product)', 'Must be 41°F or below', 'temp', true, null, 41, '°F', null, null],
  ['t-open', 5, 'Reach-in / cold rail temp', 'Must be 41°F or below', 'temp', true, null, 41, '°F', null, null],
  ['t-open', 6, 'Freezer temp', 'Must be 0°F or below', 'temp', true, null, 0, '°F', null, null],
  ['t-open', 7, 'All prepped product date-labeled and in date', null, 'yes_no', true, null, null, null, null, null],
  ['t-open', 8, 'Notes', null, 'comment', false, null, null, null, null, null],
  ['t-open', 9, 'Opener signature', null, 'signature', true, null, null, null, null, null],
  ['t-line', 1, 'Burger patty internal temp (off the grill)', 'Ground beef must reach 155°F', 'temp', true, 155, null, '°F', null, null],
  ['t-line', 2, 'Chicken internal temp', 'Must reach 165°F', 'temp', false, 165, null, '°F', null, null],
  ['t-line', 3, 'Fryer oil condition', 'Change if dark, foamy, or smoking', 'choice', true, null, null, null, ['Good', 'Fair', 'Change now'], ['Change now']],
  ['t-line', 4, 'Hot hold temp (chili / cheese sauce)', 'Must be 135°F or above', 'temp', true, 135, null, '°F', null, null],
  ['t-line', 5, 'Cold rail product temp (tomato, lettuce, cheese)', 'Must be 41°F or below', 'temp', true, null, 41, '°F', null, null],
  ['t-line', 6, 'Shake base / shake fridge temp', 'Must be 41°F or below', 'temp', true, null, 41, '°F', null, null],
  ['t-line', 7, 'Grill station clean and organized', null, 'yes_no', true, null, null, null, null, null],
  ['t-line', 8, 'Photo of line', null, 'photo', false, null, null, null, null, null],
  ['t-recv', 1, 'Supplier / distributor', null, 'comment', true, null, null, null, null, null],
  ['t-recv', 2, 'Truck refrigerated compartment temp', 'Must be 41°F or below', 'temp', true, null, 41, '°F', null, null],
  ['t-recv', 3, 'Refrigerated case product temp (probe between packages)', 'Must be 41°F or below', 'temp', true, null, 41, '°F', null, null],
  ['t-recv', 4, 'Frozen product temp', 'Must be 0°F or below, no thaw signs', 'temp', false, null, 0, '°F', null, null],
  ['t-recv', 5, 'Packaging intact, no damage, no pests', null, 'yes_no', true, null, null, null, null, null],
  ['t-recv', 6, 'Photo of invoice', null, 'photo', true, null, null, null, null, null],
  ['t-recv', 7, 'Received by (signature)', null, 'signature', true, null, null, null, null, null],
  ['t-cool', 1, 'Product being cooled', 'Chili, soup, sauce…', 'comment', true, null, null, null, null, null],
  ['t-cool', 2, 'Start temp', 'Cooling starts at 135°F or above', 'temp', true, 135, null, '°F', null, null],
  ['t-cool', 3, '2-hour temp', 'Must be 70°F or below within 2 hours', 'temp', true, null, 70, '°F', null, null],
  ['t-cool', 4, '6-hour temp', 'Must be 41°F or below within 6 hours total', 'temp', true, null, 41, '°F', null, null],
  ['t-cool', 5, 'Cooling method used', null, 'choice', true, null, null, null, ['Ice bath', 'Shallow pans', 'Ice wand', 'Blast chill'], null],
  ['t-close', 1, 'All product covered, labeled, and dated', null, 'yes_no', true, null, null, null, null, null],
  ['t-close', 2, 'Walk-in cooler temp (probe product)', 'Must be 41°F or below', 'temp', true, null, 41, '°F', null, null],
  ['t-close', 3, 'Reach-in / cold rail temp', 'Must be 41°F or below', 'temp', true, null, 41, '°F', null, null],
  ['t-close', 4, 'Freezer temp', 'Must be 0°F or below', 'temp', true, null, 0, '°F', null, null],
  ['t-close', 5, 'Discard log: anything thrown out tonight', null, 'comment', false, null, null, null, null, null],
  ['t-close', 6, 'Hot hold emptied and cleaned', null, 'yes_no', true, null, null, null, null, null],
  ['t-close', 7, 'Closer signature', null, 'signature', true, null, null, null, null, null],
];

export const DEMO_ITEMS: ChecklistItem[] = rows.map(([template_id, position, label, help, type, required, min_value, max_value, unit, options, fail_options]) => ({
  id: `${template_id}-i${position}`, template_id, position, label, help, type, required, min_value, max_value, unit, options, fail_options,
}));

const S = (id: string, template_id: string, label: string | null, window_start: string, window_end: string): ChecklistSchedule =>
  ({ id, template_id, location_id: null, label, days: [0, 1, 2, 3, 4, 5, 6], window_start, window_end, active: true });

export const DEMO_SCHEDULES: ChecklistSchedule[] = [
  S('s-open', 't-open', null, '09:00:00', '11:00:00'),
  S('s-line-am', 't-line', 'AM', '10:00:00', '11:00:00'),
  S('s-line-pm', 't-line', 'PM', '14:00:00', '15:00:00'),
  S('s-recv', 't-recv', null, '06:00:00', '22:00:00'),
  S('s-cool', 't-cool', null, '06:00:00', '23:59:00'),
  S('s-close', 't-close', null, '21:00:00', '23:59:00'),
];
