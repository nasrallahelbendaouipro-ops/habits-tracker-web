'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { fetchRecentCheckins } from '@/lib/checkin';
import { fetchHabitsWithStatus } from '@/lib/habits';
import { fetchGoals } from '@/lib/goals';
import GlassCard from '@/components/ui/GlassCard';
import { useChartTheme } from '@/lib/chart-theme';
import type { GoalWithHabits, HabitWithStreak } from '@/lib/types';

type MetricKey = 'gratitude_score' | 'meditation_quality' | 'stress_level';

const METRICS: { key: MetricKey; label: string; icon: string; unit: string; color: string; lowerIsBetter?: boolean }[] = [
  { key: 'gratitude_score',    label: 'Gratitude',  icon: '🙏', unit: '/10', color: 'var(--soul)'  },
  { key: 'meditation_quality', label: 'Meditation', icon: '🧘', unit: '/10', color: 'var(--soul)'  },
  { key: 'stress_level',       label: 'Stress',     icon: '😤', unit: '/10', color: 'var(--warning)', lowerIsBetter: true },
];

function ChartTooltip({ active, payload, label, unit }: { active?: boolean; payload?: { value: number }[]; label?: string; unit: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
      <p style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p>{payload[0].value}{unit}</p>
    </div>
  );
}

function GoalKpiCard({ goal }: { goal: GoalWithHabits }) {
  if (goal.starting_point == null || goal.target_point == null || goal.current_value == null) return null;
  const pct = Math.max(0, Math.min(100, Math.round(
    ((goal.current_value - goal.starting_point) / (goal.target_point - goal.starting_point)) * 100
  )));
  const remaining = Math.abs(goal.target_point - goal.current_value);
  return (
    <div className="p-4 rounded-2xl" style={{ background: 'var(--surface)', border: `1px solid ${goal.color}30`, borderLeft: `3px solid ${goal.color}` }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{goal.icon}</span>
        <div className="flex-1">
          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{goal.title}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{goal.current_value} → {goal.target_point} {goal.unit}</p>
        </div>
        <span className="text-lg font-bold" style={{ color: goal.color }}>{pct}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: 'var(--surface-elevated)' }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: goal.color }} />
      </div>
      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
        {remaining} {goal.unit} remaining
        {goal.deadline && ` · Deadline: ${new Date(goal.deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
      </p>
    </div>
  );
}

function HabitStreakCard({ habit }: { habit: HabitWithStreak }) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-2xl"
      style={{ background: 'var(--surface)', border: `1px solid ${habit.completedToday ? habit.color + '50' : 'var(--border)'}` }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ background: habit.color + '20', border: `1px solid ${habit.color}40` }}
      >
        {habit.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{habit.name}</p>
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {habit.streak > 0 ? `🔥 ${habit.streak} day streak` : 'No active streak'}
        </p>
      </div>
      {habit.completedToday && (
        <span
          className="text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0"
          style={{ background: 'var(--success-muted)', color: 'var(--success)' }}
        >
          Done ✓
        </span>
      )}
    </div>
  );
}

export default function SoulPage() {
  const [userId, setUserId]             = useState<string | null>(null);
  const [chartData, setChartData]       = useState<Record<string, unknown>[]>([]);
  const [habits, setHabits]             = useState<HabitWithStreak[]>([]);
  const [goals, setGoals]               = useState<GoalWithHabits[]>([]);
  const [activeMetric, setActiveMetric] = useState<MetricKey>('gratitude_score');
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => { if (data.user) setUserId(data.user.id); });
  }, []);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [checkins, habitsData, goalsData] = await Promise.all([
        fetchRecentCheckins(userId, 60),
        fetchHabitsWithStatus(userId, undefined, 'soul'),
        fetchGoals(userId),
      ]);

      const data = checkins
        .filter(c => c.soul_metrics && Object.keys(c.soul_metrics).length > 0)
        .map(c => {
          const s = c.soul_metrics;
          return {
            date: new Date(c.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            gratitude_score:    s.gratitude_score    ?? null,
            meditation_quality: s.meditation_quality ?? null,
            stress_level:       s.stress_level       ?? null,
          };
        });

      setChartData(data);
      setHabits(habitsData);
      setGoals(goalsData.filter(g => g.dimension === 'soul' && g.starting_point != null));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const chart      = useChartTheme();
  const metric     = METRICS.find(m => m.key === activeMetric)!;
  const metricData = chartData.filter(d => d[activeMetric] != null);

  const latest = metricData.length > 0 ? (metricData[metricData.length - 1][activeMetric] as number) : null;
  const prev   = metricData.length > 1 ? (metricData[metricData.length - 2][activeMetric] as number) : null;
  const delta  = latest != null && prev != null ? latest - prev : null;

  const deltaColor = delta == null
    ? 'var(--text-muted)'
    : metric.lowerIsBetter
      ? (delta < 0 ? 'var(--success)' : delta > 0 ? 'var(--error)' : 'var(--text-muted)')
      : (delta > 0 ? 'var(--success)' : delta < 0 ? 'var(--error)' : 'var(--text-muted)');

  const avgOf = (key: MetricKey) => {
    const vals = chartData.filter(d => d[key] != null).map(d => d[key] as number);
    return vals.length > 0 ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1) : null;
  };
  const avgGratitude  = avgOf('gratitude_score');
  const avgMeditation = avgOf('meditation_quality');
  const avgStress     = avgOf('stress_level');

  const stressColor = avgStress == null
    ? 'var(--text-primary)'
    : parseFloat(avgStress) <= 4 ? 'var(--success)'
    : parseFloat(avgStress) <= 7 ? 'var(--warning)'
    : 'var(--error)';

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>✨ Soul Growth</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Last 60 days · logged via daily check-in</p>
      </div>

      {/* Summary stats */}
      {!loading && chartData.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <GlassCard style={{ padding: 12, textAlign: 'center' }}>
            <p className="text-2xl font-bold" style={{ color: 'var(--soul)' }}>{avgGratitude ?? '—'}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide mt-1" style={{ color: 'var(--text-muted)' }}>Avg gratitude /10</p>
          </GlassCard>
          <GlassCard style={{ padding: 12, textAlign: 'center' }}>
            <p className="text-2xl font-bold" style={{ color: 'var(--soul)' }}>{avgMeditation ?? '—'}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide mt-1" style={{ color: 'var(--text-muted)' }}>Avg meditation /10</p>
          </GlassCard>
          <GlassCard style={{ padding: 12, textAlign: 'center' }}>
            <p className="text-2xl font-bold" style={{ color: stressColor }}>{avgStress ?? '—'}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide mt-1" style={{ color: 'var(--text-muted)' }}>Avg stress /10</p>
          </GlassCard>
        </div>
      )}

      {/* Soul habit streaks */}
      {!loading && (
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>Soul Habits</p>
          {habits.length === 0 ? (
            <GlassCard>
              <div className="py-4 text-center">
                <p className="text-2xl mb-2">🧘</p>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>No soul habits yet</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Add meditation, prayer, or journaling habits to track your practice</p>
              </div>
            </GlassCard>
          ) : (
            <div className="flex flex-col gap-2">
              {habits.map(h => <HabitStreakCard key={h.id} habit={h} />)}
            </div>
          )}
        </div>
      )}

      {/* Metric tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto">
        {METRICS.map(m => {
          const active = activeMetric === m.key;
          return (
            <button
              key={m.key}
              onClick={() => setActiveMetric(m.key)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold flex-shrink-0 transition-all"
              style={{
                background: active ? `color-mix(in srgb, ${m.color} 15%, transparent)` : 'var(--surface)',
                border: `1px solid ${active ? m.color : 'var(--border)'}`,
                color: active ? m.color : 'var(--text-secondary)',
              }}
            >
              {m.icon} {m.label}
            </button>
          );
        })}
      </div>

      {/* Latest value card */}
      {latest != null && (
        <GlassCard className="mb-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Latest {metric.label}</p>
              <p className="text-4xl font-bold" style={{ color: metric.color }}>
                {latest}
                <span className="text-base font-normal ml-1" style={{ color: 'var(--text-muted)' }}>{metric.unit}</span>
              </p>
              {metric.lowerIsBetter && (
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Lower is better</p>
              )}
            </div>
            {delta != null && (
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>vs previous</p>
                <p className="text-2xl font-bold" style={{ color: deltaColor }}>
                  {delta > 0 ? '+' : ''}{delta.toFixed(1)} {metric.unit}
                </p>
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {/* Trend chart */}
      <GlassCard className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--text-muted)' }}>
          {metric.label} Trend
        </p>
        {loading ? (
          <div className="h-40 animate-pulse rounded-xl" style={{ background: 'var(--surface-elevated)' }} />
        ) : metricData.length < 2 ? (
          <div className="h-40 flex items-center justify-center text-center">
            <div>
              <p className="text-3xl mb-2">📊</p>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>No data yet</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Log {metric.label.toLowerCase()} in your daily check-in to see trends</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={metricData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: chart.tickFill }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis
                tick={{ fontSize: 10, fill: chart.tickFill }}
                axisLine={false}
                tickLine={false}
                domain={[0, 10]}
                ticks={[0, 2, 4, 6, 8, 10]}
              />
              <Tooltip content={<ChartTooltip unit={metric.unit} />} contentStyle={chart.tooltipStyle} />
              <ReferenceLine y={5} stroke={chart.refLineStroke} strokeDasharray="4 4" />
              <Line
                type="monotone"
                dataKey={activeMetric}
                stroke={metric.color}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: metric.color }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </GlassCard>

      {/* Goal KPI progress */}
      {goals.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>Soul Goals — KPI Progress</p>
          <div className="flex flex-col gap-3">
            {goals.map(g => <GoalKpiCard key={g.id} goal={g} />)}
          </div>
        </div>
      )}
    </div>
  );
}
