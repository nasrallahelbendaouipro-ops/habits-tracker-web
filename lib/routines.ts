import { createClient } from '@/lib/supabase/client';
import type { Routine, RoutineSession, RoutineWithSession, RoutineTask, ExerciseProgress } from '@/lib/types';
import { TODAY } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayDow(): number {
  return new Date().getDay(); // 0=Sun … 6=Sat
}

export function countTrackableTasks(tasks: RoutineTask[]): number {
  return tasks.filter(t => t.type !== 'resource').length;
}

export function countBilateralSlots(tasks: RoutineTask[]): number {
  return tasks.reduce((n, t) => n + (t.type === 'bilateral' ? 2 : t.type !== 'resource' ? 1 : 0), 0);
}

export function computeActiveSeconds(session: RoutineSession): number {
  if (!session.started_at) return 0;
  const startMs = new Date(session.started_at).getTime();
  const endMs   = session.paused_at ? new Date(session.paused_at).getTime() : Date.now();
  return Math.max(0, Math.floor((endMs - startMs) / 1000) - (session.pause_duration_seconds ?? 0));
}

export function computeSetProgress(routine: Routine, session: RoutineSession | null): { totalSets: number; doneSets: number } {
  const progress = session?.exercise_progress ?? {};
  let totalSets = 0, doneSets = 0;
  for (const task of routine.tasks) {
    if (task.type === 'resource') continue;
    const sets = task.sets ?? 1;
    totalSets += sets;
    doneSets  += Math.min(progress[task.id]?.completed_sets ?? 0, sets);
  }
  return { totalSets, doneSets };
}

// ─── Read ──────────────────────────────────────────────────────────────────────

export async function getRoutines(): Promise<Routine[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .order('created_at');
  if (error) throw error;
  return (data ?? []) as Routine[];
}

export async function getRoutine(id: string): Promise<Routine> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Routine;
}

export async function getTodaysRoutines(): Promise<RoutineWithSession[]> {
  const supabase = createClient();
  const dow = todayDow();

  const { data: routines, error: re } = await supabase
    .from('routines')
    .select('*')
    .contains('schedule_days', [dow])
    .order('created_at');
  if (re) throw re;
  if (!routines?.length) return [];

  const ids = routines.map(r => r.id);
  const { data: sessions, error: se } = await supabase
    .from('routine_sessions')
    .select('*')
    .in('routine_id', ids)
    .eq('date', TODAY);
  if (se) throw se;

  const sessionMap = new Map<string, RoutineSession>();
  for (const s of sessions ?? []) sessionMap.set(s.routine_id, s as RoutineSession);

  return (routines as Routine[]).map(r => ({
    ...r,
    todaySession: sessionMap.get(r.id),
  }));
}

export async function getSession(routineId: string, date: string = TODAY): Promise<RoutineSession | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('routine_sessions')
    .select('*')
    .eq('routine_id', routineId)
    .eq('date', date)
    .maybeSingle();
  if (error) throw error;
  return data as RoutineSession | null;
}

// ─── Write ──────────────────────────────────────────────────────────────────────

export async function createRoutine(
  data: Omit<Routine, 'id' | 'user_id' | 'created_at'> & { user_id: string }
): Promise<Routine> {
  const supabase = createClient();
  const { data: row, error } = await supabase
    .from('routines')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return row as Routine;
}

export async function updateRoutine(id: string, updates: Partial<Omit<Routine, 'id' | 'user_id' | 'created_at'>>): Promise<Routine> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('routines')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Routine;
}

export async function deleteRoutine(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('routines').delete().eq('id', id);
  if (error) throw error;
}

export async function upsertSession(routineId: string, userId: string, date: string = TODAY): Promise<RoutineSession> {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from('routine_sessions')
    .select('*')
    .eq('routine_id', routineId)
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();
  if (existing) return existing as RoutineSession;

  const { data, error } = await supabase
    .from('routine_sessions')
    .insert({ routine_id: routineId, user_id: userId, date, completed_task_ids: [], exercise_progress: {} })
    .select()
    .single();
  if (error) throw error;
  return data as RoutineSession;
}

export async function startSession(sessionId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('routine_sessions')
    .update({ started_at: new Date().toISOString() })
    .eq('id', sessionId)
    .is('started_at', null);
  if (error) throw error;
}

export async function pauseSession(sessionId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('routine_sessions')
    .update({ paused_at: new Date().toISOString() })
    .eq('id', sessionId);
  if (error) throw error;
}

export async function resumeSession(sessionId: string, totalPauseSeconds: number): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('routine_sessions')
    .update({ paused_at: null, pause_duration_seconds: totalPauseSeconds })
    .eq('id', sessionId);
  if (error) throw error;
}

export async function updateExerciseProgress(sessionId: string, progress: Record<string, ExerciseProgress>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('routine_sessions')
    .update({ exercise_progress: progress })
    .eq('id', sessionId);
  if (error) throw error;
}

export async function updateSessionTasks(sessionId: string, completedTaskIds: string[]): Promise<RoutineSession> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('routine_sessions')
    .update({ completed_task_ids: completedTaskIds })
    .eq('id', sessionId)
    .select()
    .single();
  if (error) throw error;
  return data as RoutineSession;
}

export async function completeSession(sessionId: string): Promise<RoutineSession> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('routine_sessions')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', sessionId)
    .select()
    .single();
  if (error) throw error;
  return data as RoutineSession;
}
