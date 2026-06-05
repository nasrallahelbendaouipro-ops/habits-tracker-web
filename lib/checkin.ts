import { createClient } from '@/lib/supabase/client';

export type BodyMetrics = {
  weight?: number;
  sleep_hours?: number;
  mood?: number;         // 1-10
  body_fat?: number;
};

export type MindMetrics = {
  energy?: number;           // 1-10 subjective
  focus?: number;            // 1-10 subjective
  motivation?: number;       // 1-10 subjective
  reading_min?: number;
  screen_time_min?: number;
  social_media_min?: number;
  deep_work_min?: number;
};

export type SoulMetrics = {
  gratitude_score?: number;  // 1-10
  meditation_quality?: number;  // 1-10
  stress_level?: number;  // 1-10
};

export type DailyCheckin = {
  id: string;
  user_id: string;
  date: string;
  body_metrics: BodyMetrics;
  mind_metrics: MindMetrics;
  soul_metrics: SoulMetrics;
  notes?: string;
  created_at: string;
};

export async function fetchCheckin(userId: string, date: string): Promise<DailyCheckin | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('daily_checkins')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();
  return data as DailyCheckin | null;
}

export async function upsertCheckin(
  userId: string,
  date: string,
  body_metrics: BodyMetrics,
  mind_metrics: MindMetrics,
  soul_metrics: SoulMetrics,
  notes?: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('daily_checkins').upsert({
    user_id: userId, date, body_metrics, mind_metrics, soul_metrics, notes,
  }, { onConflict: 'user_id,date' });
  if (error) throw error;
}

export async function fetchRecentCheckins(userId: string, days = 30): Promise<DailyCheckin[]> {
  const supabase = createClient();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data } = await supabase
    .from('daily_checkins')
    .select('*')
    .eq('user_id', userId)
    .gte('date', since.toISOString().split('T')[0])
    .order('date', { ascending: true });
  return (data ?? []) as DailyCheckin[];
}
