# Food Safety Checklists (tablet-first, no equipment sensors)

Guided, timestamped, photo-backed line checks on a tablet. Paperless HACCP.

## Where it lives in the app
More tab → **Food Safety Checklists** (`/checklists`)

| Screen | Who | What |
|---|---|---|
| `/checklists` | Everyone | Today's lists, color status, station filter, offline indicator |
| `/checklists/run/[id]` | Everyone | Fill a list. Out-of-range temps block the next item until a corrective action is saved |
| `/checklists/manager` | Manager, GM, Corporate | Who's late, completion %, failures, inspector PDF/CSV export |
| `/checklists/builder` | GM, Corporate | Edit lists, items, temp ranges, time windows per store |

## Status colors
Not due (gray) · Due now (blue) · In progress (amber) · Late (red) · Complete (green)

## Day-one lists (seeded)
1. Opening — sanitizer, hand sinks, walk-in / reach-in / freezer temps, date labels, signature
2. Line Check AM (10–11) and PM (2–3) — patty ≥155°F, hot hold ≥135°F, cold rail ≤41°F, shake base ≤41°F, fryer oil
3. Receiving — truck and case temps, packaging, invoice photo, signature
4. Cooling Log — 135°F start → ≤70°F at 2 hrs → ≤41°F at 6 hrs
5. Closing — covers, temps, discard log, signature

## Rules built in
- Every answer is stamped with who and when
- A failed reading (temp, No, or a "fail" choice) must get a corrective action before the list can continue
- Completed lists are locked. A manager can unlock with a written reason; the database rejects any change without one and logs it to `checklist_audit_log`
- Works offline. Answers save on the tablet and upload when Wi-Fi is back
- Reminders on the tablet when a list opens and 15 minutes before it is late

## One-time setup
1. Supabase project → SQL Editor → paste and run `supabase/migrations/20260922000000_food_safety_checklists.sql`
2. Add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` to EAS / `.env`
3. Sign up each user in the app, then set `role` (`crew`, `manager`, `gm`, `corporate`) and `location_id` in the `users` table

## Later (not built yet)
- Bluetooth probe pairing (V1.1)
- Timed cooling pings between checkpoints (V1.1)
- Server-side push when a list is missed (V1.1)
- Completion heatmaps (V1.2)
- Equipment sensors (separate product)
