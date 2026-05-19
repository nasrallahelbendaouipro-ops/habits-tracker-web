import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type HealthIngestPayload = {
  token: string;
  date: string;                        // YYYY-MM-DD (or ISO timestamp)
  steps?: number | number[];           // iOS Shortcuts may send individual samples
  sleep_hours?: number | number[];
  heart_rate_avg?: number | number[];
  hrv?: number | number[];
  active_calories?: number | number[];
  weight_kg?: number | number[];
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

  // Normalise date to YYYY-MM-DD — accepts ISO timestamps too.
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

  const { data: tokenRow, error: tokenErr } = await supabase
    .from('health_sync_tokens')
    .select('user_id')
    .eq('token', token)
    .maybeSingle();

  if (tokenErr || !tokenRow) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const userId = tokenRow.user_id;

  // iOS Shortcuts sends samples as JSON array OR space/newline-separated string —
  // sum all parts to get a single aggregated number.
  const norm = (v: unknown): number | undefined => {
    if (v == null) return undefined;
    const parts: unknown[] = Array.isArray(v)
      ? v
      : typeof v === 'string' && /\s/.test(v.trim())
        ? v.trim().split(/\s+/)
        : [v];
    const sum = parts.reduce<number>((acc, x) => acc + Number(x), 0);
    return isNaN(sum) ? undefined : sum;
  };

  const st = norm(metrics.steps);
  const sl = norm(metrics.sleep_hours);
  const hr = norm(metrics.heart_rate_avg);
  const hv = norm(metrics.hrv);
  const ac = norm(metrics.active_calories);
  const w  = norm(metrics.weight_kg);

  // Insert a timestamped reading into health_readings (powers intraday charts).
  const reading: Record<string, unknown> = { user_id: userId };
  if (st != null) reading.steps            = Math.round(st);
  if (sl != null) reading.sleep_hours      = sl;
  if (hr != null) reading.heart_rate_avg   = Math.round(hr);
  if (hv != null) reading.hrv              = hv;
  if (ac != null) reading.active_calories  = ac;
  if (w  != null) reading.weight_kg        = w;

  const { error: insertErr } = await supabase.from('health_readings').insert(reading);
  if (insertErr) {
    console.error('[health/ingest] health_readings insert:', insertErr);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }

  // Also upsert daily_checkins for backward compat (manual check-in merging).
  const { data: existing } = await supabase
    .from('daily_checkins')
    .select('body_metrics')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  const existingBody = (existing?.body_metrics ?? {}) as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...existingBody };
  if (w  != null) merged.weight          = w;
  if (sl != null) merged.sleep_hours     = sl;
  if (st != null) merged.steps           = Math.round(st);
  if (hr != null) merged.heart_rate_avg  = Math.round(hr);
  if (hv != null) merged.hrv             = hv;
  if (ac != null) merged.active_calories = ac;

  await supabase
    .from('daily_checkins')
    .upsert({ user_id: userId, date, body_metrics: merged }, { onConflict: 'user_id,date' });

  // Update last_used on the token
  await supabase
    .from('health_sync_tokens')
    .update({ last_used: new Date().toISOString() })
    .eq('user_id', userId);

  const savedFields = Object.keys(reading).filter(k => k !== 'user_id');
  const values: Record<string, unknown> = {};
  for (const k of savedFields) values[k] = reading[k];
  return NextResponse.json({ ok: true, date, fields: savedFields, values });
}
