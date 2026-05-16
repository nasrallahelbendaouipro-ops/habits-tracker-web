'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { fetchRecentCheckins } from '@/lib/checkin';
import { fetchGoals } from '@/lib/goals';
import GlassCard from '@/components/ui/GlassCard';
import type { GoalWithHabits } from '@/lib/types';

type MetricKey = 'weight' | 'sleep_hours' | 'mood' | 'body_fat' | 'steps' | 'active_calories';

const METRICS: { key: MetricKey; label: string; icon: string; unit: string; color: string; max?: number; higherIsBetter?: boolean }[] = [
  { key: 'weight',           label: 'Weight',     icon: '⚖️', unit: 'kg',   color: 'var(--body)'  },
  { key: 'sleep_hours',      label: 'Sleep',      icon: '😴', unit: 'hrs',  color: '#a78bfa'       },
  { key: 'mood',             label: 'Mood',       icon: '😊', unit: '/10',  color: 'var(--mind)',  max: 10 },
  { key: 'body_fat',         label: 'Body Fat',   icon: '📊', unit: '%',    color: 'var(--secondary)' },
  { key: 'steps',            label: 'Steps',      icon: '👣', unit: 'steps', color: '#f59e0b', higherIsBetter: true },
  { key: 'active_calories',  label: 'Calories',   icon: '🔥', unit: 'kcal', color: '#ef4444', higherIsBetter: true },
];

function ChartTooltip({ active, payload, label, unit }: { active?: boolean; payload?: { value: number }[]; label?: string; unit: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
      <p style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p>{payload[0].value} {unit}</p>
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

export default function BodyPage() {
  const [userId, setUserId]           = useState<string | null>(null);
  const [chartData, setChartData]     = useState<Record<string, unknown>[]>([]);
  const [goals, setGoals]             = useState<GoalWithHabits[]>([]);
  const [activeMetric, setActiveMetric] = useState<MetricKey>('weight');
  const [loading, setLoading]         = useState(true);

  useEffect(() => { createClient().auth.getUser().then(({ data }) => { if (data.user) setUserId(data.user.id); }); }, []);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [checkins, goalsData] = await Promise.all([
        fetchRecentCheckins(userId, 60),
        fetchGoals(userId),
      ]);
      const data = checkins
        .filter(c => c.body_metrics && Object.keys(c.body_metrics).length > 0)
        .map(c => ({
          date: new Date(c.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          ...c.body_metrics,
        }));
      setChartData(data);
      setGoals(goalsData.filter(g => g.dimension === 'body' && g.starting_point != null));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const metric = METRICS.find(m => m.key === activeMetric)!;
  const metricData = chartData.filter(d => d[activeMetric] != null);

  // Latest value
  const latest = metricData.length > 0 ? (metricData[metricData.length - 1][activeMetric] as number) : null;
  const prev   = metricData.length > 1 ? (metricData[metricData.length - 2][activeMetric] as number) : null;
  const delta  = latest != null && prev != null ? latest - prev : null;

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>💪 Body Metrics</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Last 60 days · logged via daily check-in</p>
      </div>

      {/* Metric tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto">
        {METRICS.map(m => {
          const active = activeMetric === m.key;
          return (
            <button
              key={m.key}
              onClick={() => setActiveMetric(m.key)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold flex-shrink-0 transition-all"
              style={{ background: active ? m.color + '20' : 'var(--surface)', border: `1px solid ${active ? m.color : 'var(--border)'}`, color: active ? m.color : 'var(--text-secondary)' }}
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
              <p className="text-4xl font-bold" style={{ color: metric.color }}>{latest}<span className="text-base font-normal ml-1" style={{ color: 'var(--text-muted)' }}>{metric.unit}</span></p>
            </div>
            {delta != null && (
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Change</p>
                <p className="text-2xl font-bold" style={{ color: delta === 0 ? 'var(--text-muted)' : (delta > 0) === !!metric.higherIsBetter ? 'var(--success)' : 'var(--error)' }}>
                  {delta > 0 ? '+' : ''}{delta.toFixed(metric.key === 'steps' || metric.key === 'active_calories' ? 0 : 1)} {metric.unit}
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
            <BarChart data={metricData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barCategoryGap="30%">
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#5E5A78' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#5E5A78' }} axisLine={false} tickLine={false} domain={[0, 'auto']} />
              <Tooltip content={<ChartTooltip unit={metric.unit} />} cursor={{ fill: 'var(--surface-elevated)' }} />
              <Bar dataKey={activeMetric} radius={[4, 4, 0, 0]}>
                {metricData.map((_, i) => (
                  <Cell key={i} fill={i === metricData.length - 1 ? metric.color : metric.color + '99'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </GlassCard>

      {/* Goal KPI progress */}
      {goals.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>Body Goals — KPI Progress</p>
          <div className="flex flex-col gap-3">
            {goals.map(g => <GoalKpiCard key={g.id} goal={g} />)}
          </div>
        </div>
      )}
    </div>
  );
}
