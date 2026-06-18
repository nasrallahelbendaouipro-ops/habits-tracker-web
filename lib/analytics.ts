import { createClient } from '@/lib/supabase/client';
import type { HabitWithStreak, HabitLog, DimensionScores, Routine, RoutineSession } from '@/lib/types';
import { computeSetProgress, countTrackableTasks } from '@/lib/routines';

// ─── Heatmap ───────────────────────────────────────────────────────────────────
// Returns a Map<YYYY-MM-DD, count> of completions across all habits

export function dailyCompletionMap(logs: HabitLog[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const log of logs) {
    map.set(log.completed_at, (map.get(log.completed_at) ?? 0) + 1);
  }
  return map;
}

// ─── Discipline score (0–100) ──────────────────────────────────────────────────
// Weighted average of completion rate (75%) + streak bonus (25%) per habit

export function calcDisciplineScore(
  habits: HabitWithStreak[],
  logs: HabitLog[],
  days = 30
): number {
  if (!habits.length) return 0;
  const cutoff = (() => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  })();
  const recent = logs.filter(l => l.completed_at >= cutoff);
  let total = 0;
  for (const h of habits) {
    const done = recent.filter(l => l.habit_id === h.id).length;
    const rate = done / days;
    const bonus = Math.min(h.streak * 2, 25);
    total += Math.min(rate * 75 + bonus, 100);
  }
  return Math.round(total / habits.length);
}

// ─── Per-dimension discipline scores ──────────────────────────────────────────

export function calcDimensionScores(
  habits: HabitWithStreak[],
  logs: HabitLog[],
  days = 30
): DimensionScores {
  const body  = habits.filter(h => h.dimension === 'body');
  const mind  = habits.filter(h => h.dimension === 'mind');
  const soul  = habits.filter(h => h.dimension === 'soul');
  return {
    body: calcDisciplineScore(body, logs, days),
    mind: calcDisciplineScore(mind, logs, days),
    soul: calcDisciplineScore(soul, logs, days),
  };
}

// ─── Weekly totals for bar chart ───────────────────────────────────────────────
// Returns last N weeks as { label, pct } objects, oldest first

export function weeklyTotals(
  habits: HabitWithStreak[],
  logs: HabitLog[],
  weeks = 8
): { label: string; pct: number }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const results: { label: string; pct: number }[] = [];

  for (let w = weeks - 1; w >= 0; w--) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() - w * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const label = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const done = logs.filter(l => {
      const d = new Date(l.completed_at + 'T00:00:00');
      return d >= weekStart && d <= weekEnd;
    }).length;
    const possible = habits.length * 7;
    results.push({ label, pct: possible > 0 ? Math.round((done / possible) * 100) : 0 });
  }

  return results;
}

// ─── Per-habit 30-day completion rate ──────────────────────────────────────────

export function habitCompletionRate(habitId: string, logs: HabitLog[], days = 30): number {
  const cutoff = (() => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  })();
  const done = logs.filter(l => l.habit_id === habitId && l.completed_at >= cutoff).length;
  return Math.round((done / days) * 100);
}

// ─── Routine completion stats ──────────────────────────────────────────────────

export type RoutineStat = {
  routineId: string;
  name: string;
  category: string;
  icon?: string;
  color?: string;
  avgCompletionPct: number;
  plannedMinutes: number;
  avgActualMinutes: number | null;
};

export async function fetchRoutineCompletionStats(userId: string, days = 30): Promise<RoutineStat[]> {
  const supabase = createClient();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split('T')[0];

  const [routinesRes, sessionsRes] = await Promise.all([
    supabase.from('routines').select('*').eq('user_id', userId),
    supabase.from('routine_sessions').select('*').eq('user_id', userId).gte('date', sinceStr),
  ]);

  const routines = (routinesRes.data ?? []) as Routine[];
  const sessions = (sessionsRes.data ?? []) as RoutineSession[];

  const grouped = new Map<string, RoutineSession[]>();
  for (const s of sessions) {
    if (!grouped.has(s.routine_id)) grouped.set(s.routine_id, []);
    grouped.get(s.routine_id)!.push(s);
  }

  const results: RoutineStat[] = [];
  for (const routine of routines) {
    const routineSessions = grouped.get(routine.id) ?? [];
    if (!routineSessions.length) continue;

    const pcts = routineSessions.map(session => {
      if (routine.category === 'sport') {
        const { totalSets, doneSets } = computeSetProgress(routine, session);
        return totalSets > 0 ? (doneSets / totalSets) * 100 : 0;
      }
      const trackable = countTrackableTasks(routine.tasks);
      return trackable > 0 ? (session.completed_task_ids.length / trackable) * 100 : 0;
    });

    const avgCompletionPct = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
    const plannedMinutes = routine.category !== 'sport'
      ? routine.tasks.reduce((n, t) => n + (t.duration_min ?? 0), 0)
      : 0;

    const withDuration = routineSessions.filter(s => s.actual_duration_seconds != null && s.actual_duration_seconds > 0);
    const avgActualMinutes = withDuration.length > 0
      ? Math.round(withDuration.reduce((n, s) => n + (s.actual_duration_seconds! / 60), 0) / withDuration.length)
      : null;

    results.push({
      routineId: routine.id,
      name: routine.name,
      category: routine.category,
      icon: routine.icon,
      color: routine.color,
      avgCompletionPct,
      plannedMinutes,
      avgActualMinutes,
    });
  }

  return results.sort((a, b) => b.avgCompletionPct - a.avgCompletionPct);
}

// ─── Daily metrics history for personal trends ─────────────────────────────────

export type DailyMetricPoint = {
  date: string;
  weight?: number;
  energy?: number;
  sleep_quality?: number;
  mood?: number;
  sleep_hours?: number;
};

export async function fetchDailyMetricsHistory(userId: string, days = 30): Promise<DailyMetricPoint[]> {
  const supabase = createClient();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split('T')[0];

  const { data } = await supabase
    .from('daily_checkins')
    .select('date, body_metrics, mind_metrics')
    .eq('user_id', userId)
    .gte('date', sinceStr)
    .order('date', { ascending: true });

  return (data ?? []).map((row: { date: string; body_metrics: Record<string, unknown>; mind_metrics: Record<string, unknown> }) => ({
    date: row.date,
    weight: (row.body_metrics as { weight?: number })?.weight,
    mood: (row.body_metrics as { mood?: number })?.mood,
    sleep_hours: (row.body_metrics as { sleep_hours?: number })?.sleep_hours,
    energy: (row.mind_metrics as { energy?: number })?.energy,
    sleep_quality: (row.mind_metrics as { sleep_quality?: number })?.sleep_quality,
  }));
}
