'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { updateHabit, deleteHabit } from '@/lib/habits';
import { dateStr, TODAY } from '@/lib/utils';
import GlassCard from '@/components/ui/GlassCard';
import HabitModal from '@/components/habits/HabitModal';
import type { Habit, HabitLog, HabitFormValues, WorkoutMetadata, ReadingMetadata, StudyMetadata, ShiftMetadata } from '@/lib/types';

// ─── Mini Heatmap ──────────────────────────────────────────────────────────────

function MiniHeatmap({ habitId, color }: { habitId: string; color: string }) {
  const [doneDates, setDoneDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('habit_logs')
      .select('completed_at')
      .eq('habit_id', habitId)
      .gte('completed_at', dateStr(29))
      .then(({ data }) => {
        if (data) setDoneDates(new Set(data.map(r => r.completed_at)));
      });
  }, [habitId]);

  const days: string[] = [];
  for (let i = 29; i >= 0; i--) days.push(dateStr(i));

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
        Last 30 days
      </p>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(10, 1fr)' }}>
        {days.map(d => {
          const done = doneDates.has(d);
          const isToday = d === TODAY;
          return (
            <div
              key={d}
              title={d}
              className="aspect-square rounded-sm transition-all"
              style={{
                background: done ? color : 'var(--border)',
                opacity: done ? 1 : 0.5,
                outline: isToday ? `2px solid ${color}` : 'none',
                outlineOffset: '1px',
              }}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>30 days ago</span>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Today</span>
      </div>
    </div>
  );
}

// ─── Type-specific stats ───────────────────────────────────────────────────────

function WorkoutStats({ metadata }: { metadata: WorkoutMetadata }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[
        { label: 'Sets', value: metadata.sets },
        { label: 'Reps', value: metadata.reps },
        { label: 'Weight', value: `${metadata.weight} kg` },
        { label: 'Duration', value: `${metadata.duration_min} min` },
        { label: 'Rest', value: `${metadata.rest_time}s` },
      ].map(({ label, value }) => (
        <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
          <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{value}</p>
          <p className="text-[10px] uppercase tracking-wide font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
        </div>
      ))}
    </div>
  );
}

function ReadingStats({ metadata }: { metadata: ReadingMetadata }) {
  const pct = metadata.pages_target > 0
    ? Math.round((metadata.pages_done / metadata.pages_target) * 100)
    : 0;
  return (
    <div className="flex flex-col gap-3">
      {metadata.book_name && (
        <div className="rounded-xl p-3" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
          <p className="text-[10px] uppercase tracking-wide font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Book</p>
          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{metadata.book_name}</p>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Done', value: `${metadata.pages_done}p` },
          { label: 'Target', value: `${metadata.pages_target}p` },
          { label: 'Progress', value: `${pct}%` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
            <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{value}</p>
            <p className="text-[10px] uppercase tracking-wide font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
          </div>
        ))}
      </div>
      {metadata.pages_target > 0 && (
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: 'var(--primary)' }} />
        </div>
      )}
    </div>
  );
}

function StudyStats({ metadata }: { metadata: StudyMetadata }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {metadata.subject && (
          <div className="rounded-xl p-3" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] uppercase tracking-wide font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Subject</p>
            <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{metadata.subject}</p>
          </div>
        )}
        {metadata.chapter && (
          <div className="rounded-xl p-3" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] uppercase tracking-wide font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Chapter</p>
            <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{metadata.chapter}</p>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
          <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{metadata.time_target_min} min</p>
          <p className="text-[10px] uppercase tracking-wide font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>Target time</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
          <div className="flex justify-center gap-0.5 mb-1">
            {[1, 2, 3, 4, 5].map(n => (
              <div
                key={n}
                className="w-3 h-3 rounded-full"
                style={{ background: n <= metadata.difficulty ? 'var(--secondary)' : 'var(--border)' }}
              />
            ))}
          </div>
          <p className="text-[10px] uppercase tracking-wide font-medium" style={{ color: 'var(--text-muted)' }}>Difficulty</p>
        </div>
      </div>
    </div>
  );
}

function ShiftStats({ metadata }: { metadata: ShiftMetadata }) {
  const start = metadata.start_time;
  const end = metadata.end_time;

  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
  };

  let durationMin = toMinutes(end) - toMinutes(start) - metadata.break_min;
  if (durationMin < 0) durationMin += 24 * 60;
  const hours = Math.floor(durationMin / 60);
  const mins = durationMin % 60;
  const earnings = metadata.hourly_rate ? (metadata.hourly_rate * durationMin) / 60 : null;

  return (
    <div className="grid grid-cols-2 gap-3">
      {[
        { label: 'Workplace', value: metadata.workplace || '—' },
        { label: 'Hours', value: `${hours}h${mins > 0 ? ` ${mins}m` : ''}` },
        { label: 'Start', value: start },
        { label: 'End', value: end },
        { label: 'Break', value: `${metadata.break_min} min` },
        ...(earnings !== null ? [{ label: 'Earnings', value: `€${earnings.toFixed(2)}` }] : []),
      ].map(({ label, value }) => (
        <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
          <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{value}</p>
          <p className="text-[10px] uppercase tracking-wide font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Recent Logs ───────────────────────────────────────────────────────────────

function RecentLogs({ habitId, color }: { habitId: string; color: string }) {
  const [logs, setLogs] = useState<HabitLog[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('habit_logs')
      .select('*')
      .eq('habit_id', habitId)
      .order('completed_at', { ascending: false })
      .limit(10)
      .then(({ data }) => { if (data) setLogs(data); });
  }, [habitId]);

  if (logs.length === 0) return (
    <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No logs yet.</p>
  );

  return (
    <div className="flex flex-col gap-2">
      {logs.map(log => (
        <div
          key={log.id}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
          style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}
        >
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {new Date(log.completed_at + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: color + '20', color }}>
            ✓ Done
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  simple:  { label: 'Simple',  icon: '🎯', color: '#6C63FF' },
  workout: { label: 'Workout', icon: '💪', color: '#FF6B35' },
  reading: { label: 'Reading', icon: '📚', color: '#4ECDC4' },
  study:   { label: 'Study',   icon: '🧠', color: '#45B7D1' },
  shift:   { label: 'Shift',   icon: '🕐', color: '#96CEB4' },
};

export default function HabitDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [userId, setUserId] = useState<string | null>(null);
  const [habit, setHabit] = useState<Habit | null>(null);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const load = useCallback(async () => {
    if (!userId || !id) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const [{ data: h }, { data: logs }] = await Promise.all([
        supabase.from('habits').select('*').eq('id', id).eq('user_id', userId).single(),
        supabase.from('habit_logs').select('completed_at').eq('habit_id', id).gte('completed_at', dateStr(90)),
      ]);
      if (!h) { router.replace('/habits'); return; }
      setHabit(h as Habit);

      const dates = new Set((logs ?? []).map((l: { completed_at: string }) => l.completed_at));
      const isToday = dates.has(TODAY);
      let s = 0;
      let day = isToday ? 0 : 1;
      while (dates.has(dateStr(day))) { s++; day++; }
      setStreak(s);
    } finally {
      setLoading(false);
    }
  }, [userId, id, router]);

  useEffect(() => { load(); }, [load]);

  async function handleEdit(values: HabitFormValues) {
    if (!habit) return;
    await updateHabit(habit.id, values);
    setEditing(false);
    load();
  }

  async function handleDelete() {
    if (!habit || !confirm('Delete this habit? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteHabit(habit.id);
      router.replace('/habits');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 animate-fade-in">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--surface)' }} />
        ))}
      </div>
    );
  }

  if (!habit) return null;

  const typeMeta = TYPE_LABELS[habit.type] ?? TYPE_LABELS.simple;

  return (
    <div className="animate-fade-in flex flex-col gap-5">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm font-medium w-fit"
        style={{ color: 'var(--text-secondary)' }}
      >
        ← Back
      </button>

      {/* Header */}
      <GlassCard>
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
            style={{ background: habit.color + '20', border: `1px solid ${habit.color}30` }}
          >
            {habit.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate" style={{ color: 'var(--text-primary)' }}>{habit.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                style={{ background: typeMeta.color + '20', color: typeMeta.color }}
              >
                {typeMeta.icon} {typeMeta.label}
              </span>
              {streak > 0 && (
                <span className="text-[10px] font-medium" style={{ color: 'var(--secondary)' }}>
                  🔥 {streak}d streak
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setEditing(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-all"
              style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              title="Edit habit"
            >
              ✏️
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-all"
              style={{ background: 'rgba(255,107,107,0.12)', border: '1px solid rgba(255,107,107,0.2)', color: 'var(--error)' }}
              title="Delete habit"
            >
              {deleting ? '…' : '🗑️'}
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Heatmap */}
      <GlassCard>
        <MiniHeatmap habitId={habit.id} color={habit.color} />
      </GlassCard>

      {/* Type-specific stats */}
      {habit.type !== 'simple' && (
        <GlassCard>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
            {typeMeta.label} details
          </p>
          {habit.type === 'workout' && <WorkoutStats metadata={habit.metadata as WorkoutMetadata} />}
          {habit.type === 'reading' && <ReadingStats metadata={habit.metadata as ReadingMetadata} />}
          {habit.type === 'study'   && <StudyStats   metadata={habit.metadata as StudyMetadata} />}
          {habit.type === 'shift'   && <ShiftStats   metadata={habit.metadata as ShiftMetadata} />}
        </GlassCard>
      )}

      {/* Recent logs */}
      <GlassCard>
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
          Recent completions
        </p>
        <RecentLogs habitId={habit.id} color={habit.color} />
      </GlassCard>

      {/* Edit modal */}
      <HabitModal
        mode="edit"
        habit={habit}
        visible={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleEdit}
      />
    </div>
  );
}
