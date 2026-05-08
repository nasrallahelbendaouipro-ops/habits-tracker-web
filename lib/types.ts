// ─── Habit Types ──────────────────────────────────────────────────────────────

export type HabitType = 'simple' | 'workout' | 'reading' | 'study' | 'shift';

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

export type HabitMetadata = WorkoutMetadata | ReadingMetadata | StudyMetadata | ShiftMetadata | Record<string, never>;

export type Habit = {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  type: HabitType;
  frequency: 'daily' | 'weekly';
  target_days: number[];
  metadata: HabitMetadata;
  created_at: string;
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

// ─── Form Values ──────────────────────────────────────────────────────────────

export type HabitFormValues = {
  name: string;
  icon: string;
  color: string;
  type: HabitType;
  frequency: 'daily' | 'weekly';
  target_days: number[];
  metadata: HabitMetadata;
};
