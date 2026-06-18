// ─── Dimensions ───────────────────────────────────────────────────────────────

export type HabitDimension = 'body' | 'mind' | 'soul';

// ─── Habit Types ──────────────────────────────────────────────────────────────

export type HabitType =
  | 'simple' | 'workout' | 'reading' | 'study' | 'shift'
  | 'meditation' | 'prayer' | 'journaling' | 'body_metric';

export type WorkoutMetadata = {
  sets: number;
  reps: number;
  weight: number;
  rest_time: number;
  duration_min: number;
};

export type ReadingMetadata = {
  book_name: string;
  pages_target: number;
  pages_done: number;
  duration_min: number;
};

export type StudyMetadata = {
  subject: string;
  chapter: string;
  time_target_min: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
};

export type ShiftMetadata = {
  workplace: string;
  start_time: string;
  end_time: string;
  break_min: number;
  hourly_rate?: number;
};

export type MeditationMetadata = {
  duration_min: number;
  technique?: string;
};

export type PrayerMetadata = {
  name?: string;
  duration_min: number;
};

export type JournalingMetadata = {
  prompt?: string;
};

export type BodyMetricMetadata = {
  metric: 'weight' | 'body_fat' | 'sleep_hours' | 'mood';
  unit: string;
};

export type HabitMetadata =
  | WorkoutMetadata | ReadingMetadata | StudyMetadata | ShiftMetadata
  | MeditationMetadata | PrayerMetadata | JournalingMetadata | BodyMetricMetadata
  | Record<string, never>;

// ─── Session Log (stored in HabitLog.log_data) ────────────────────────────────

export type SessionLog = {
  duration_sec: number;
  notes?: string;
  metric_value?: number;
};

// ─── Habit ────────────────────────────────────────────────────────────────────

export type Habit = {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  type: HabitType;
  dimension: HabitDimension;
  frequency: 'daily' | 'weekly';
  target_days: number[];
  metadata: HabitMetadata;
  created_at: string;
  calendar_start_time?: string;   // HH:MM — default time for all days
  calendar_duration_min?: number;
  calendar_overrides?: Record<string, { start: string; duration?: number }>; // "1"–"7" keyed by ISO dow
};

export type HabitLog = {
  id: string;
  habit_id: string;
  user_id: string;
  completed_at: string;
  log_data: Record<string, unknown>;
};

export type HabitWithStreak = Habit & {
  streak: number;
  completedToday: boolean;
};

// ─── Calendar ─────────────────────────────────────────────────────────────────

export type CalendarEventType = 'event' | 'meeting' | 'interview' | 'shift';
export type CalendarEventSource = 'manual' | 'google' | 'ai-parsed';

export type CalendarEvent = {
  id: string;
  user_id: string;
  title: string;
  type: CalendarEventType;
  start_at: string;
  end_at: string;
  color: string;
  notes?: string;
  source: CalendarEventSource;
  google_event_id?: string;
  linked_habit_ids: string[];
  linked_routine_ids: string[];
  created_at: string;
};

// ─── Analytics ────────────────────────────────────────────────────────────────

export type WeeklyConsistency = {
  habitId: string;
  habitName: string;
  color: string;
  weeklyRates: number[];
};

export type DisciplineScore = {
  score: number;
  streakBonus: number;
  completionRate: number;
};

export type DimensionScores = {
  body: number;
  mind: number;
  soul: number;
};

// ─── Goals ────────────────────────────────────────────────────────────────────

export type Goal = {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  deadline?: string;   // YYYY-MM-DD
  color: string;
  icon: string;
  dimension: HabitDimension;
  starting_point?: number;
  target_point?: number;
  current_value?: number;
  unit?: string;
  created_at: string;
};

export type HabitWithRate = Habit & { completionRate: number };

export type GoalWithHabits = Goal & {
  habits: HabitWithRate[];
  completionRate: number;  // 0–100, average across linked habits
};

export type GoalWithLinked = GoalWithHabits & {
  routines: Routine[];
  totalTimeSeconds: number;
};

// ─── Routines ─────────────────────────────────────────────────────────────────

export type RoutineCategory = 'sport' | 'data' | 'custom';
export type RoutineTaskType = 'reps' | 'time' | 'bilateral' | 'resource';

export type RoutineTaskResource = { url: string; label: string };

export type RoutineTask = {
  id: string;
  section?: string;
  name: string;
  type: RoutineTaskType;
  sets?: number;
  reps?: number;
  duration_min?: number;
  note?: string;
  resources?: RoutineTaskResource[];
};

export type Routine = {
  id: string;
  user_id: string;
  name: string;
  category: RoutineCategory;
  icon?: string;
  color?: string;
  schedule_days: number[];
  tasks: RoutineTask[];
  created_at: string;
};

export type ExerciseProgress = {
  completed_sets: number;
  current_left_done: boolean;
  current_right_done: boolean;
};

export type RoutineSession = {
  id: string;
  user_id: string;
  routine_id: string;
  date: string;
  completed_task_ids: string[];
  exercise_progress: Record<string, ExerciseProgress>;
  started_at: string | null;
  paused_at: string | null;
  pause_duration_seconds: number;
  completed_at?: string;
  actual_duration_seconds?: number;
};

export type RoutineWithSession = Routine & {
  todaySession?: RoutineSession;
};

// ─── Form Values ──────────────────────────────────────────────────────────────

export type HabitFormValues = {
  name: string;
  icon: string;
  color: string;
  type: HabitType;
  dimension: HabitDimension;
  frequency: 'daily' | 'weekly';
  target_days: number[];
  metadata: HabitMetadata;
  calendar_start_time?: string;
  calendar_duration_min?: number;
  calendar_overrides?: Record<string, { start: string; duration?: number }>;
};
