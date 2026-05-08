'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { fetchHabitsWithStatus } from '@/lib/habits';
import { calcDisciplineScore, dailyCompletionMap, weeklyTotals, habitCompletionRate } from '@/lib/analytics';
import { dateStr, TODAY } from '@/lib/utils';
import GlassCard from '@/components/ui/GlassCard';
import ProgressRing from '@/components/charts/ProgressRing';
import type { HabitWithStreak, HabitLog } from '@/lib/types';

// ─── Heatmap (16 weeks) ────────────────────────────────────────────────────────

function Heatmap({ logMap, totalHabits }: { logMap: Map<string, number>; totalHabits: number }) {
  const WEEKS = 16;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cols: { weekLabel: string; days: { date: string; count: number }[] }[] = [];
  for (let w = WEEKS - 1; w >= 0; w--) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() - w * 7);
    const label = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const days: { date: string; count: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + d);
      const y = day.getFullYear(), m = day.getMonth() + 1, dd = day.getDate();
      const iso = `${y}-${String(m).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
      days.push({ date: iso, count: logMap.get(iso) ?? 0 });
    }
    cols.push({ weekLabel: label, days });
  }

  const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  function cellColor(count: number) {
    if (count === 0 || totalHabits === 0) return 'var(--border)';
    const ratio = Math.min(count / totalHabits, 1);
    if (ratio < 0.34) return 'rgba(108,99,255,0.35)';
    if (ratio < 0.67) return 'rgba(108,99,255,0.6)';
    return '#6C63FF';
  }

  return (
    <div>
      <div className="flex gap-0.5" style={{ overflowX: 'auto' }}>
        {/* Day-of-week labels */}
        <div className="flex flex-col gap-0.5 mr-1 flex-shrink-0">
          <div className="h-4" />
          {DAY_LABELS.map((l, i) => (
            <div key={i} className="w-3 h-3 flex items-center justify-center" style={{ fontSize: 8, color: 'var(--text-muted)' }}>
              {i % 2 === 1 ? l : ''}
            </div>
          ))}
        </div>
        {/* Week columns */}
        {cols.map((col, wi) => (
          <div key={wi} className="flex flex-col gap-0.5 flex-shrink-0">
            <div className="h-4 flex items-center" style={{ fontSize: 8, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {wi % 4 === 0 ? col.weekLabel : ''}
            </div>
            {col.days.map((day, di) => {
              const isFuture = day.date > TODAY;
              const isToday  = day.date === TODAY;
              return (
                <div
                  key={di}
                  title={`${day.date}: ${day.count} habit${day.count !== 1 ? 's' : ''}`}
                  className="w-3 h-3 rounded-sm"
                  style={{
                    background: isFuture ? 'transparent' : cellColor(day.count),
                    opacity: isFuture ? 0 : 1,
                    outline: isToday ? '1.5px solid #6C63FF' : 'none',
                    outlineOffset: '1px',
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3 justify-end">
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Less</span>
        {['var(--border)', 'rgba(108,99,255,0.35)', 'rgba(108,99,255,0.6)', '#6C63FF'].map((c, i) => (
          <div key={i} className="w-3 h-3 rounded-sm" style={{ background: c }} />
        ))}
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>More</span>
      </div>
    </div>
  );
}

// ─── Custom tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-xl text-xs font-semibold"
      style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
    >
      <p style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p>{payload[0].value}% completed</p>
    </div>
  );
}

// ─── Habit stat row ────────────────────────────────────────────────────────────

function HabitStatRow({ habit, rate }: { habit: HabitWithStreak; rate: number }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ background: habit.color + '20', border: `1px solid ${habit.color}30` }}
      >
        {habit.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {habit.name}
          </span>
          <span className="text-xs font-bold ml-2 flex-shrink-0" style={{ color: habit.color }}>
            {rate}%
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${rate}%`, background: habit.color }}
          />
        </div>
      </div>
      {habit.streak > 0 && (
        <span className="text-xs font-medium flex-shrink-0" style={{ color: 'var(--secondary)' }}>
          🔥{habit.streak}d
        </span>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [userId, setUserId]   = useState<string | null>(null);
  const [habits, setHabits]   = useState<HabitWithStreak[]>([]);
  const [logs, setLogs]       = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const [habitsData, logsRes] = await Promise.all([
        fetchHabitsWithStatus(userId),
        supabase
          .from('habit_logs')
          .select('*')
          .eq('user_id', userId)
          .gte('completed_at', dateStr(365)),
      ]);
      setHabits(habitsData);
      setLogs((logsRes.data ?? []) as HabitLog[]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="animate-fade-in flex flex-col gap-4">
        <div className="h-8 w-40 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }} />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'var(--surface)' }} />)}
        </div>
        {[1, 2, 3].map(i => <div key={i} className="h-48 rounded-2xl animate-pulse" style={{ background: 'var(--surface)' }} />)}
      </div>
    );
  }

  if (habits.length === 0) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center py-20 text-center">
        <div className="text-5xl mb-4">📊</div>
        <p className="font-semibold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>No data yet</p>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Create some habits and start tracking to see your analytics.
        </p>
      </div>
    );
  }

  const completed  = habits.filter(h => h.completedToday).length;
  const todayPct   = Math.round((completed / habits.length) * 100);
  const bestStreak = Math.max(...habits.map(h => h.streak));
  const discScore  = calcDisciplineScore(habits, logs);
  const logMap     = dailyCompletionMap(logs);
  const weekly     = weeklyTotals(habits, logs, 8);
  const sorted     = [...habits].sort((a, b) => b.streak - a.streak);

  return (
    <div className="animate-fade-in flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Analytics</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {habits.length} habit{habits.length !== 1 ? 's' : ''} · last 365 days
        </p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        <GlassCard style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <ProgressRing pct={todayPct} size={72} color="#6C63FF" />
          <p className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: 'var(--text-muted)' }}>Today</p>
        </GlassCard>

        <GlassCard style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <span className="text-3xl">🔥</span>
          <p className="font-bold text-xl leading-none" style={{ color: 'var(--text-primary)' }}>{bestStreak}d</p>
          <p className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: 'var(--text-muted)' }}>Best streak</p>
        </GlassCard>

        <GlassCard style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <span className="text-3xl">⚡</span>
          <p className="font-bold text-xl leading-none" style={{ color: 'var(--text-primary)' }}>{discScore}</p>
          <p className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: 'var(--text-muted)' }}>Score /100</p>
        </GlassCard>
      </div>

      {/* Heatmap */}
      <GlassCard>
        <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--text-muted)' }}>
          Activity — last 16 weeks
        </p>
        <Heatmap logMap={logMap} totalHabits={habits.length} />
      </GlassCard>

      {/* Weekly bar chart */}
      {mounted && (
        <GlassCard>
          <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--text-muted)' }}>
            Weekly completion — last 8 weeks
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weekly} barSize={22} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#5E5A78' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={v => `${v}%`}
                tick={{ fontSize: 10, fill: '#5E5A78' }}
                axisLine={false}
                tickLine={false}
                ticks={[0, 25, 50, 75, 100]}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(108,99,255,0.06)' }} />
              <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                {weekly.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      entry.pct === 100 ? '#4ECDC4'
                      : entry.pct >= 70   ? '#6C63FF'
                      : entry.pct >= 40   ? '#6C63FF99'
                      : '#6C63FF44'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 justify-center flex-wrap">
            {[
              { label: '< 40%', color: '#6C63FF44' },
              { label: '40–70%', color: '#6C63FF99' },
              { label: '70–99%', color: '#6C63FF' },
              { label: '100% 🎉', color: '#4ECDC4' },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Per-habit 30-day stats */}
      <GlassCard>
        <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--text-muted)' }}>
          Habits — 30-day completion rate
        </p>
        <div className="flex flex-col gap-4">
          {sorted.map(habit => (
            <HabitStatRow
              key={habit.id}
              habit={habit}
              rate={habitCompletionRate(habit.id, logs, 30)}
            />
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
