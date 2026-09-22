-- =====================================================================
-- Patty Shack — Food Safety Checklists (tablet-first, no equipment sensors)
-- Safe to run on a brand-new Supabase project. Re-runnable.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Base tables the app already expects ----------
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null default '',
  city text not null default '',
  state text not null default '',
  phone text,
  manager_id uuid,
  timezone text not null default 'America/Denver',
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null default '',
  role text not null default 'crew' check (role in ('crew','manager','gm','corporate')),
  location_id uuid references public.locations(id),
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Auto-create a crew profile when someone signs up
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, name, role, location_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    'crew',
    (select id from public.locations order by created_at limit 1)
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Checklist tables ----------
create table if not exists public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'line_check'
    check (category in ('opening','closing','shift_change','line_check','receiving','cleaning','self_audit','foh','cooling')),
  station text not null default 'all',   -- all | grill | fryer | shake | cold_line | front | back
  description text,
  requires_signoff boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.checklist_templates(id) on delete cascade,
  position int not null default 0,
  label text not null,
  help text,
  type text not null check (type in ('yes_no','choice','number','temp','photo','comment','signature')),
  required boolean not null default true,
  min_value numeric,
  max_value numeric,
  unit text,
  options jsonb,                           -- choice items: ["Good","Fair","Change oil"]
  fail_options jsonb,                      -- choice items that count as a fail
  created_at timestamptz not null default now()
);
create index if not exists checklist_items_template_idx on public.checklist_items(template_id, position);

create table if not exists public.checklist_schedules (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.checklist_templates(id) on delete cascade,
  location_id uuid references public.locations(id) on delete cascade,  -- null = every store
  label text,                                                           -- "AM", "PM"
  days int[] not null default '{0,1,2,3,4,5,6}',                        -- 0 = Sunday
  window_start time not null,
  window_end time not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.checklist_runs (
  id uuid primary key,                      -- generated on the tablet (offline-safe)
  template_id uuid not null references public.checklist_templates(id),
  schedule_id uuid references public.checklist_schedules(id) on delete set null,
  location_id uuid not null references public.locations(id),
  run_date date not null,
  window_start time,
  window_end time,
  status text not null default 'in_progress' check (status in ('in_progress','complete')),
  started_by uuid references public.users(id),
  started_at timestamptz not null default now(),
  completed_by uuid references public.users(id),
  completed_at timestamptz,
  signoff_by uuid references public.users(id),
  signoff_at timestamptz,
  signoff_note text,
  updated_at timestamptz not null default now()
);
create index if not exists checklist_runs_loc_date_idx on public.checklist_runs(location_id, run_date);

create table if not exists public.checklist_responses (
  id uuid primary key,                      -- generated on the tablet
  run_id uuid not null references public.checklist_runs(id) on delete cascade,
  item_id uuid not null references public.checklist_items(id),
  value text,
  numeric_value numeric,
  passed boolean,
  is_na boolean not null default false,
  photo_url text,
  comment text,
  corrective_action text,
  corrective_note text,
  corrective_photo_url text,
  recorded_by uuid references public.users(id),
  recorded_at timestamptz not null default now(),
  edited_note text,
  updated_at timestamptz not null default now(),
  unique (run_id, item_id)
);
create index if not exists checklist_responses_run_idx on public.checklist_responses(run_id);

-- ---------- Audit trail: no silent edits to finished lists ----------
create table if not exists public.checklist_audit_log (
  id bigserial primary key,
  response_id uuid,
  run_id uuid,
  changed_by uuid,
  changed_at timestamptz not null default now(),
  old_value jsonb,
  new_value jsonb,
  note text
);

create or replace function public.checklist_guard_edits() returns trigger
language plpgsql as $$
declare run_status text;
begin
  select status into run_status from public.checklist_runs where id = new.run_id;
  if tg_op = 'UPDATE' and run_status = 'complete' then
    if (to_jsonb(new) - 'updated_at' - 'edited_note') is distinct from (to_jsonb(old) - 'updated_at' - 'edited_note') then
      if new.edited_note is null or new.edited_note = coalesce(old.edited_note,'') then
        raise exception 'This list is complete. A manager note is required to change it.';
      end if;
      insert into public.checklist_audit_log(response_id, run_id, changed_by, old_value, new_value, note)
      values (new.id, new.run_id, auth.uid(), to_jsonb(old), to_jsonb(new), new.edited_note);
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists checklist_responses_guard on public.checklist_responses;
create trigger checklist_responses_guard before update on public.checklist_responses
  for each row execute function public.checklist_guard_edits();

-- ---------- Row level security ----------
alter table public.locations enable row level security;
alter table public.users enable row level security;
alter table public.checklist_templates enable row level security;
alter table public.checklist_items enable row level security;
alter table public.checklist_schedules enable row level security;
alter table public.checklist_runs enable row level security;
alter table public.checklist_responses enable row level security;
alter table public.checklist_audit_log enable row level security;

create or replace function public.is_manager() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where id = auth.uid() and role in ('manager','gm','corporate'));
$$;
create or replace function public.is_hq() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where id = auth.uid() and role in ('gm','corporate'));
$$;

do $$
declare t text;
begin
  -- everyone signed in can read
  foreach t in array array['locations','users','checklist_templates','checklist_items','checklist_schedules','checklist_runs','checklist_responses']
  loop
    execute format('drop policy if exists "read_%1$s" on public.%1$s', t);
    execute format('create policy "read_%1$s" on public.%1$s for select to authenticated using (true)', t);
  end loop;
  -- HQ owns templates, items, schedules, locations
  foreach t in array array['locations','checklist_templates','checklist_items','checklist_schedules']
  loop
    execute format('drop policy if exists "hq_write_%1$s" on public.%1$s', t);
    execute format('create policy "hq_write_%1$s" on public.%1$s for all to authenticated using (public.is_hq()) with check (public.is_hq())', t);
  end loop;
end $$;

drop policy if exists "crew_write_runs" on public.checklist_runs;
create policy "crew_write_runs" on public.checklist_runs for all to authenticated using (true) with check (true);
drop policy if exists "crew_write_responses" on public.checklist_responses;
create policy "crew_write_responses" on public.checklist_responses for all to authenticated using (true) with check (true);
drop policy if exists "self_update_user" on public.users;
create policy "self_update_user" on public.users for update to authenticated using (id = auth.uid() or public.is_hq());
drop policy if exists "mgr_read_audit" on public.checklist_audit_log;
create policy "mgr_read_audit" on public.checklist_audit_log for select to authenticated using (public.is_manager());

-- ---------- Photo storage ----------
insert into storage.buckets (id, name, public) values ('checklist-photos','checklist-photos', true)
on conflict (id) do nothing;
drop policy if exists "checklist_photos_upload" on storage.objects;
create policy "checklist_photos_upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'checklist-photos');
drop policy if exists "checklist_photos_read" on storage.objects;
create policy "checklist_photos_read" on storage.objects for select to authenticated
  using (bucket_id = 'checklist-photos');

-- ---------- Seed: locations (only if none exist) ----------
insert into public.locations (name, address, city, state, timezone)
select * from (values
  ('Taylorsville', '1207 W 4800 S', 'Taylorsville', 'UT', 'America/Denver'),
  ('Layton', '2056 N Hill Field Rd', 'Layton', 'UT', 'America/Denver'),
  ('Salt Lake City Kitchen', '23 N 900 W', 'Salt Lake City', 'UT', 'America/Denver'),
  ('Denver Kitchen', '810 N Vallejo St', 'Denver', 'CO', 'America/Denver')
) v(name, address, city, state, timezone)
where not exists (select 1 from public.locations);

-- ---------- Seed: the 5 day-one burger-shop lists (only if none exist) ----------
do $$
declare t_open uuid; t_line uuid; t_recv uuid; t_cool uuid; t_close uuid;
begin
  if exists (select 1 from public.checklist_templates) then return; end if;

  insert into public.checklist_templates (name, category, station, description, requires_signoff)
    values ('Opening Checklist','opening','all','Sanitizer, hand sinks, cooler spot-check, date labels', true) returning id into t_open;
  insert into public.checklist_templates (name, category, station, description, requires_signoff)
    values ('Line Check','line_check','all','Grill, fryer, hot hold, cold rail, shake product temps', true) returning id into t_line;
  insert into public.checklist_templates (name, category, station, description, requires_signoff)
    values ('Receiving','receiving','back','Truck and case temps. Reject anything out of spec.', false) returning id into t_recv;
  insert into public.checklist_templates (name, category, station, description, requires_signoff)
    values ('Cooling Log','cooling','back','Chili, soup, sauce: 135°F → 70°F in 2 hrs, → 41°F within 6 hrs total', true) returning id into t_cool;
  insert into public.checklist_templates (name, category, station, description, requires_signoff)
    values ('Closing Checklist','closing','all','Covers, temps, discard log, signature', true) returning id into t_close;

  insert into public.checklist_items (template_id, position, label, help, type, required, min_value, max_value, unit, options, fail_options) values
  (t_open,1,'Sanitizer buckets set up at correct strength','Test strip in range','yes_no',true,null,null,null,null,null),
  (t_open,2,'Sanitizer concentration (quat)','Target 200–400 ppm','number',true,200,400,'ppm',null,null),
  (t_open,3,'All hand sinks stocked (soap, towels) and unblocked',null,'yes_no',true,null,null,null,null,null),
  (t_open,4,'Walk-in cooler temp (probe product)','Must be 41°F or below','temp',true,null,41,'°F',null,null),
  (t_open,5,'Reach-in / cold rail temp','Must be 41°F or below','temp',true,null,41,'°F',null,null),
  (t_open,6,'Freezer temp','Must be 0°F or below','temp',true,null,0,'°F',null,null),
  (t_open,7,'All prepped product date-labeled and in date',null,'yes_no',true,null,null,null,null,null),
  (t_open,8,'Notes',null,'comment',false,null,null,null,null,null),
  (t_open,9,'Opener signature',null,'signature',true,null,null,null,null,null),

  (t_line,1,'Burger patty internal temp (off the grill)','Ground beef must reach 155°F','temp',true,155,null,'°F',null,null),
  (t_line,2,'Chicken internal temp','Must reach 165°F','temp',false,165,null,'°F',null,null),
  (t_line,3,'Fryer oil condition','Change if dark, foamy, or smoking','choice',true,null,null,null,'["Good","Fair","Change now"]','["Change now"]'),
  (t_line,4,'Hot hold temp (chili / cheese sauce)','Must be 135°F or above','temp',true,135,null,'°F',null,null),
  (t_line,5,'Cold rail product temp (tomato, lettuce, cheese)','Must be 41°F or below','temp',true,null,41,'°F',null,null),
  (t_line,6,'Shake base / shake fridge temp','Must be 41°F or below','temp',true,null,41,'°F',null,null),
  (t_line,7,'Grill station clean and organized',null,'yes_no',true,null,null,null,null,null),
  (t_line,8,'Photo of line',null,'photo',false,null,null,null,null,null),

  (t_recv,1,'Supplier / distributor',null,'comment',true,null,null,null,null,null),
  (t_recv,2,'Truck refrigerated compartment temp','Must be 41°F or below','temp',true,null,41,'°F',null,null),
  (t_recv,3,'Refrigerated case product temp (probe between packages)','Must be 41°F or below','temp',true,null,41,'°F',null,null),
  (t_recv,4,'Frozen product temp','Must be 0°F or below, no thaw signs','temp',false,null,0,'°F',null,null),
  (t_recv,5,'Packaging intact, no damage, no pests',null,'yes_no',true,null,null,null,null,null),
  (t_recv,6,'Photo of invoice',null,'photo',true,null,null,null,null,null),
  (t_recv,7,'Received by (signature)',null,'signature',true,null,null,null,null,null),

  (t_cool,1,'Product being cooled','Chili, soup, sauce…','comment',true,null,null,null,null,null),
  (t_cool,2,'Start temp','Cooling starts at 135°F or above','temp',true,135,null,'°F',null,null),
  (t_cool,3,'2-hour temp','Must be 70°F or below within 2 hours','temp',true,null,70,'°F',null,null),
  (t_cool,4,'6-hour temp','Must be 41°F or below within 6 hours total','temp',true,null,41,'°F',null,null),
  (t_cool,5,'Cooling method used',null,'choice',true,null,null,null,'["Ice bath","Shallow pans","Ice wand","Blast chill"]',null),

  (t_close,1,'All product covered, labeled, and dated',null,'yes_no',true,null,null,null,null,null),
  (t_close,2,'Walk-in cooler temp (probe product)','Must be 41°F or below','temp',true,null,41,'°F',null,null),
  (t_close,3,'Reach-in / cold rail temp','Must be 41°F or below','temp',true,null,41,'°F',null,null),
  (t_close,4,'Freezer temp','Must be 0°F or below','temp',true,null,0,'°F',null,null),
  (t_close,5,'Discard log: anything thrown out tonight',null,'comment',false,null,null,null,null,null),
  (t_close,6,'Hot hold emptied and cleaned',null,'yes_no',true,null,null,null,null,null),
  (t_close,7,'Closer signature',null,'signature',true,null,null,null,null,null);

  -- Default schedules for every store (edit in the list builder)
  insert into public.checklist_schedules (template_id, label, window_start, window_end) values
    (t_open,  null, '09:00','11:00'),
    (t_line,  'AM', '10:00','11:00'),
    (t_line,  'PM', '14:00','15:00'),
    (t_recv,  null, '06:00','22:00'),
    (t_cool,  null, '06:00','23:59'),
    (t_close, null, '21:00','23:59');
end $$;
