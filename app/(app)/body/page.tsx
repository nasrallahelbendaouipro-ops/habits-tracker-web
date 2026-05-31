'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Footprints, Flame, Scale, BedDouble, Heart, Activity, BarChart2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { fetchGoals } from '@/lib/goals';
import { fetchHealthChart, type Period, type MetricKey, type ChartPoint } from '@/lib/health-readings';
import GlassCard from '@/components/ui/GlassCard';
import { useChartTheme } from '@/lib/chart-theme';
import { useLocale, LOCALE_DATE_TAG } from '@/lib/i18n';
import type { GoalWithHabits } from '@/lib/types';

const METRICS: {
  key: MetricKey;
  label: string;
  Icon: LucideIcon;
  unit: string;
  color: string;
  higherIsBetter?: boolean;
  decimals?: number;
}[] = [
  { key: 'steps',           label: 'Pas',         Icon: Footprints, unit: 'pas',  color: 'var(--warning)', higherIsBetter: true },
  { key: 'active_calories', label: 'Calories',    Icon: Flame,      unit: 'kcal', color: 'var(--body)',    higherIsBetter: true },
  { key: 'weight_kg',       label: 'Poids',       Icon: Scale,      unit: 'kg',   color: 'var(--body)',    decimals: 1          },
  { key: 'sleep_hours',     label: 'Sommeil',     Icon: BedDouble,  unit: 'h',    color: 'var(--soul)',    decimals: 1          },
  { key: 'heart_rate_avg',  label: 'Fréq. card.', Icon: Heart,      unit: 'bpm',  color: 'var(--error)',   decimals: 0          },
];

const PERIODS: { key: Period; label: string }[] = [
  { key: 'day',     label: 'J'  },
  { key: 'week',    label: 'S'  },
  { key: 'month',   label: 'M'  },
  { key: '6months', label: '6M' },
  { key: 'year',    label: 'A'  },
];

function periodRange(period: Period): string {
  const now = new Date();
  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  switch (period) {
    case 'day':     return `Aujourd'hui · ${fmt(now)}`;
    case 'week':    { const s = new Date(now); s.setDate(now.getDate() - 6); return `${fmt(s)} – ${fmt(now)}`; }
    case 'month':   { const s = new Date(now); s.setDate(now.getDate() - 29); return `${fmt(s)} – ${fmt(now)}`; }
    case '6months': { const s = new Date(now); s.setMonth(now.getMonth() - 6); return `${fmt(s)} – ${fmt(now)}`; }
    case 'year':    { const s = new Date(now); s.setFullYear(now.getFullYear() - 1); return `${fmt(s)} – ${fmt(now)}`; }
  }
}

function statLabel(period: Period) {
  return period === 'day' ? "TOTAL AUJOURD'HUI" : 'MOYENNE';
}

function ChartTooltip({ active, payload, label, unit }: { active?: boolean; payload?: { value: number }[]; label?: string; unit: string }) {
  if (!active || !payload?.length || payload[0].value == null) return null;
  return (
    <div className="px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
      <p style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p>{typeof payload[0].value === 'number' ? payload[0].value.toLocaleString('fr-FR') : payload[0].value} {unit}</p>
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
        {remaining} {goal.unit} restants
        {goal.deadline && ` · Échéance : ${new Date(goal.deadline + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}`}
      </p>
    </div>
  );
}

export default function BodyPage() {
  const { locale } = useLocale();
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
        fetchHealthChart(userId, activeMetric, activePeriod, LOCALE_DATE_TAG[locale]),
        fetchGoals(userId),
      ]);
      setChartData(points);
      setGoals(goalsData.filter(g => g.dimension === 'body' && g.starting_point != null));
    } finally {
      setLoading(false);
    }
  }, [userId, activeMetric, activePeriod, locale]);

  useEffect(() => { load(); }, [load]);

  const chart   = useChartTheme();
  const metric  = METRICS.find(m => m.key === activeMetric)!;
  const nonNull = chartData.filter(d => d.value != null) as { label: string; value: number }[];

  const total    = nonNull.reduce((s, d) => s + d.value, 0);
  const avg      = nonNull.length ? total / nonNull.length : null;
  const stat     = activePeriod === 'day' ? (total || null) : avg;
  const decimals = metric.decimals ?? 0;

  // Highlight the most recent non-null bar
  const lastIdx  = chartData.reduce<number>((best, d, i) => d.value != null ? i : best, -1);

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="mb-5">
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Activity size={22} style={{ color: 'var(--primary)' }} /> Body Metrics
        </h1>
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
              <m.Icon size={14} /> {m.label}
            </button>
          );
        })}
      </div>

      {/* Period tabs — like iPhone Health */}
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
          {statLabel(activePeriod)}
        </p>
        {stat != null ? (
          <p className="text-4xl font-bold" style={{ color: metric.color }}>
            {stat.toLocaleString('fr-FR', { maximumFractionDigits: decimals })}
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
              <div className="flex justify-center mb-2" style={{ color: 'var(--text-muted)' }}><BarChart2 size={32} /></div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Aucune donnée</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Lance le raccourci iPhone pour synchroniser
              </p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 4, bottom: 0, left: -10 }}
              barCategoryGap="25%"
            >
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: chart.tickFill }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 9, fill: chart.tickFill }}
                axisLine={false}
                tickLine={false}
                domain={[0, 'auto']}
                tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)}
              />
              <Tooltip content={<ChartTooltip unit={metric.unit} />} contentStyle={chart.tooltipStyle} cursor={{ fill: chart.cursorFill }} />
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={i === lastIdx ? metric.color : metric.color + '60'}
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
            Objectifs Body
          </p>
          <div className="flex flex-col gap-3">
            {goals.map(g => <GoalKpiCard key={g.id} goal={g} />)}
          </div>
        </div>
      )}
    </div>
  );
}
