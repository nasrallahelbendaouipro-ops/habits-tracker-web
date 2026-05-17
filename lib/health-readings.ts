import { createClient } from '@/lib/supabase/client';

export type HealthReading = {
  synced_at: string;
  steps: number | null;
  active_calories: number | null;
  weight_kg: number | null;
  sleep_hours: number | null;
  heart_rate_avg: number | null;
  hrv: number | null;
};

export type Period = 'day' | 'week' | 'month' | '6months' | 'year';

export type ChartPoint = { label: string; value: number | null };

const supabase = () => createClient();

async function fetchReadings(userId: string, since: Date): Promise<HealthReading[]> {
  const { data } = await supabase()
    .from('health_readings')
    .select('synced_at,steps,active_calories,weight_kg,sleep_hours,heart_rate_avg,hrv')
    .eq('user_id', userId)
    .gte('synced_at', since.toISOString())
    .order('synced_at', { ascending: true });
  return (data ?? []) as HealthReading[];
}

// For cumulative metrics (steps, calories): sum incremental deltas within each bucket.
// Strategy: use consecutive-reading deltas so that a fresh daily total from iOS
// doesn't double-count previous hours.
function deltaSeries(
  readings: HealthReading[],
  key: 'steps' | 'active_calories',
  bucketFn: (d: Date) => string,
  labels: string[],
): ChartPoint[] {
  // Build deltas: difference from one reading to the next within the same calendar day.
  // When a new day starts, the first reading of the day IS the delta for that reading.
  const deltas: { bucket: string; delta: number }[] = [];
  let prevValue: number | null = null;
  let prevDay = '';

  for (const r of readings) {
    const d = new Date(r.synced_at);
    const day = d.toISOString().slice(0, 10);
    const val = r[key] as number | null;
    if (val == null) continue;

    // New calendar day → reset baseline
    if (day !== prevDay) { prevValue = null; prevDay = day; }

    const delta = prevValue == null ? val : Math.max(0, val - prevValue);
    prevValue = val;
    deltas.push({ bucket: bucketFn(d), delta });
  }

  // Sum deltas per bucket
  const map: Record<string, number> = {};
  for (const { bucket, delta } of deltas) map[bucket] = (map[bucket] ?? 0) + delta;

  return labels.map(l => ({ label: l, value: map[l] ?? null }));
}

// For point-in-time metrics (weight, sleep, mood): last value in each bucket.
function pointSeries(
  readings: HealthReading[],
  key: 'weight_kg' | 'sleep_hours' | 'heart_rate_avg' | 'hrv',
  bucketFn: (d: Date) => string,
  labels: string[],
): ChartPoint[] {
  const map: Record<string, number> = {};
  for (const r of readings) {
    const val = r[key] as number | null;
    if (val == null) continue;
    map[bucketFn(new Date(r.synced_at))] = val;
  }
  return labels.map(l => ({ label: l, value: map[l] ?? null }));
}

// ─── Period helpers ───────────────────────────────────────────────────────────

function hourLabel(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:00`;
}
function dayLabel(d: Date) {
  return d.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
}
function weekLabel(d: Date) {
  // ISO week start (Monday)
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return monday.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
}
function monthLabel(d: Date) {
  return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
}

function hoursLabels(): string[] {
  return Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
}
function daysLabels(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return dayLabel(d);
  });
}
function weeksLabels(n: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const l = weekLabel(d);
    if (!seen.has(l)) { seen.add(l); result.push(l); }
  }
  return result;
}
function monthsLabels(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (n - 1 - i));
    return monthLabel(d);
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type MetricKey = 'steps' | 'active_calories' | 'weight_kg' | 'sleep_hours' | 'heart_rate_avg';

const CUMULATIVE: MetricKey[] = ['steps', 'active_calories'];

export async function fetchHealthChart(
  userId: string,
  metric: MetricKey,
  period: Period,
): Promise<ChartPoint[]> {
  const now = new Date();
  let since: Date;
  let labels: string[];
  let bucketFn: (d: Date) => string;

  switch (period) {
    case 'day':
      since = new Date(now); since.setHours(0, 0, 0, 0);
      labels = hoursLabels();
      bucketFn = hourLabel;
      break;
    case 'week':
      since = new Date(now); since.setDate(now.getDate() - 6); since.setHours(0, 0, 0, 0);
      labels = daysLabels(7);
      bucketFn = dayLabel;
      break;
    case 'month':
      since = new Date(now); since.setDate(now.getDate() - 29); since.setHours(0, 0, 0, 0);
      labels = daysLabels(30);
      bucketFn = dayLabel;
      break;
    case '6months':
      since = new Date(now); since.setMonth(now.getMonth() - 6); since.setHours(0, 0, 0, 0);
      labels = weeksLabels(26);
      bucketFn = weekLabel;
      break;
    case 'year':
      since = new Date(now); since.setFullYear(now.getFullYear() - 1); since.setHours(0, 0, 0, 0);
      labels = monthsLabels(12);
      bucketFn = monthLabel;
      break;
  }

  const readings = await fetchReadings(userId, since);

  if (CUMULATIVE.includes(metric)) {
    return deltaSeries(readings, metric as 'steps' | 'active_calories', bucketFn, labels);
  }
  return pointSeries(readings, metric as 'weight_kg' | 'sleep_hours' | 'heart_rate_avg' | 'hrv', bucketFn, labels);
}
