'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { fetchRecentCheckins } from '@/lib/checkin';
import { fetchGoals } from '@/lib/goals';
import GlassCard from '@/components/ui/GlassCard';
import { useChartTheme } from '@/lib/chart-theme';
import type { GoalWithHabits } from '@/lib/types';

type MetricKey = 'screen_time_min' | 'social_media_min' | 'deep_work_min' | 'productivity_ratio';

const METRICS: { key: MetricKey; label: string; icon: string; unit: string; color: string; lowerIsBetter?: boolean }[] = [
  { key: 'screen_time_min',  label: 'Screen Time',  icon: '📱', unit: 'min', color: 'var(--mind)',       lowerIsBetter: true  },
  { key: 'social_media_min', label: 'Social Media', icon: '💬', unit: 'min', color: 'var(--secondary)',   lowerIsBetter: true  },
  { key: 'deep_work_min',    label: 'Deep Work',    icon: '🧠', unit: 'min', color: 'var(--mind)'                              },
  { key: 'productivity_ratio', label: 'Productivity', icon: '⚡', unit: '%',  color: 'var(--success)'                          },
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

export default function MindPage() {
  const [userId, setUserId]             = useState<string | null>(null);
  const [chartData, setChartData]       = useState<Record<string, unknown>[]>([]);
  const [goals, setGoals]               = useState<GoalWithHabits[]>([]);
  const [activeMetric, setActiveMetric] = useState<MetricKey>('screen_time_min');
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => { if (data.user) setUserId(data.user.id); });
  }, []);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [checkins, goalsData] = await Promise.all([
        fetchRecentCheckins(userId, 60),
        fetchGoals(userId),
      ]);

      const data = checkins
        .filter(c => c.mind_metrics && Object.keys(c.mind_metrics).length > 0)
        .map(c => {
          const m = c.mind_metrics;
          const screen = m.screen_time_min ?? 0;
          const deep   = m.deep_work_min   ?? 0;
          const ratio  = screen > 0 ? Math.round((deep / screen) * 100) : null;
          return {
            date: new Date(c.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            screen_time_min:  m.screen_time_min  ?? null,
            social_media_min: m.social_media_min ?? null,
            deep_work_min:    m.deep_work_min    ?? null,
            productivity_ratio: ratio,
          };
        });

      setChartData(data);
      setGoals(goalsData.filter(g => g.dimension === 'mind' && g.starting_point != null));
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

  // For "lower is better" metrics, invert the color logic
  const deltaColor = delta == null
    ? 'var(--text-muted)'
    : metric.lowerIsBetter
      ? (delta < 0 ? 'var(--success)' : delta > 0 ? 'var(--error)' : 'var(--text-muted)')
      : (delta > 0 ? 'var(--success)' : delta < 0 ? 'var(--error)' : 'var(--text-muted)');

  // Summary stats over available data
  const avgScreenTime  = chartData.length > 0 ? Math.round(chartData.reduce((s, d) => s + ((d.screen_time_min as number) ?? 0), 0) / chartData.length) : null;
  const avgDeepWork    = chartData.length > 0 ? Math.round(chartData.reduce((s, d) => s + ((d.deep_work_min as number) ?? 0), 0) / chartData.length) : null;
  const avgProductivity = chartData.filter(d => d.productivity_ratio != null).length > 0
    ? Math.round(chartData.filter(d => d.productivity_ratio != null).reduce((s, d) => s + (d.productivity_ratio as number), 0) / chartData.filter(d => d.productivity_ratio != null).length)
    : null;

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>🧠 Digital Behavior</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Last 60 days · logged via daily check-in</p>
      </div>

      {/* Summary stats */}
      {!loading && chartData.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <GlassCard style={{ padding: 12, textAlign: 'center' }}>
            <p className="text-2xl font-bold" style={{ color: 'var(--mind)' }}>{avgScreenTime ?? '—'}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide mt-1" style={{ color: 'var(--text-muted)' }}>Avg screen/day (min)</p>
          </GlassCard>
          <GlassCard style={{ padding: 12, textAlign: 'center' }}>
            <p className="text-2xl font-bold" style={{ color: 'var(--mind)' }}>{avgDeepWork ?? '—'}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide mt-1" style={{ color: 'var(--text-muted)' }}>Avg deep work (min)</p>
          </GlassCard>
          <GlassCard style={{ padding: 12, textAlign: 'center' }}>
            <p className="text-2xl font-bold" style={{ color: avgProductivity != null && avgProductivity >= 50 ? 'var(--success)' : avgProductivity != null && avgProductivity >= 30 ? 'var(--warning)' : 'var(--error)' }}>
              {avgProductivity != null ? `${avgProductivity}%` : '—'}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wide mt-1" style={{ color: 'var(--text-muted)' }}>Avg productivity</p>
          </GlassCard>
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
                  {delta > 0 ? '+' : ''}{metric.key === 'productivity_ratio' ? delta.toFixed(0) : delta} {metric.unit}
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
                domain={activeMetric === 'productivity_ratio' ? [0, 100] : ['auto', 'auto']}
                tickFormatter={activeMetric === 'productivity_ratio' ? (v: number) => `${v}%` : undefined}
              />
              <Tooltip content={<ChartTooltip unit={metric.unit} />} contentStyle={chart.tooltipStyle} />
              {activeMetric === 'productivity_ratio' && (
                <ReferenceLine y={50} stroke={chart.refLineStroke} strokeDasharray="4 4" />
              )}
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

      {/* Productivity breakdown (when screen + deep work data exists) */}
      {!loading && chartData.length > 0 && activeMetric !== 'productivity_ratio' && (() => {
        const last = chartData[chartData.length - 1];
        const screen = last?.screen_time_min as number | null;
        const deep   = last?.deep_work_min   as number | null;
        const social = last?.social_media_min as number | null;
        if (!screen || screen === 0) return null;
        const deepPct   = deep   ? Math.round((deep / screen) * 100)   : 0;
        const socialPct = social ? Math.round((social / screen) * 100) : 0;
        const otherPct  = Math.max(0, 100 - deepPct - socialPct);
        return (
          <GlassCard className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--text-muted)' }}>
              Latest Session Breakdown
            </p>
            <div className="space-y-3">
              {[
                { label: 'Deep Work', pct: deepPct, color: 'var(--mind)', icon: '🧠' },
                { label: 'Social Media', pct: socialPct, color: 'var(--secondary)', icon: '💬' },
                { label: 'Other', pct: otherPct, color: 'var(--border)', icon: '📱' },
              ].map(({ label, pct, color, icon }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-sm w-5">{icon}</span>
                  <span className="text-xs w-24 flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-elevated)' }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <span className="text-xs font-semibold w-9 text-right" style={{ color }}>{pct}%</span>
                </div>
              ))}
            </div>
          </GlassCard>
        );
      })()}

      {/* Goal KPI progress */}
      {goals.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>Mind Goals — KPI Progress</p>
          <div className="flex flex-col gap-3">
            {goals.map(g => <GoalKpiCard key={g.id} goal={g} />)}
          </div>
        </div>
      )}
    </div>
  );
}
