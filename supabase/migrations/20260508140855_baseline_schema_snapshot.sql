-- Baseline schema snapshot.
--
-- This is a RECONSTRUCTED baseline, not the literal original migration SQL.
-- The 17 migrations that actually built this schema (2026-05-08 through
-- 2026-06-19) existed only in the live Supabase project, never in git.
-- Reconstructing their exact original incremental SQL has no value for an
-- app that was not yet in production, so instead this single file captures
-- the schema as it stood immediately before the 2026-07-07 security/perf
-- fixes (see the migrations immediately following this one, timestamped
-- 20260707171357 onward, which are the literal SQL that was actually run).
--
-- From this point forward: every `apply_migration` call must be paired with
-- a same-named file added here in the same commit. See CLAUDE.md's
-- "Database migrations" section.

-- ============================================================================
-- Tables
-- ============================================================================

create table public.habits (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default '💪'::text,
  color text not null default '#6C63FF'::text,
  frequency text not null default 'daily'::text,
  target_days integer[] not null default '{}'::integer[],
  created_at timestamptz not null default now(),
  type text not null default 'simple'::text,
  metadata jsonb not null default '{}'::jsonb,
  dimension text not null default 'body'::text,
  calendar_start_time text,
  calendar_duration_min integer,
  calendar_overrides jsonb default '{}'::jsonb
);

create table public.habit_logs (
  id uuid not null default gen_random_uuid() primary key,
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  completed_at date not null,
  log_data jsonb not null default '{}'::jsonb,
  unique (habit_id, completed_at)
);
create index habit_logs_habit_id_idx on public.habit_logs (habit_id);
create index habit_logs_user_id_idx on public.habit_logs (user_id);
create index habit_logs_completed_at_idx on public.habit_logs (completed_at);

create table public.calendar_events (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  type text not null default 'event'::text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  color text not null default '#6C63FF'::text,
  notes text,
  source text not null default 'manual'::text,
  google_event_id text unique,
  created_at timestamptz not null default now(),
  linked_habit_ids uuid[] not null default '{}'::uuid[],
  linked_routine_ids text[] not null default '{}'::text[]
);
create index calendar_events_user_id_idx on public.calendar_events (user_id);
create index calendar_events_start_at_idx on public.calendar_events (start_at);

create table public.goals (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  description text,
  icon text default '🎯'::text,
  color text default '#6C63FF'::text,
  deadline date not null,
  created_at timestamptz default now(),
  dimension text not null default 'body'::text,
  starting_point numeric,
  target_point numeric,
  current_value numeric,
  unit text
);

create table public.goal_habits (
  id uuid not null default gen_random_uuid() primary key,
  goal_id uuid references public.goals(id) on delete cascade,
  habit_id uuid references public.habits(id) on delete cascade,
  unique (goal_id, habit_id)
);

create table public.goal_value_history (
  id uuid not null default gen_random_uuid() primary key,
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  value numeric not null,
  recorded_at date not null default current_date,
  created_at timestamptz default now()
);

create table public.daily_checkins (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id),
  date date not null,
  body_metrics jsonb not null default '{}'::jsonb,
  mind_metrics jsonb not null default '{}'::jsonb,
  soul_metrics jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz default now(),
  morning_data jsonb default '{}'::jsonb,
  evening_data jsonb default '{}'::jsonb,
  unique (user_id, date)
);

create table public.google_tokens (
  user_id uuid not null references auth.users(id) on delete cascade primary key,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  last_synced_at timestamptz,
  created_at timestamptz default now()
);

-- Dead table: not referenced anywhere in lib/ or app/ (only google_tokens is
-- actively used by lib/google-calendar.ts). Kept for now; see Phase 7 note
-- to drop it in a dedicated follow-up once confirmed safe.
create table public.google_cal_tokens (
  user_id uuid not null references auth.users(id) on delete cascade primary key,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create table public.health_sync_tokens (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade unique,
  token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  last_used timestamptz
);

create table public.health_readings (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  synced_at timestamptz not null default now(),
  steps integer,
  active_calories numeric(10,2),
  weight_kg numeric(5,2),
  sleep_hours numeric(4,2),
  heart_rate_avg integer,
  hrv numeric(5,2)
);
create index health_readings_user_time on public.health_readings (user_id, synced_at desc);

create table public.routines (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id),
  name text not null,
  category text not null default 'sport'::text,
  icon text,
  color text,
  schedule_days integer[] default '{}'::integer[],
  tasks jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  weekly_target_hours numeric(5,2) not null default 0,
  priority text check (priority = any (array['high'::text, 'medium'::text, 'low'::text]))
);

create table public.goal_routines (
  goal_id uuid not null references public.goals(id) on delete cascade,
  routine_id uuid not null references public.routines(id) on delete cascade,
  primary key (goal_id, routine_id)
);

create table public.routine_sessions (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id),
  routine_id uuid not null references public.routines(id) on delete cascade,
  date date not null,
  completed_task_ids text[] default '{}'::text[],
  completed_at timestamptz,
  exercise_progress jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  paused_at timestamptz,
  pause_duration_seconds integer not null default 0,
  actual_duration_seconds integer,
  calendar_event_id uuid references public.calendar_events(id) on delete set null
);
create index routine_sessions_calendar_event_id_idx on public.routine_sessions (calendar_event_id) where calendar_event_id is not null;
create unique index routine_sessions_event_unique on public.routine_sessions (user_id, routine_id, calendar_event_id) where calendar_event_id is not null;
create unique index routine_sessions_legacy_unique on public.routine_sessions (user_id, routine_id, date) where calendar_event_id is null;

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.calendar_events enable row level security;
alter table public.goals enable row level security;
alter table public.goal_habits enable row level security;
alter table public.goal_value_history enable row level security;
alter table public.daily_checkins enable row level security;
alter table public.google_tokens enable row level security;
alter table public.google_cal_tokens enable row level security;
alter table public.health_sync_tokens enable row level security;
alter table public.health_readings enable row level security;
alter table public.routines enable row level security;
alter table public.goal_routines enable row level security;
alter table public.routine_sessions enable row level security;

-- Original policies as they existed pre-2026-07-07 (bare auth.uid(), and a
-- duplicate permissive policy on goal_routines). See the
-- dedupe_and_optimize_rls_policies migration below for the corrected versions.

create policy "Users manage own habits" on public.habits for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own logs" on public.habit_logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own events" on public.calendar_events for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own tokens" on public.google_cal_tokens for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own tokens" on public.google_tokens for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own goals" on public.goals for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own goal_habits" on public.goal_habits for all
  using (exists (select 1 from public.goals where goals.id = goal_habits.goal_id and goals.user_id = auth.uid()));

create policy "users manage own checkins" on public.daily_checkins for all
  using (auth.uid() = user_id);

create policy "users manage own goal history" on public.goal_value_history for all
  using (auth.uid() = user_id);

create policy "Users manage own token" on public.health_sync_tokens for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users own their readings" on public.health_readings for all
  using (auth.uid() = user_id);

create policy "Users manage own routines" on public.routines for all
  using (auth.uid() = user_id);

create policy "Users manage own routine sessions" on public.routine_sessions for all
  using (auth.uid() = user_id);

create policy "Users manage own goal_routines" on public.goal_routines for all
  using (goal_id in (select goals.id from public.goals where goals.user_id = auth.uid()))
  with check (goal_id in (select goals.id from public.goals where goals.user_id = auth.uid()));

create policy "Users can manage their own goal_routines" on public.goal_routines for all
  using (goal_id in (select goals.id from public.goals where goals.user_id = auth.uid()))
  with check (goal_id in (select goals.id from public.goals where goals.user_id = auth.uid()));

-- ============================================================================
-- Functions
-- ============================================================================

-- Originally callable by anon/authenticated via PostgREST with no ownership
-- check on p_user_id (SECURITY DEFINER + default PUBLIC execute grant). See
-- the revoke_public_exec_upsert_health_reading and
-- revoke_public_role_exec_upsert_health_reading migrations below for the fix.
create function public.upsert_health_reading(
  p_user_id uuid,
  p_steps_total integer,
  p_calories_total integer,
  p_sleep_hours numeric,
  p_heart_rate integer,
  p_hrv numeric,
  p_weight_kg numeric
) returns json
language plpgsql
security definer
as $$
DECLARE
  v_today    TIMESTAMPTZ := DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC');
  v_sum_st   INTEGER     := 0;
  v_sum_ac   INTEGER     := 0;
  v_delta_st  INTEGER;
  v_delta_ac  INTEGER;
BEGIN
  -- Per-user transaction-level advisory lock: serialises concurrent calls.
  PERFORM pg_advisory_xact_lock(('x' || md5(p_user_id::text))::bit(64)::bigint);

  SELECT COALESCE(SUM(steps), 0), COALESCE(SUM(active_calories), 0)
    INTO v_sum_st, v_sum_ac
    FROM health_readings
   WHERE user_id = p_user_id AND synced_at >= v_today;

  IF p_steps_total    IS NOT NULL THEN v_delta_st := GREATEST(0, p_steps_total    - v_sum_st); END IF;
  IF p_calories_total IS NOT NULL THEN v_delta_ac := GREATEST(0, p_calories_total - v_sum_ac); END IF;

  IF  COALESCE(v_delta_st, 0) > 0
   OR COALESCE(v_delta_ac, 0) > 0
   OR p_sleep_hours IS NOT NULL
   OR p_heart_rate  IS NOT NULL
   OR p_hrv         IS NOT NULL
   OR p_weight_kg   IS NOT NULL
  THEN
    INSERT INTO health_readings
      (user_id, steps, active_calories, sleep_hours, heart_rate_avg, hrv, weight_kg)
    VALUES
      (p_user_id,
       NULLIF(COALESCE(v_delta_st, 0), 0),
       NULLIF(COALESCE(v_delta_ac, 0), 0),
       p_sleep_hours, p_heart_rate, p_hrv, p_weight_kg);
  END IF;

  RETURN json_build_object('steps', v_delta_st, 'active_calories', v_delta_ac);
END;
$$;
