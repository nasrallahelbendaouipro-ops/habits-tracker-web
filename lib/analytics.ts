import type { HabitWithStreak, HabitLog, DimensionScores } from '@/lib/types';

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
