import { createClient } from '@/lib/supabase/client';
import { dateStr } from '@/lib/utils';
import type { Goal, GoalWithHabits, GoalWithLinked, Habit, HabitWithRate, Routine } from '@/lib/types';

function sessionSeconds(s: { started_at: string | null; completed_at?: string | null; pause_duration_seconds: number }): number {
  if (!s.started_at || !s.completed_at) return 0;
  return Math.max(0, Math.floor((+new Date(s.completed_at) - +new Date(s.started_at)) / 1000) - (s.pause_duration_seconds ?? 0));
}

// ─── Read ──────────────────────────────────────────────────────────────────────

export async function fetchGoals(userId: string): Promise<GoalWithLinked[]> {
  const supabase = createClient();
  const since = dateStr(30);

  const [
    { data: goals, error: ge },
    { data: links, error: le },
    { data: habits, error: he },
    { data: logs, error: lge },
    { data: goalRoutineLinks, error: grle },
    { data: routines, error: re },
    { data: sessions, error: se },
  ] = await Promise.all([
    supabase.from('goals').select('*').eq('user_id', userId).order('created_at'),
    supabase.from('goal_habits').select('goal_id, habit_id'),
    supabase.from('habits').select('*').eq('user_id', userId),
    supabase.from('habit_logs').select('habit_id, completed_at').eq('user_id', userId).gte('completed_at', since),
    supabase.from('goal_routines').select('goal_id, routine_id'),
    supabase.from('routines').select('*').eq('user_id', userId),
    supabase.from('routine_sessions')
      .select('routine_id, started_at, completed_at, pause_duration_seconds')
      .eq('user_id', userId)
      .not('completed_at', 'is', null),
  ]);

  if (ge) throw ge;
  if (le) throw le;
  if (he) throw he;
  if (lge) throw lge;
  // goal_routines / routines / sessions errors are non-fatal — degrade gracefully

  const habitMap = new Map<string, Habit>((habits ?? []).map(h => [h.id, h as Habit]));
  const routineMap = new Map<string, Routine>((routines ?? []).map(r => [r.id, r as Routine]));

  const logsByHabit = new Map<string, Set<string>>();
  for (const log of logs ?? []) {
    if (!logsByHabit.has(log.habit_id)) logsByHabit.set(log.habit_id, new Set());
    logsByHabit.get(log.habit_id)!.add(log.completed_at);
  }

  const sessionSecsByRoutine = new Map<string, number>();
  for (const s of sessions ?? []) {
    const secs = sessionSeconds(s as { started_at: string | null; completed_at?: string | null; pause_duration_seconds: number });
    sessionSecsByRoutine.set(s.routine_id, (sessionSecsByRoutine.get(s.routine_id) ?? 0) + secs);
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

    const linkedRoutineIds = (goalRoutineLinks ?? [])
      .filter(l => l.goal_id === goal.id)
      .map(l => l.routine_id);
    const linkedRoutines = linkedRoutineIds.map(id => routineMap.get(id)).filter(Boolean) as Routine[];
    const totalTimeSeconds = linkedRoutineIds.reduce((acc, id) => acc + (sessionSecsByRoutine.get(id) ?? 0), 0);

    return { ...goal, habits: linkedHabits, completionRate, routines: linkedRoutines, totalTimeSeconds } as GoalWithLinked;
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

export async function setGoalRoutines(goalId: string, routineIds: string[]): Promise<void> {
  const supabase = createClient();
  await supabase.from('goal_routines').delete().eq('goal_id', goalId);
  if (routineIds.length === 0) return;
  const { error } = await supabase.from('goal_routines').insert(
    routineIds.map(routine_id => ({ goal_id: goalId, routine_id }))
  );
  if (error) throw error;
}
