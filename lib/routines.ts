import { createClient } from '@/lib/supabase/client';
import type { Routine, RoutineSession, RoutineWithSession, RoutineTask } from '@/lib/types';
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
  const { data, error } = await supabase
    .from('routine_sessions')
    .upsert(
      { routine_id: routineId, user_id: userId, date, completed_task_ids: [] },
      { onConflict: 'user_id,routine_id,date', ignoreDuplicates: false }
    )
    .select()
    .single();
  if (error) throw error;
  return data as RoutineSession;
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
