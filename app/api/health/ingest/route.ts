import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type HealthIngestPayload = {
  token: string;
  date: string;           // YYYY-MM-DD
  steps?: number;
  sleep_hours?: number;
  heart_rate_avg?: number;
  hrv?: number;
  active_calories?: number;
  weight_kg?: number;
};

export async function POST(req: NextRequest) {
  let body: HealthIngestPayload;
  try {
    body = await req.json() as HealthIngestPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { token, date: rawDate, ...metrics } = body;

  if (!token || !rawDate) {
    return NextResponse.json({ error: 'token and date are required' }, { status: 400 });
  }

  // Normalise whatever iOS Shortcuts sends to YYYY-MM-DD.
  // Accepts: "2026-05-16", ISO timestamps "2026-05-16T14:18:00+02:00", or any
  // string parseable by Date.
  let date: string;
  const trimmed = String(rawDate).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    date = trimmed;
  } else {
    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) {
      return NextResponse.json({ error: 'Cannot parse date', received: trimmed }, { status: 400 });
    }
    date = parsed.toISOString().slice(0, 10);
  }

  const supabase = createAdminClient();

  // Look up user by token
  const { data: tokenRow, error: tokenErr } = await supabase
    .from('health_sync_tokens')
    .select('user_id')
    .eq('token', token)
    .maybeSingle();

  if (tokenErr || !tokenRow) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const userId = tokenRow.user_id;

  // Fetch existing check-in for the day so we can merge (not overwrite) body_metrics
  const { data: existing } = await supabase
    .from('daily_checkins')
    .select('body_metrics')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  const existingBody = (existing?.body_metrics ?? {}) as Record<string, unknown>;

  // Build merged body_metrics — only set fields that were provided by the Shortcut
  const merged: Record<string, unknown> = { ...existingBody };
  if (metrics.weight_kg    != null) merged.weight       = metrics.weight_kg;
  if (metrics.sleep_hours  != null) merged.sleep_hours  = metrics.sleep_hours;

  // Extra HealthKit fields stored alongside standard body_metrics
  if (metrics.steps            != null) merged.steps            = metrics.steps;
  if (metrics.heart_rate_avg   != null) merged.heart_rate_avg   = metrics.heart_rate_avg;
  if (metrics.hrv              != null) merged.hrv              = metrics.hrv;
  if (metrics.active_calories  != null) merged.active_calories  = metrics.active_calories;

  const { error: upsertErr } = await supabase
    .from('daily_checkins')
    .upsert(
      { user_id: userId, date, body_metrics: merged },
      { onConflict: 'user_id,date' }
    );

  if (upsertErr) {
    console.error('[health/ingest]', upsertErr);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }

  // Update last_used on the token
  await supabase
    .from('health_sync_tokens')
    .update({ last_used: new Date().toISOString() })
    .eq('user_id', userId);

  return NextResponse.json({ ok: true, date, fields: Object.keys(metrics).filter(k => metrics[k as keyof typeof metrics] != null) });
}
