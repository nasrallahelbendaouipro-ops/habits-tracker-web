'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { fetchHabitsWithStatus } from '@/lib/habits';
import { fetchGoals } from '@/lib/goals';
import { calcDisciplineScore, calcDimensionScores, dailyCompletionMap, weeklyTotals, habitCompletionRate, fetchRoutineCompletionStats, fetchDailyMetricsHistory, type RoutineStat, type DailyMetricPoint } from '@/lib/analytics';
import { dateStr, TODAY } from '@/lib/utils';
import { useLocale, LOCALE_DATE_TAG } from '@/lib/i18n';
import GlassCard from '@/components/ui/GlassCard';
import ProgressRing from '@/components/charts/ProgressRing';
import { useChartTheme } from '@/lib/chart-theme';
import type { HabitWithStreak, HabitLog, GoalWithHabits } from '@/lib/types';

// ─── Heatmap (16 weeks) ────────────────────────────────────────────────────────

function Heatmap({ logMap, totalHabits }: { logMap: Map<string, number>; totalHabits: number }) {
  const { locale, t } = useLocale();
  const WEEKS = 16;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cols: { weekLabel: string; days: { date: string; count: number }[] }[] = [];
  for (let w = WEEKS - 1; w >= 0; w--) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() - w * 7);
    const label = weekStart.toLocaleDateString(LOCALE_DATE_TAG[locale], { month: 'short', day: 'numeric' });
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

  const DAY_LABELS = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2024, 0, 7 + i);
    return d.toLocaleDateString(LOCALE_DATE_TAG[locale], { weekday: 'narrow' });
  });

  function cellColor(count: number) {
    if (count === 0 || totalHabits === 0) return 'var(--border)';
    const ratio = Math.min(count / totalHabits, 1);
    if (ratio < 0.34) return 'color-mix(in srgb, var(--primary) 35%, transparent)';
    if (ratio < 0.67) return 'color-mix(in srgb, var(--primary) 60%, transparent)';
    return 'var(--primary)';
  }

  return (
    <div>
      <div className="flex gap-0.5" style={{ overflowX: 'auto' }}>
        <div className="flex flex-col gap-0.5 mr-1 flex-shrink-0">
          <div className="h-4" />
          {DAY_LABELS.map((l, i) => (
            <div key={i} className="w-3 h-3 flex items-center justify-center" style={{ fontSize: 8, color: 'var(--text-muted)' }}>
              {i % 2 === 1 ? l : ''}
            </div>
          ))}
        </div>
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
                  title={`${day.date}: ${day.count}`}
                  className="w-3 h-3 rounded-sm"
                  style={{ background: isFuture ? 'transparent' : cellColor(day.count), opacity: isFuture ? 0 : 1, outline: isToday ? '1.5px solid var(--primary)' : 'none', outlineOffset: '1px' }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-3 justify-end flex-wrap">
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t.analytics_less}</span>
        {[
          { color: 'var(--border)',                                         label: '0' },
          { color: 'color-mix(in srgb, var(--primary) 35%, transparent)',  label: '1–3' },
          { color: 'color-mix(in srgb, var(--primary) 60%, transparent)',  label: '4–6' },
          { color: 'var(--primary)',                                        label: '7+' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-0.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: color }} />
            <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{label}</span>
          </div>
        ))}
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t.analytics_more}</span>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  const { t } = useLocale();
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
      <p style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p>{payload[0].value}{t.analytics_completed}</p>
    </div>
  );
}

function HabitStatRow({ habit, rate }: { habit: HabitWithStreak; rate: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: habit.color + '20', border: `1px solid ${habit.color}30` }}>
        {habit.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{habit.name}</span>
          <span className="text-xs font-bold ml-2 flex-shrink-0" style={{ color: habit.color }}>{rate}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: habit.color }}
            initial={{ width: 0 }}
            animate={{ width: `${rate}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
        </div>
      </div>
      {habit.streak > 0 && (
        <span className="text-xs font-medium flex-shrink-0" style={{ color: 'var(--secondary)' }}>🔥{habit.streak}d</span>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { t } = useLocale();
  const chart = useChartTheme();
  const [userId, setUserId]           = useState<string | null>(null);
  const [habits, setHabits]           = useState<HabitWithStreak[]>([]);
  const [logs, setLogs]               = useState<HabitLog[]>([]);
  const [goals, setGoals]             = useState<GoalWithHabits[]>([]);
  const [routineStats, setRoutineStats] = useState<RoutineStat[]>([]);
  const [metricsHistory, setMetricsHistory] = useState<DailyMetricPoint[]>([]);
  const [loading, setLoading]         = useState(true);
  const [mounted, setMounted]         = useState(false);

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
      const [habitsData, logsRes, goalsData, routineStatsData, metricsData] = await Promise.all([
        fetchHabitsWithStatus(userId),
        supabase.from('habit_logs').select('*').eq('user_id', userId).gte('completed_at', dateStr(365)),
        fetchGoals(userId),
        fetchRoutineCompletionStats(userId, 30),
        fetchDailyMetricsHistory(userId, 30),
      ]);
      setHabits(habitsData);
      setLogs((logsRes.data ?? []) as HabitLog[]);
      setGoals(goalsData);
      setRoutineStats(routineStatsData);
      setMetricsHistory(metricsData);
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
        <p className="font-semibold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>{t.analytics_empty}</p>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t.analytics_empty_desc}</p>
      </div>
    );
  }

  const completed  = habits.filter(h => h.completedToday).length;
  const todayPct   = Math.round((completed / habits.length) * 100);
  const bestStreak = Math.max(...habits.map(h => h.streak));
  const discScore  = calcDisciplineScore(habits, logs);
  const dimScores  = calcDimensionScores(habits, logs);
  const logMap     = dailyCompletionMap(logs);
  const weekly     = weeklyTotals(habits, logs, 8);
  const sorted     = [...habits].sort((a, b) => b.streak - a.streak);

  // Dimension insights
  const dimEntries = [
    { dim: 'body', label: t.dim_body, color: 'var(--body)', score: dimScores.body },
    { dim: 'mind', label: t.dim_mind, color: 'var(--mind)', score: dimScores.mind },
    { dim: 'soul', label: t.dim_soul, color: 'var(--soul)', score: dimScores.soul },
  ] as const;
  const weakest  = [...dimEntries].sort((a, b) => a.score - b.score)[0];
  const strongest = [...dimEntries].sort((a, b) => b.score - a.score)[0];

  // Goal KPI insights — goals with measurable KPI fields
  const kpiGoals = goals.filter(g => g.starting_point != null && g.target_point != null && g.current_value != null);
  const kpiGoalsWithPct = kpiGoals.map(g => {
    const pct = Math.max(0, Math.min(100, Math.round(
      ((g.current_value! - g.starting_point!) / (g.target_point! - g.starting_point!)) * 100
    )));
    const remaining = Math.abs(g.target_point! - g.current_value!);
    // Rough days-remaining estimate based on completion rate (days since start ÷ pct × remaining pct)
    let daysEst: number | null = null;
    if (pct > 0 && g.deadline) {
      const msLeft = new Date(g.deadline + 'T00:00:00').getTime() - Date.now();
      daysEst = Math.max(0, Math.round(msLeft / 86_400_000));
    }
    return { ...g, pct, remaining, daysEst };
  });

  return (
    <div className="animate-fade-in flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{t.analytics_title}</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {habits.length} {habits.length !== 1 ? t.analytics_subtitle_other : t.analytics_subtitle_one}
        </p>
      </div>

      {/* Overall summary */}
      <div className="grid grid-cols-3 gap-3">
        <GlassCard style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <ProgressRing pct={todayPct} size={72} color="var(--primary)" />
          <p className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: 'var(--text-muted)' }}>{t.today}</p>
        </GlassCard>
        <GlassCard style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <span className="text-3xl">🔥</span>
          <p className="font-bold text-xl leading-none" style={{ color: 'var(--text-primary)' }}>{bestStreak}d</p>
          <p className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: 'var(--text-muted)' }}>{t.dashboard_best_streak}</p>
        </GlassCard>
        <GlassCard style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <span className="text-3xl">⚡</span>
          <p className="font-bold text-xl leading-none" style={{ color: 'var(--text-primary)' }}>{discScore}</p>
          <p className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: 'var(--text-muted)' }}>{t.analytics_score}</p>
        </GlassCard>
      </div>

      {/* Dimension scores */}
      <GlassCard>
        <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--text-muted)' }}>
          Dimension Scores
        </p>
        <div className="grid grid-cols-3 gap-3">
          {([
            { dim: 'body', label: t.dim_body, color: 'var(--body)', score: dimScores.body },
            { dim: 'mind', label: t.dim_mind, color: 'var(--mind)', score: dimScores.mind },
            { dim: 'soul', label: t.dim_soul, color: 'var(--soul)', score: dimScores.soul },
          ] as const).map(({ label, color, score }) => (
            <div key={label} className="flex flex-col items-center gap-2 p-3 rounded-xl" style={{ background: `color-mix(in srgb, ${color} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 20%, transparent)` }}>
              <p className="text-xs font-bold" style={{ color }}>{label}</p>
              <p className="text-2xl font-bold leading-none" style={{ color }}>{score}</p>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${score}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Dimension insights */}
      <GlassCard>
        <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--text-muted)' }}>Dimension Insights</p>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: `color-mix(in srgb, ${weakest.color} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${weakest.color} 20%, transparent)` }}>
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Needs attention: {weakest.label}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Score {weakest.score}/100 · focus here to balance your dimensions</p>
            </div>
            <span className="text-lg font-bold" style={{ color: weakest.color }}>{weakest.score}</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: `color-mix(in srgb, ${strongest.color} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${strongest.color} 20%, transparent)` }}>
            <span className="text-2xl">🏆</span>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Strongest: {strongest.label}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Score {strongest.score}/100 · keep the momentum going</p>
            </div>
            <span className="text-lg font-bold" style={{ color: strongest.color }}>{strongest.score}</span>
          </div>
        </div>
      </GlassCard>

      {/* Goal KPI progress */}
      {kpiGoalsWithPct.length > 0 && (
        <GlassCard>
          <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--text-muted)' }}>Goal KPI Tracker</p>
          <div className="flex flex-col gap-4">
            {kpiGoalsWithPct.map(g => (
              <div key={g.id}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{g.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{g.title}</span>
                      <span className="text-sm font-bold ml-2 flex-shrink-0" style={{ color: g.color }}>{g.pct}%</span>
                    </div>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {g.current_value} → {g.target_point} {g.unit}
                      {g.daysEst != null && ` · ${g.daysEst}d until deadline`}
                    </p>
                  </div>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-elevated)' }}>
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${g.pct}%`, background: g.color }} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Heatmap */}
      <GlassCard>
        <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--text-muted)' }}>{t.analytics_activity}</p>
        <div role="img" aria-label={`Activity heatmap over 16 weeks. ${habits.length} habits tracked.`}>
          <Heatmap logMap={logMap} totalHabits={habits.length} />
        </div>
      </GlassCard>

      {/* Weekly bar chart */}
      {mounted && (
        <GlassCard>
          <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--text-muted)' }}>{t.analytics_weekly}</p>
          <div role="img" aria-label={`Weekly completion chart: ${weekly.length} weeks of habit data`}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weekly} barSize={22} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: chart.tickFill }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: chart.tickFill }} axisLine={false} tickLine={false} ticks={[0, 25, 50, 75, 100]} />
              <Tooltip content={<ChartTooltip />} contentStyle={chart.tooltipStyle} cursor={{ fill: chart.cursorFill }} />
              <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                {weekly.map((entry, i) => (
                  <Cell key={i} fill={
                    entry.pct === 100
                      ? 'var(--teal)'
                      : entry.pct >= 70
                        ? 'var(--primary)'
                        : entry.pct >= 40
                          ? 'color-mix(in srgb, var(--primary) 60%, transparent)'
                          : 'color-mix(in srgb, var(--primary) 27%, transparent)'
                  } />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 justify-center flex-wrap">
            {[
              { label: '< 40%',  color: 'color-mix(in srgb, var(--primary) 27%, transparent)' },
              { label: '40–70%', color: 'color-mix(in srgb, var(--primary) 60%, transparent)' },
              { label: '70–99%', color: 'var(--primary)' },
              { label: '100%',   color: 'var(--teal)' },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</span>
              </div>
            ))}
          </div>
          </div>
        </GlassCard>
      )}

      {/* Per-habit stats */}
      <GlassCard>
        <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--text-muted)' }}>{t.analytics_habits_rate}</p>
        <div className="flex flex-col gap-4">
          {sorted.map(habit => (
            <HabitStatRow key={habit.id} habit={habit} rate={habitCompletionRate(habit.id, logs, 30)} />
          ))}
        </div>
      </GlassCard>

      {/* Routine performance */}
      {routineStats.length > 0 && mounted && (
        <GlassCard>
          <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--text-muted)' }}>
            Performance des routines (30j)
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={routineStats} barSize={28} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: chart.tickFill }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: chart.tickFill }} axisLine={false} tickLine={false} ticks={[0, 50, 100]} />
              <Tooltip
                formatter={(v: unknown) => [`${v}%`, 'Complétion moy.']}
                contentStyle={chart.tooltipStyle}
                cursor={{ fill: chart.cursorFill }}
              />
              <Bar dataKey="avgCompletionPct" radius={[4, 4, 0, 0]}>
                {routineStats.map((entry, i) => (
                  <Cell key={i} fill={entry.color ?? 'var(--primary)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Planned vs actual time — only for data routines */}
          {routineStats.filter(r => r.plannedMinutes > 0 && r.avgActualMinutes != null).length > 0 && (
            <div className="mt-5">
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
                Temps planifié vs réel
              </p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart
                  data={routineStats.filter(r => r.plannedMinutes > 0 && r.avgActualMinutes != null)}
                  barSize={16}
                  barGap={4}
                  margin={{ top: 0, right: 0, bottom: 0, left: -20 }}
                >
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: chart.tickFill }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `${v}m`} tick={{ fontSize: 10, fill: chart.tickFill }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v: unknown, name: unknown) => [`${v} min`, String(name ?? '')]}
                    contentStyle={chart.tooltipStyle}
                    cursor={{ fill: chart.cursorFill }}
                  />
                  <Bar dataKey="plannedMinutes" fill="color-mix(in srgb, var(--text-muted) 40%, transparent)" name="Planifié" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avgActualMinutes" fill="var(--primary)" name="Réel (moy.)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-2 justify-center">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'color-mix(in srgb, var(--text-muted) 40%, transparent)' }} />
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Planifié</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--primary)' }} />
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Réel (moy.)</span>
                </div>
              </div>
            </div>
          )}
        </GlassCard>
      )}

      {/* Personal trends */}
      {metricsHistory.some(m => m.weight || m.energy || m.mood) && mounted && (
        <GlassCard>
          <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--text-muted)' }}>
            Évolution personnelle (30 jours)
          </p>

          {metricsHistory.some(m => m.weight) && (
            <div className="mb-5">
              <p className="text-[10px] font-semibold mb-2" style={{ color: 'var(--body)' }}>Poids (kg)</p>
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={metricsHistory} margin={{ top: 5, right: 8, bottom: 0, left: -25 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: chart.tickFill }} axisLine={false} tickLine={false} tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9, fill: chart.tickFill }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                  <Tooltip formatter={(v: unknown) => [`${v} kg`, 'Poids']} contentStyle={chart.tooltipStyle} />
                  <Line type="monotone" dataKey="weight" stroke="var(--body)" strokeWidth={2} dot={false} connectNulls activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {metricsHistory.some(m => m.energy) && (
            <div className="mb-5">
              <p className="text-[10px] font-semibold mb-2" style={{ color: 'var(--mind)' }}>Énergie (/10)</p>
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={metricsHistory} margin={{ top: 5, right: 8, bottom: 0, left: -25 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: chart.tickFill }} axisLine={false} tickLine={false} tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9, fill: chart.tickFill }} axisLine={false} tickLine={false} domain={[1, 10]} ticks={[1, 5, 10]} />
                  <Tooltip formatter={(v: unknown) => [`${v}/10`, 'Énergie']} contentStyle={chart.tooltipStyle} />
                  <Line type="monotone" dataKey="energy" stroke="var(--mind)" strokeWidth={2} dot={false} connectNulls activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {metricsHistory.some(m => m.mood) && (
            <div>
              <p className="text-[10px] font-semibold mb-2" style={{ color: 'var(--soul)' }}>Humeur (/10)</p>
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={metricsHistory} margin={{ top: 5, right: 8, bottom: 0, left: -25 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: chart.tickFill }} axisLine={false} tickLine={false} tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9, fill: chart.tickFill }} axisLine={false} tickLine={false} domain={[1, 10]} ticks={[1, 5, 10]} />
                  <Tooltip formatter={(v: unknown) => [`${v}/10`, 'Humeur']} contentStyle={chart.tooltipStyle} />
                  <Line type="monotone" dataKey="mood" stroke="var(--soul)" strokeWidth={2} dot={false} connectNulls activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
}
