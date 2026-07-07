-- goal_routines: drop duplicate, rewrite survivor
drop policy if exists "Users manage own goal_routines" on public.goal_routines;
drop policy if exists "Users can manage their own goal_routines" on public.goal_routines;
create policy "Users manage own goal_routines" on public.goal_routines
  for all
  using (goal_id in (select goals.id from public.goals where goals.user_id = (select auth.uid())))
  with check (goal_id in (select goals.id from public.goals where goals.user_id = (select auth.uid())));

drop policy if exists "Users manage own habits" on public.habits;
create policy "Users manage own habits" on public.habits for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own logs" on public.habit_logs;
create policy "Users manage own logs" on public.habit_logs for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own events" on public.calendar_events;
create policy "Users manage own events" on public.calendar_events for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own tokens" on public.google_cal_tokens;
create policy "Users manage own tokens" on public.google_cal_tokens for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own tokens" on public.google_tokens;
create policy "Users manage own tokens" on public.google_tokens for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own goals" on public.goals;
create policy "Users manage own goals" on public.goals for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own goal_habits" on public.goal_habits;
create policy "Users manage own goal_habits" on public.goal_habits for all
  using (exists (select 1 from public.goals where goals.id = goal_habits.goal_id and goals.user_id = (select auth.uid())));

drop policy if exists "users manage own checkins" on public.daily_checkins;
create policy "users manage own checkins" on public.daily_checkins for all
  using ((select auth.uid()) = user_id);

drop policy if exists "users manage own goal history" on public.goal_value_history;
create policy "users manage own goal history" on public.goal_value_history for all
  using ((select auth.uid()) = user_id);

drop policy if exists "Users manage own token" on public.health_sync_tokens;
create policy "Users manage own token" on public.health_sync_tokens for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "users own their readings" on public.health_readings;
create policy "users own their readings" on public.health_readings for all
  using ((select auth.uid()) = user_id);

drop policy if exists "Users manage own routines" on public.routines;
create policy "Users manage own routines" on public.routines for all
  using ((select auth.uid()) = user_id);

drop policy if exists "Users manage own routine sessions" on public.routine_sessions;
create policy "Users manage own routine sessions" on public.routine_sessions for all
  using ((select auth.uid()) = user_id);
