import { createClient } from '@/lib/supabase/client';
import type { Habit, HabitLog, HabitWithStreak, HabitFormValues, HabitType, HabitDimension } from '@/lib/types';
import { TODAY, dateStr } from '@/lib/utils';

// ─── Dimension defaults ────────────────────────────────────────────────────────

export const DIMENSION_DEFAULTS: Record<HabitType, HabitDimension> = {
  workout:     'body',
  shift:       'body',
  body_metric: 'body',
  simple:      'body',
  reading:     'mind',
  study:       'mind',
  meditation:  'soul',
  prayer:      'soul',
  journaling:  'soul',
};

export const DIMENSION_LABELS: Record<HabitDimension, string> = {
  body: 'Body',
  mind: 'Mind',
  soul: 'Soul',
};

export const DIMENSION_ICONS: Record<HabitDimension, string> = {
  body: '💪',
  mind: '🧠',
  soul: '✨',
};

// Timed types show a "Start Session" button; others are binary complete
export const TIMED_TYPES: HabitType[] = ['workout', 'reading', 'study', 'meditation', 'prayer'];

// ─── Read ──────────────────────────────────────────────────────────────────────

export async function fetchHabitsWithStatus(
  userId: string,
  forDate: string = TODAY,
  dimension?: HabitDimension
): Promise<HabitWithStreak[]> {
  const supabase = createClient();
  let habitQuery = supabase.from('habits').select('*').eq('user_id', userId).order('created_at');
  if (dimension) habitQuery = habitQuery.eq('dimension', dimension);

  const [{ data: habits, error: he }, { data: logs, error: le }] = await Promise.all([
    habitQuery,
    supabase.from('habit_logs').select('*').eq('user_id', userId).gte('completed_at', dateStr(90)),
  ]);
  if (he) throw he;
  if (le) throw le;
  if (!habits) return [];

  const logMap = new Map<string, Set<string>>();
  for (const log of logs ?? []) {
    if (!logMap.has(log.habit_id)) logMap.set(log.habit_id, new Set());
    logMap.get(log.habit_id)!.add(log.completed_at);
  }

  const forDateObj = new Date(forDate + 'T00:00:00');
  const dow = forDateObj.getDay() === 0 ? 7 : forDateObj.getDay(); // Mon=1…Sun=7

  return habits
    .filter(h => {
      if (h.frequency === 'daily' || !h.target_days?.length) return true;
      return h.target_days.includes(dow);
    })
    .map(h => {
      const dates = logMap.get(h.id) ?? new Set<string>();
      const completedToday = dates.has(forDate);
      let streak = 0;
      let day = completedToday ? 0 : 1;
      while (dates.has(dateStr(day))) { streak++; day++; }
      return { ...h, streak, completedToday } as HabitWithStreak;
    });
}

export async function fetchWeeklyLogs(userId: string, habitId?: string): Promise<HabitLog[]> {
  const supabase = createClient();
  let query = supabase
    .from('habit_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('completed_at', dateStr(28));
  if (habitId) query = query.eq('habit_id', habitId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// ─── Write ─────────────────────────────────────────────────────────────────────

export async function toggleHabit(
  habitId: string,
  userId: string,
  completedToday: boolean,
  date: string = TODAY,
  logData?: Record<string, unknown>
) {
  const supabase = createClient();
  if (completedToday) {
    const { error } = await supabase
      .from('habit_logs')
      .delete()
      .eq('habit_id', habitId)
      .eq('user_id', userId)
      .eq('completed_at', date);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('habit_logs')
      .insert({ habit_id: habitId, user_id: userId, completed_at: date, log_data: logData ?? {} });
    if (error) throw error;
  }
}

export async function createHabit(values: HabitFormValues & { user_id: string }): Promise<Habit> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('habits')
    .insert(values)
    .select()
    .single();
  if (error) throw error;
  return data as Habit;
}

export async function updateHabit(id: string, updates: Partial<HabitFormValues>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('habits').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteHabit(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('habits').delete().eq('id', id);
  if (error) throw error;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

export const HABIT_ICONS = ['💪', '📚', '🧘', '🏃', '💧', '🥗', '😴', '✍️', '🎯', '🎨', '🎵', '🧹', '💊', '🌿', '🛒', '💰', '🤸', '🧠', '🔥', '⚡'];
export const HABIT_COLORS = ['#6C63FF', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF8B94', '#A8E6CF', '#FFD3B6', '#FF6B35', '#2ECC71'];
