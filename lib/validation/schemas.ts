import { z } from 'zod';

// ─── Habits (UI form boundary — see app/(app)/habits/*) ────────────────────────

export const habitFormSchema = z.object({
  name: z.string().trim().min(1).max(120),
  icon: z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  type: z.enum([
    'simple', 'workout', 'reading', 'study', 'shift',
    'meditation', 'prayer', 'journaling', 'body_metric',
  ]),
  dimension: z.enum(['body', 'mind', 'soul']),
  frequency: z.enum(['daily', 'weekly']),
  target_days: z.array(z.number().int().min(1).max(7)), // Mon=1…Sun=7
  metadata: z.record(z.string(), z.unknown()),
  calendar_start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  calendar_duration_min: z.number().int().positive().optional(),
  calendar_overrides: z.record(
    z.string(),
    z.object({ start: z.string(), duration: z.number().optional() })
  ).optional(),
});

// ─── Routine tasks (jsonb `tasks` column — UI form boundary) ───────────────────

export const routineTaskSchema = z.object({
  id: z.string(),
  section: z.string().optional(),
  name: z.string().trim().min(1),
  type: z.enum(['reps', 'time', 'bilateral', 'resource']),
  sets: z.number().int().positive().optional(),
  reps: z.number().int().positive().optional(),
  duration_min: z.number().positive().optional(),
  note: z.string().optional(),
  resources: z.array(z.object({ url: z.string(), label: z.string() })).optional(),
});

export const routineTasksSchema = z.array(routineTaskSchema);

// ─── app/api/health/ingest ──────────────────────────────────────────────────────

const metricValue = z.union([z.number(), z.array(z.number()), z.string()]).optional();

export const healthIngestSchema = z.object({
  token: z.uuid(),
  date: z.string().trim().min(8),
  steps: metricValue,
  sleep_hours: metricValue,
  heart_rate_avg: metricValue,
  hrv: metricValue,
  active_calories: metricValue,
  weight_kg: metricValue,
});

// ─── app/api/parse-shift ────────────────────────────────────────────────────────

export const parseShiftSchema = z.object({
  text: z.string().trim().min(1).max(20_000),
});

// ─── app/api/planner ─────────────────────────────────────────────────────────────

export const plannerInputSchema = z.object({
  habits: z.array(z.object({
    name: z.string(),
    dimension: z.string(),
    type: z.string(),
    streak: z.number(),
    completionRate: z.number(),
  })),
  goals: z.array(z.object({
    title: z.string(),
    dimension: z.string(),
    pct: z.number().optional(),
    unit: z.string().optional(),
    current_value: z.number().optional(),
    target_point: z.number().optional(),
    deadline: z.string().optional(),
  })),
  dimensionScores: z.object({
    body: z.number(),
    mind: z.number(),
    soul: z.number(),
  }),
  checkinSummary: z.object({
    avgSleep: z.number().optional(),
    avgMood: z.number().optional(),
    avgStress: z.number().optional(),
  }).optional(),
});

// ─── app/api/google-calendar/events ─────────────────────────────────────────────

const isoDateTimePrefix = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

export const googleEventsQuerySchema = z.object({
  timeMin: z.string().regex(isoDateTimePrefix, 'must be an ISO 8601 datetime string'),
  timeMax: z.string().regex(isoDateTimePrefix, 'must be an ISO 8601 datetime string'),
});
