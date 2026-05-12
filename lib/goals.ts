import { createClient } from '@/lib/supabase/client';
import { dateStr } from '@/lib/utils';
import type { Goal, GoalWithHabits, Habit, HabitWithRate } from '@/lib/types';

// ─── Read ──────────────────────────────────────────────────────────────────────

export async function fetchGoals(userId: string): Promise<GoalWithHabits[]> {
  const supabase = createClient();
  const since = dateStr(30);

  const [{ data: goals, error: ge }, { data: links, error: le }, { data: habits, error: he }, { data: logs, error: lge }] =
    await Promise.all([
      supabase.from('goals').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('goal_habits').select('goal_id, habit_id'),
      supabase.from('habits').select('*').eq('user_id', userId),
      supabase.from('habit_logs').select('habit_id, completed_at').eq('user_id', userId).gte('completed_at', since),
    ]);

  if (ge) throw ge;
  if (le) throw le;
  if (he) throw he;
  if (lge) throw lge;

  const habitMap = new Map<string, Habit>((habits ?? []).map(h => [h.id, h as Habit]));

  const logsByHabit = new Map<string, Set<string>>();
  for (const log of logs ?? []) {
    if (!logsByHabit.has(log.habit_id)) logsByHabit.set(log.habit_id, new Set());
    logsByHabit.get(log.habit_id)!.add(log.completed_at);
  }

  return (goals ?? []).map(goal => {
    const linkedIds = (links ?? []).filter(l => l.goal_id === goal.id).map(l => l.habit_id);
    const linkedHabits = linkedIds
      .map(id => habitMap.get(id))
      .filter(Boolean)
      .map(h => {
        const done = logsByHabit.get(h!.id)?.size ?? 0;
        const rate = Math.min(100, Math.round((done / 30) * 100));
        return { ...h!, completionRate: rate } as HabitWithRate;
      });

    const completionRate = linkedHabits.length > 0
      ? Math.round(linkedHabits.reduce((a, h) => a + h.completionRate, 0) / linkedHabits.length)
      : 0;

    return { ...goal, habits: linkedHabits, completionRate } as GoalWithHabits;
  });
}

// ─── Write ─────────────────────────────────────────────────────────────────────

export async function createGoal(values: Omit<Goal, 'id' | 'created_at'>): Promise<Goal> {
  const supabase = createClient();
  const { data, error } = await supabase.from('goals').insert(values).select().single();
  if (error) throw error;
  return data as Goal;
}

export async function updateGoal(id: string, updates: Partial<Omit<Goal, 'id' | 'created_at'>>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('goals').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteGoal(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('goals').delete().eq('id', id);
  if (error) throw error;
}

export async function setGoalHabits(goalId: string, habitIds: string[]): Promise<void> {
  const supabase = createClient();
  await supabase.from('goal_habits').delete().eq('goal_id', goalId);
  if (habitIds.length === 0) return;
  const { error } = await supabase.from('goal_habits').insert(habitIds.map(habit_id => ({ goal_id: goalId, habit_id })));
  if (error) throw error;
}
