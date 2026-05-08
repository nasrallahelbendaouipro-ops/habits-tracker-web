import { createClient } from '@/lib/supabase/client';
import type { CalendarEvent } from '@/lib/types';

export async function fetchCalendarEvents(
  userId: string,
  start: string,
  end: string
): Promise<CalendarEvent[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .gte('start_at', start)
    .lte('start_at', end);
  if (error) throw error;
  return (data ?? []) as CalendarEvent[];
}

export async function createCalendarEvent(
  event: Omit<CalendarEvent, 'id' | 'created_at'>
): Promise<CalendarEvent> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('calendar_events')
    .insert(event)
    .select()
    .single();
  if (error) throw error;
  return data as CalendarEvent;
}

export async function updateCalendarEvent(
  id: string,
  updates: Partial<Omit<CalendarEvent, 'id' | 'user_id' | 'created_at'>>
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('calendar_events')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
