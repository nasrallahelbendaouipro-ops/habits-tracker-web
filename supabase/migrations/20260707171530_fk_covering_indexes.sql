create index if not exists goals_user_id_idx on public.goals (user_id);
create index if not exists routines_user_id_idx on public.routines (user_id);
create index if not exists goal_habits_habit_id_idx on public.goal_habits (habit_id);
create index if not exists goal_routines_routine_id_idx on public.goal_routines (routine_id);
create index if not exists goal_value_history_goal_id_idx on public.goal_value_history (goal_id);
create index if not exists goal_value_history_user_id_idx on public.goal_value_history (user_id);
create index if not exists routine_sessions_routine_id_idx on public.routine_sessions (routine_id);
