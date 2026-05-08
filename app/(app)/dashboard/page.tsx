'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchHabitsWithStatus, toggleHabit, createHabit } from '@/lib/habits';
import { getGreeting, formatDate } from '@/lib/utils';
import { useTheme } from '@/lib/theme';
import type { HabitWithStreak, HabitFormValues } from '@/lib/types';
import GlassCard from '@/components/ui/GlassCard';
import HabitModal from '@/components/habits/HabitModal';

// ─── Week Row ──────────────────────────────────────────────────────────────────

function WeekRow() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  return (
    <div className="flex gap-1.5 justify-between">
      {days.map((d, i) => {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        const isToday = date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
        const isPast = date < today && !isToday;
        return (
          <div key={d} className="flex flex-col items-center gap-1 flex-1">
            <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {d}
            </span>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all"
              style={{
                background: isToday ? 'var(--primary)' : 'transparent',
                color: isToday ? 'white' : isPast ? 'var(--text-secondary)' : 'var(--text-disabled)',
                border: isToday ? 'none' : '1px solid var(--border)',
              }}
            >
              {date.getDate()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Progress Bar ──────────────────────────────────────────────────────────────

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Today&apos;s progress
        </span>
        <span className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
          {completed}/{total} · {pct}%
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: pct === 100
              ? 'var(--teal)'
              : 'linear-gradient(90deg, var(--primary), var(--secondary))',
          }}
        />
      </div>
    </div>
  );
}

// ─── Habit Card ────────────────────────────────────────────────────────────────

function HabitCard({
  habit,
  onToggle,
}: {
  habit: HabitWithStreak;
  onToggle: (h: HabitWithStreak) => void;
}) {
  const TYPE_LABELS: Record<string, string> = {
    simple: '', workout: '💪 Workout', reading: '📚 Reading',
    study: '🧠 Study', shift: '🕐 Shift',
  };

  return (
    <div
      className="flex items-center gap-4 p-4 rounded-xl transition-all cursor-pointer group"
      style={{
        background: habit.completedToday ? 'var(--surface-elevated)' : 'var(--surface)',
        border: `1px solid ${habit.completedToday ? habit.color + '40' : 'var(--border)'}`,
      }}
      onClick={() => onToggle(habit)}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--surface-elevated)')}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = habit.completedToday ? 'var(--surface-elevated)' : 'var(--surface)')}
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
          style={{
            color: habit.completedToday ? 'var(--text-muted)' : 'var(--text-primary)',
            textDecoration: habit.completedToday ? 'line-through' : 'none',
          }}
        >
          {habit.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {habit.type !== 'simple' && (
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {TYPE_LABELS[habit.type]}
            </span>
          )}
          {habit.streak > 0 && (
            <span className="text-[10px] font-medium" style={{ color: 'var(--secondary)' }}>
              🔥 {habit.streak}d streak
            </span>
          )}
        </div>
      </div>

      {/* Checkbox */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
        style={{
          background: habit.completedToday ? habit.color : 'transparent',
          border: `2px solid ${habit.completedToday ? habit.color : 'var(--border)'}`,
        }}
      >
        {habit.completedToday && (
          <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
            <path d="M1 5L4.5 8.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">🌱</div>
      <p className="font-semibold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>No habits yet</p>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        Start building your life operating system — add your first habit.
      </p>
      <button
        onClick={onAdd}
        className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all"
        style={{ background: 'var(--primary)' }}
      >
        + Add habit
      </button>
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { toggleTheme, isDark } = useTheme();
  const [userId, setUserId] = useState<string | null>(null);
  const [habits, setHabits] = useState<HabitWithStreak[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await fetchHabitsWithStatus(userId);
      setHabits(data);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (values: HabitFormValues) => {
    await createHabit({ ...values, user_id: userId! });
    setShowAdd(false);
    load();
  };

  const handleToggle = async (habit: HabitWithStreak) => {
    setHabits(prev =>
      prev.map(h =>
        h.id === habit.id
          ? { ...h, completedToday: !h.completedToday, streak: h.completedToday ? h.streak - 1 : h.streak + 1 }
          : h
      )
    );
    try {
      await toggleHabit(habit.id, userId!, habit.completedToday);
    } catch {
      load();
    }
  };

  const completed = habits.filter(h => h.completedToday).length;
  const today = new Date();

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>
            {formatDate(today)}
          </p>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {getGreeting()} 👋
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-base transition-all"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            title="Toggle theme"
          >
            {isDark ? '☀️' : '🌙'}
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 rounded-xl font-semibold text-sm text-white transition-all"
            style={{ background: 'var(--primary)', boxShadow: 'var(--shadow-glow)' }}
          >
            + Add
          </button>
        </div>
      </div>

      {/* Week Row */}
      <GlassCard className="mb-4">
        <WeekRow />
      </GlassCard>

      {/* Progress */}
      {habits.length > 0 && (
        <GlassCard className="mb-6">
          <ProgressBar completed={completed} total={habits.length} />
        </GlassCard>
      )}

      {/* Quick Stats */}
      {habits.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Completed', value: `${completed}/${habits.length}`, icon: '✅' },
            { label: 'Best streak', value: `${Math.max(...habits.map(h => h.streak), 0)}d`, icon: '🔥' },
            { label: 'Total habits', value: habits.length, icon: '📋' },
          ].map(({ label, value, icon }) => (
            <GlassCard key={label} style={{ padding: '14px', textAlign: 'center' }}>
              <div className="text-xl mb-1">{icon}</div>
              <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{value}</p>
              <p className="text-[10px] uppercase tracking-wide font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Habits List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Today&apos;s habits
          </h2>
          {habits.length > 0 && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}>
              {habits.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-16 rounded-xl animate-pulse"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              />
            ))}
          </div>
        ) : habits.length === 0 ? (
          <EmptyState onAdd={() => setShowAdd(true)} />
        ) : (
          <div className="flex flex-col gap-2">
            {habits.map(habit => (
              <HabitCard key={habit.id} habit={habit} onToggle={handleToggle} />
            ))}
          </div>
        )}
      </div>

      <HabitModal
        mode="add"
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSubmit={handleAdd}
      />
    </div>
  );
}
