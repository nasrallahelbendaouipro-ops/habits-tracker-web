'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CheckCircle2, Flame, ClipboardList, Sun, Moon, Activity, Brain, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { fetchHabitsWithStatus, fetchWeeklyLogs, toggleHabit, createHabit, TIMED_TYPES, DIMENSION_ICONS } from '@/lib/habits';
import { fetchGoals } from '@/lib/goals';
import { getTodaysRoutines } from '@/lib/routines';
import { calcDisciplineScore } from '@/lib/analytics';
import { TODAY, toISODate } from '@/lib/utils';
import RoutineCard from '@/components/routines/RoutineCard';
import type { RoutineWithSession } from '@/lib/types';
import { useLocale, getGreeting, formatHabitsLabel, LOCALE_DATE_TAG } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import type { HabitWithStreak, HabitLog, HabitFormValues, GoalWithHabits, HabitDimension } from '@/lib/types';
import GlassCard from '@/components/ui/GlassCard';
import HabitModal from '@/components/habits/HabitModal';
import SessionTimer from '@/components/ui/SessionTimer';

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

// ─── Week Row ──────────────────────────────────────────────────────────────────

function WeekRow({ selectedDate, onSelect }: { selectedDate: string; onSelect: (d: string) => void }) {
  const { locale } = useLocale();
  const sel = new Date(selectedDate + 'T00:00:00');
  const startOfWeek = new Date(sel);
  startOfWeek.setDate(sel.getDate() - sel.getDay());

  return (
    <div className="flex gap-1.5 justify-between">
      {Array.from({ length: 7 }, (_, i) => {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        const dateS = toISODate(date);
        const isSelected = dateS === selectedDate;
        const isToday = dateS === TODAY;
        const dayLabel = date.toLocaleDateString(
          locale === 'en' ? 'en-US' : locale === 'fr' ? 'fr-FR' : 'ar-SA',
          { weekday: 'short' }
        );
        return (
          <button key={i} onClick={() => onSelect(dateS)} className="flex flex-col items-center gap-1 flex-1">
            <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: isSelected ? 'var(--primary)' : 'var(--text-muted)' }}>
              {dayLabel}
            </span>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all"
              style={{
                background: isSelected ? 'var(--primary)' : 'transparent',
                color: isSelected ? 'white' : isToday ? 'var(--primary)' : 'var(--text-secondary)',
                border: isSelected ? 'none' : isToday ? '1px solid var(--primary)' : '1px solid var(--border)',
              }}
            >
              {date.getDate()}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Progress Bar ──────────────────────────────────────────────────────────────

function ProgressBar({ completed, total, label }: { completed: number; total: number; label: string }) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span className="text-sm font-bold" style={{ color: 'var(--primary)' }}>{completed}/{total} · {pct}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: pct === 100 ? 'var(--teal)' : 'linear-gradient(90deg, var(--primary), var(--secondary))' }}
        />
      </div>
    </div>
  );
}

// ─── Dimension Tab Bar ─────────────────────────────────────────────────────────

const DIM_COLOR: Record<HabitDimension, string> = { body: 'var(--body)', mind: 'var(--mind)', soul: 'var(--soul)' };

function DimensionTabs({ active, onChange }: { active: HabitDimension | null; onChange: (d: HabitDimension | null) => void }) {
  const { t } = useLocale();
  const tabs: { label: string; Icon: React.ComponentType<{ size?: number }> | null; value: HabitDimension | null }[] = [
    { label: t.dim_all,  Icon: null,      value: null },
    { label: t.dim_body, Icon: Activity,  value: 'body' },
    { label: t.dim_mind, Icon: Brain,     value: 'mind' },
    { label: t.dim_soul, Icon: Sparkles,  value: 'soul' },
  ];
  return (
    <div className="flex gap-1.5 mb-4 overflow-x-auto">
      {tabs.map(tab => {
        const isActive = active === tab.value;
        const c = tab.value ? DIM_COLOR[tab.value] : 'var(--primary)';
        return (
          <button
            key={String(tab.value)}
            onClick={() => onChange(tab.value)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0 transition-all flex items-center gap-1"
            style={{
              background: isActive ? `color-mix(in srgb, ${c} 15%, transparent)` : 'var(--surface)',
              color: isActive ? c : 'var(--text-secondary)',
              border: `1px solid ${isActive ? c : 'var(--border)'}`,
            }}
          >
            {tab.Icon && <tab.Icon size={13} />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Habit Card ────────────────────────────────────────────────────────────────

function HabitCard({
  habit,
  onToggle,
  onStartSession,
  justCompleted,
}: {
  habit: HabitWithStreak;
  onToggle: (h: HabitWithStreak) => void;
  onStartSession: (h: HabitWithStreak) => void;
  justCompleted: boolean;
}) {
  const isTimed = TIMED_TYPES.includes(habit.type);
  const dimColor = DIM_COLOR[habit.dimension] ?? 'var(--primary)';

  return (
    <div
      className="flex items-center gap-4 p-4 rounded-xl transition-all group"
      style={{
        background: habit.completedToday ? 'var(--surface-elevated)' : 'var(--surface)',
        border: `1px solid ${habit.completedToday ? habit.color + '40' : 'var(--border)'}`,
        borderLeft: `3px solid ${dimColor}`,
      }}
    >
      {/* Icon */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ background: habit.color + '20', border: `1px solid ${habit.color}30` }}
      >
        {habit.icon}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p
          className="font-semibold text-sm truncate"
          style={{ color: habit.completedToday ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: habit.completedToday ? 'line-through' : 'none' }}
        >
          {habit.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] font-semibold" style={{ color: dimColor }}>
            {DIMENSION_ICONS[habit.dimension]} {habit.dimension}
          </span>
          {habit.streak > 0 && (
            <span className="text-[10px] font-medium" style={{ color: 'var(--secondary)' }}>
              🔥 {habit.streak}d streak
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      {isTimed && !habit.completedToday ? (
        <button
          onClick={() => onStartSession(habit)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0"
          style={{ background: `color-mix(in srgb, ${dimColor} 15%, transparent)`, color: dimColor, border: `1px solid color-mix(in srgb, ${dimColor} 25%, transparent)` }}
        >
          ▶ Start
        </button>
      ) : (
        <div
          key={`cb-${habit.completedToday}`}
          className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer ${justCompleted ? 'animate-bounce-in' : 'transition-all'}`}
          style={{ background: habit.completedToday ? habit.color : 'transparent', border: `2px solid ${habit.completedToday ? habit.color : 'var(--border)'}` }}
          onClick={() => onToggle(habit)}
        >
          {habit.completedToday && (
            <svg width="12" height="10" viewBox="0 0 12 10" fill="none" className={justCompleted ? 'animate-check-draw' : ''}>
              <path d="M1 5L4.5 8.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ onAdd, noHabitsLabel, noHabitsDesc, addHabitLabel }: { onAdd: () => void; noHabitsLabel: string; noHabitsDesc: string; addHabitLabel: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">🌱</div>
      <p className="font-semibold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>{noHabitsLabel}</p>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>{noHabitsDesc}</p>
      <button onClick={onAdd} className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white" style={{ background: 'var(--primary)' }}>
        {addHabitLabel}
      </button>
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { toggleTheme, isDark } = useTheme();
  const { t, locale } = useLocale();
  const [userId, setUserId]           = useState<string | null>(null);
  const [habits, setHabits]           = useState<HabitWithStreak[]>([]);
  const [logs, setLogs]               = useState<HabitLog[]>([]);
  const [goals, setGoals]             = useState<GoalWithHabits[]>([]);
  const [todaysRoutines, setTodaysRoutines] = useState<RoutineWithSession[]>([]);
  const [logs, setLogs]               = useState<HabitLog[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showAdd, setShowAdd]         = useState(false);
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [activeDim, setActiveDim]     = useState<HabitDimension | null>(null);
  const [activeSession, setActiveSession] = useState<HabitWithStreak | null>(null);
  const [justCompleted, setJustCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [habitsData, goalsData, routinesData, logsData] = await Promise.all([
        fetchHabitsWithStatus(userId, selectedDate),
        fetchGoals(userId),
        getTodaysRoutines(),
        fetchWeeklyLogs(userId),
      ]);
      setHabits(habitsData);
      setGoals(goalsData);
      setTodaysRoutines(routinesData);
      setLogs(logsData);
      if (habitsData.length === 0 && !localStorage.getItem('onboarding_complete')) {
        router.push('/onboarding');
        return;
      }
    } finally {
      setLoading(false);
    }
  }, [userId, selectedDate]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (values: HabitFormValues) => {
    await createHabit({ ...values, user_id: userId! });
    setShowAdd(false);
    load();
  };

  const handleToggle = async (habit: HabitWithStreak) => {
    const completing = !habit.completedToday;
    setHabits(prev => prev.map(h =>
      h.id === habit.id
        ? { ...h, completedToday: completing, streak: completing ? h.streak + 1 : h.streak - 1 }
        : h
    ));
    if (completing) {
      setJustCompleted(prev => new Set(prev).add(habit.id));
      setTimeout(() => setJustCompleted(prev => { const n = new Set(prev); n.delete(habit.id); return n; }), 400);
    }
    try {
      await toggleHabit(habit.id, userId!, habit.completedToday, selectedDate);
    } catch {
      load();
    }
  };

  const handleSessionComplete = async (logData: { duration_sec: number; notes?: string }) => {
    if (!activeSession) return;
    setHabits(prev => prev.map(h =>
      h.id === activeSession.id ? { ...h, completedToday: true, streak: h.streak + 1 } : h
    ));
    await toggleHabit(activeSession.id, userId!, false, selectedDate, logData);
  };

  const visibleHabits = activeDim ? habits.filter(h => h.dimension === activeDim) : habits;
  const completed = habits.filter(h => h.completedToday).length;
  const disciplineScore = calcDisciplineScore(habits, logs, 28);
  const selectedDateObj = new Date(selectedDate + 'T00:00:00');
  const isToday = selectedDate === TODAY;
  const habitsLabel = formatHabitsLabel(locale, selectedDateObj, isToday);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-1 mb-0.5">
            <button onClick={() => setSelectedDate(d => shiftDate(d, -1))} className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
              <ChevronLeft size={14} />
            </button>
            <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              {isToday ? `${t.today} · ` : ''}{selectedDateObj.toLocaleDateString(LOCALE_DATE_TAG[locale], { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <button onClick={() => setSelectedDate(d => shiftDate(d, 1))} className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
              <ChevronRight size={14} />
            </button>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {isToday ? getGreeting(locale) : habitsLabel}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {!isToday && (
            <button onClick={() => setSelectedDate(TODAY)} className="px-3 py-1.5 rounded-xl font-medium text-xs transition-all" style={{ background: 'var(--primary-muted)', color: 'var(--primary)', border: '1px solid var(--primary-muted)' }}>
              {t.today}
            </button>
          )}
          <button onClick={toggleTheme} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-xl font-semibold text-sm text-white transition-all" style={{ background: 'var(--primary)', boxShadow: 'var(--shadow-glow)' }}>
            {t.dashboard_add}
          </button>
        </div>
      </div>

      {/* Week Row */}
      <GlassCard className="mb-4">
        <WeekRow selectedDate={selectedDate} onSelect={setSelectedDate} />
      </GlassCard>

      {/* Discipline Score */}
      {habits.length > 0 && (
        <Link href="/analytics">
          <GlassCard className="mb-4 cursor-pointer" style={{ transition: 'opacity 0.15s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-muted)' }}>
                  Discipline Score
                </p>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black tabular-nums" style={{ color: disciplineScore >= 75 ? 'var(--teal)' : disciplineScore >= 50 ? 'var(--primary)' : 'var(--secondary)' }}>
                    {disciplineScore}
                  </span>
                  <span className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>/100</span>
                </div>
              </div>
              <div className="relative w-16 h-16">
                <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                  <circle cx="32" cy="32" r="26" fill="none" stroke="var(--border)" strokeWidth="6" />
                  <circle
                    cx="32" cy="32" r="26" fill="none"
                    stroke={disciplineScore >= 75 ? 'var(--teal)' : disciplineScore >= 50 ? 'var(--primary)' : 'var(--secondary)'}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${(disciplineScore / 100) * 163.4} 163.4`}
                    style={{ transition: 'stroke-dasharray 0.6s ease' }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                  28d
                </span>
              </div>
            </div>
          </GlassCard>
        </Link>
      )}

      {/* Today's Routines */}
      {isToday && todaysRoutines.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Today&apos;s Routines
            </h2>
            <Link href="/routines" className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>
              All routines
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {todaysRoutines.map(r => (
              <RoutineCard key={r.id} routine={r} compact />
            ))}
          </div>
        </div>
      )}

      {/* Progress */}
      {habits.length > 0 && (
        <GlassCard className="mb-6">
          <ProgressBar completed={completed} total={habits.length} label={t.dashboard_progress} />
        </GlassCard>
      )}

      {/* Quick Stats */}
      {habits.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: t.dashboard_completed, value: `${completed}/${habits.length}`, Icon: CheckCircle2 },
            { label: t.dashboard_best_streak, value: `${Math.max(...habits.map(h => h.streak), 0)}d`, Icon: Flame },
            { label: t.dashboard_total, value: habits.length, Icon: ClipboardList },
          ].map(({ label, value, Icon }) => (
            <GlassCard key={label} style={{ padding: '14px', textAlign: 'center' }}>
              <div className="flex justify-center mb-1" style={{ color: 'var(--primary)' }}><Icon size={20} /></div>
              <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{value}</p>
              <p className="text-[10px] uppercase tracking-wide font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Dimension tabs + Habits */}
      <div>
        {habits.length > 0 && <DimensionTabs active={activeDim} onChange={setActiveDim} />}

        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            {habitsLabel}
          </h2>
          {visibleHabits.length > 0 && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}>
              {visibleHabits.length}
            </span>
          )}
        </div>

        {/* All-done celebration */}
        {!loading && completed === habits.length && habits.length > 0 && (
          <div
            className="animate-slide-up mb-3 px-4 py-3 rounded-xl flex items-center gap-3"
            style={{ background: 'linear-gradient(135deg, var(--primary-muted), var(--teal-muted))', border: '1px solid var(--primary-muted-border)' }}
          >
            <span className="text-2xl">🎉</span>
            <div>
              <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>All done for today!</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>You completed all {habits.length} habits. Great work.</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} />)}
          </div>
        ) : visibleHabits.length === 0 ? (
          <EmptyState onAdd={() => setShowAdd(true)} noHabitsLabel={t.dashboard_no_habits} noHabitsDesc={t.dashboard_no_habits_desc} addHabitLabel={t.dashboard_add_habit} />
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="flex flex-col gap-2">
              {visibleHabits.map((habit, index) => (
                <motion.div
                  key={habit.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20, scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 28, delay: index * 0.04 }}
                >
                  <HabitCard habit={habit} onToggle={handleToggle} onStartSession={setActiveSession} justCompleted={justCompleted.has(habit.id)} />
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* Goals Section */}
      {goals.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t.goals_title}</h2>
            <Link href="/goals" className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>{t.goals_see_all}</Link>
          </div>
          <div className="flex flex-col gap-3">
            {goals.map(goal => (
              <Link key={goal.id} href="/goals" className="block rounded-2xl overflow-hidden transition-all" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `4px solid ${goal.color}` }}>
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg">{goal.icon}</span>
                      <span className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{goal.title}</span>
                    </div>
                    <span className="text-xs font-bold flex-shrink-0" style={{ color: goal.color }}>{goal.completionRate}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-elevated)' }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${goal.completionRate}%`, background: goal.color }} />
                  </div>
                  {goal.habits.length > 0 && (
                    <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
                      {goal.habits.map(h => h.icon).join(' ')} {goal.habits.length} {goal.habits.length === 1 ? 'habit' : 'habits'}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <HabitModal mode="add" visible={showAdd} onClose={() => setShowAdd(false)} onSubmit={handleAdd} />

      {activeSession && (
        <SessionTimer
          habit={activeSession}
          onComplete={handleSessionComplete}
          onClose={() => setActiveSession(null)}
        />
      )}
    </div>
  );
}
