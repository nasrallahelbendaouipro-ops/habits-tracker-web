'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { fetchGoals } from '@/lib/goals';
import { fetchHealthChart, type Period, type MetricKey, type ChartPoint } from '@/lib/health-readings';
import GlassCard from '@/components/ui/GlassCard';
import type { GoalWithHabits } from '@/lib/types';

const METRICS: {
  key: MetricKey;
  label: string;
  icon: string;
  unit: string;
  color: string;
  higherIsBetter?: boolean;
  decimals?: number;
}[] = [
  { key: 'steps',           label: 'Steps',      icon: '👣', unit: 'steps', color: '#f59e0b', higherIsBetter: true },
  { key: 'active_calories', label: 'Calories',   icon: '🔥', unit: 'kcal',  color: '#ef4444', higherIsBetter: true },
  { key: 'weight_kg',       label: 'Weight',     icon: '⚖️', unit: 'kg',    color: 'var(--body)',  decimals: 1 },
  { key: 'sleep_hours',     label: 'Sleep',      icon: '😴', unit: 'hrs',   color: '#a78bfa', decimals: 1 },
  { key: 'heart_rate_avg',  label: 'Heart Rate', icon: '❤️', unit: 'bpm',   color: '#f43f5e', decimals: 0 },
];

const PERIODS: { key: Period; label: string }[] = [
  { key: 'day',     label: 'D' },
  { key: 'week',    label: 'W' },
  { key: 'month',   label: 'M' },
  { key: '6months', label: '6M' },
  { key: 'year',    label: 'Y' },
];

function periodRange(period: Period): string {
  const now = new Date();
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  switch (period) {
    case 'day':     return `Today · ${fmt(now)}`;
    case 'week':    { const s = new Date(now); s.setDate(now.getDate() - 6); return `${fmt(s)} – ${fmt(now)}`; }
    case 'month':   { const s = new Date(now); s.setDate(now.getDate() - 29); return `${fmt(s)} – ${fmt(now)}`; }
    case '6months': { const s = new Date(now); s.setMonth(now.getMonth() - 6); return `${fmt(s)} – ${fmt(now)}`; }
    case 'year':    { const s = new Date(now); s.setFullYear(now.getFullYear() - 1); return `${fmt(s)} – ${fmt(now)}`; }
  }
}

function ChartTooltip({ active, payload, label, unit }: { active?: boolean; payload?: { value: number }[]; label?: string; unit: string }) {
  if (!active || !payload?.length || payload[0].value == null) return null;
  return (
    <div className="px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
      <p style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p>{typeof payload[0].value === 'number' ? payload[0].value.toLocaleString() : payload[0].value} {unit}</p>
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
    <div className="p-4 rounded-2xl" style={{ background: 'var(--surface)', border: `1px solid color-mix(in srgb, ${goal.color} 20%, transparent)`, borderLeft: `3px solid ${goal.color}` }}>
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
  const [userId, setUserId]             = useState<string | null>(null);
  const [goals, setGoals]               = useState<GoalWithHabits[]>([]);
  const [activeMetric, setActiveMetric] = useState<MetricKey>('steps');
  const [activePeriod, setActivePeriod] = useState<Period>('week');
  const [chartData, setChartData]       = useState<ChartPoint[]>([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [points, goalsData] = await Promise.all([
        fetchHealthChart(userId, activeMetric, activePeriod),
        fetchGoals(userId),
      ]);
      setChartData(points);
      setGoals(goalsData.filter(g => g.dimension === 'body' && g.starting_point != null));
    } finally {
      setLoading(false);
    }
  }, [userId, activeMetric, activePeriod]);

  useEffect(() => { load(); }, [load]);

  const metric   = METRICS.find(m => m.key === activeMetric)!;
  const nonNull  = chartData.filter(d => d.value != null) as { label: string; value: number }[];
  const total    = nonNull.reduce((s, d) => s + d.value, 0);
  const avg      = nonNull.length ? total / nonNull.length : null;
  const stat     = activePeriod === 'day' ? (total || null) : avg;
  const decimals = metric.decimals ?? 0;
  const lastIdx  = chartData.map(d => d.value).lastIndexOf(nonNull[nonNull.length - 1]?.value ?? -1);

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="mb-5">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>💪 Body Metrics</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Synced from iPhone Health · iOS Shortcuts</p>
      </div>

      {/* Metric tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
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

      {/* Period tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: 'var(--surface)' }}>
        {PERIODS.map(p => {
          const active = activePeriod === p.key;
          return (
            <button
              key={p.key}
              onClick={() => setActivePeriod(p.key)}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{
                background: active ? metric.color : 'transparent',
                color: active ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Stat card */}
      <GlassCard className="mb-5">
        <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
          {activePeriod === 'day' ? 'Total today' : 'Average'}
        </p>
        {stat != null ? (
          <p className="text-4xl font-bold" style={{ color: metric.color }}>
            {stat.toLocaleString('en-US', { maximumFractionDigits: decimals })}
            <span className="text-base font-normal ml-1" style={{ color: 'var(--text-muted)' }}>{metric.unit}</span>
          </p>
        ) : (
          <p className="text-2xl font-bold" style={{ color: 'var(--text-muted)' }}>—</p>
        )}
        <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{periodRange(activePeriod)}</p>
      </GlassCard>

      {/* Bar chart */}
      <GlassCard className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--text-muted)' }}>
          {metric.label} · {PERIODS.find(p => p.key === activePeriod)?.label}
        </p>
        {loading ? (
          <div className="h-48 animate-pulse rounded-xl" style={{ background: 'var(--surface-elevated)' }} />
        ) : nonNull.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-center">
            <div>
              <p className="text-3xl mb-2">📊</p>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>No data yet</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Run your iPhone Shortcut to sync data
              </p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }} barCategoryGap="25%">
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                axisLine={false}
                tickLine={false}
                domain={[0, 'auto']}
                tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)}
              />
              <Tooltip content={<ChartTooltip unit={metric.unit} />} cursor={{ fill: 'var(--surface-elevated)' }} />
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={i === lastIdx ? metric.color : `color-mix(in srgb, ${metric.color} 40%, transparent)`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </GlassCard>

      {/* Body goals */}
      {goals.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
            Body Goals — KPI Progress
          </p>
          <div className="flex flex-col gap-3">
            {goals.map(g => <GoalKpiCard key={g.id} goal={g} />)}
          </div>
        </div>
      )}
    </div>
  );
}
