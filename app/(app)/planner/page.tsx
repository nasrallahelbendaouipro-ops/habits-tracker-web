'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchHabitsWithStatus } from '@/lib/habits';
import { fetchGoals } from '@/lib/goals';
import { fetchRecentCheckins } from '@/lib/checkin';
import { calcDimensionScores, habitCompletionRate } from '@/lib/analytics';
import GlassCard from '@/components/ui/GlassCard';
import type { HabitWithStreak, HabitLog, GoalWithHabits } from '@/lib/types';
import type { PlannerOutput, PlannerRecommendation } from '@/app/api/planner/route';

const DIM_COLOR = { body: 'var(--body)', mind: 'var(--mind)', soul: 'var(--soul)' };
const DIM_LABEL = { body: '💪 Body', mind: '🧠 Mind', soul: '✨ Soul' };
const PRIORITY_COLOR = { high: 'var(--error)', medium: 'var(--warning)', low: 'var(--success)' };

function RecommendationCard({ rec }: { rec: PlannerRecommendation }) {
  const dimColor = DIM_COLOR[rec.dimension] ?? 'var(--primary)';
  return (
    <div className="p-4 rounded-2xl" style={{ background: 'var(--surface)', border: `1px solid ${dimColor}30`, borderLeft: `3px solid ${dimColor}` }}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: dimColor + '20', color: dimColor }}>
              {DIM_LABEL[rec.dimension]}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: PRIORITY_COLOR[rec.priority] + '20', color: PRIORITY_COLOR[rec.priority] }}>
              {rec.priority}
            </span>
          </div>
          <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{rec.title}</p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{rec.description}</p>
          {rec.action && (
            <div className="mt-2.5 flex items-center gap-2">
              <span className="text-xs">→</span>
              <p className="text-xs font-semibold" style={{ color: dimColor }}>{rec.action}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PlannerPage() {
  const [userId, setUserId]     = useState<string | null>(null);
  const [plan, setPlan]         = useState<PlannerOutput | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => { if (data.user) setUserId(data.user.id); });
  }, []);

  const generatePlan = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const [habitsData, logsRes, goalsData, checkins] = await Promise.all([
        fetchHabitsWithStatus(userId),
        supabase.from('habit_logs').select('*').eq('user_id', userId).gte('completed_at', (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; })()),
        fetchGoals(userId),
        fetchRecentCheckins(userId, 14),
      ]);

      const logs = (logsRes.data ?? []) as HabitLog[];
      const dimScores = calcDimensionScores(habitsData, logs);

      // Aggregate check-in averages
      const soulCheckins = checkins.filter(c => c.soul_metrics);
      const bodyCheckins = checkins.filter(c => c.body_metrics);
      const avgStress = soulCheckins.length > 0
        ? soulCheckins.reduce((s, c) => s + (c.soul_metrics.stress_level ?? 0), 0) / soulCheckins.length
        : undefined;
      const avgSleep = bodyCheckins.length > 0
        ? bodyCheckins.reduce((s, c) => s + (c.body_metrics.sleep_hours ?? 0), 0) / bodyCheckins.length
        : undefined;
      const avgMood = bodyCheckins.length > 0
        ? bodyCheckins.reduce((s, c) => s + (c.body_metrics.mood ?? 0), 0) / bodyCheckins.length
        : undefined;

      const kpiGoals = (goalsData as GoalWithHabits[]).filter(g => g.starting_point != null && g.target_point != null && g.current_value != null).map(g => {
        const pct = Math.max(0, Math.min(100, Math.round(
          ((g.current_value! - g.starting_point!) / (g.target_point! - g.starting_point!)) * 100
        )));
        return { title: g.title, dimension: g.dimension, pct, unit: g.unit, current_value: g.current_value, target_point: g.target_point, deadline: g.deadline };
      });

      const res = await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habits: habitsData.map(h => ({
            name: h.name,
            dimension: h.dimension,
            type: h.type,
            streak: h.streak,
            completionRate: habitCompletionRate(h.id, logs, 30),
          })),
          goals: kpiGoals,
          dimensionScores: dimScores,
          checkinSummary: { avgStress, avgSleep, avgMood },
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as PlannerOutput;
      setPlan(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate plan');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { if (userId) generatePlan(); }, [userId, generatePlan]);

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>🤖 AI Planner</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Personalized weekly plan based on your habits, goals & check-ins</p>
        </div>
        <button
          onClick={generatePlan}
          disabled={loading}
          className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{ background: loading ? 'var(--surface)' : 'var(--primary-muted)', color: loading ? 'var(--text-muted)' : 'var(--primary)', border: '1px solid var(--primary-muted)' }}
        >
          {loading ? 'Generating…' : '↻ Refresh'}
        </button>
      </div>

      {loading && !plan && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: 'var(--surface)' }} />
          ))}
        </div>
      )}

      {error && (
        <GlassCard>
          <p className="text-sm font-medium" style={{ color: 'var(--error)' }}>⚠️ {error}</p>
        </GlassCard>
      )}

      {plan && (
        <>
          {/* Weekly focus banner */}
          <GlassCard className="mb-5">
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">🎯</span>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                  Weekly Focus
                  {plan.aiPowered && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}>AI-powered</span>}
                </p>
                <p className="text-sm font-semibold leading-relaxed" style={{ color: 'var(--text-primary)' }}>{plan.weeklyFocus}</p>
              </div>
            </div>
          </GlassCard>

          {/* Recommendations */}
          <div className="mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
              Recommendations ({plan.recommendations.length})
            </p>
            <div className="flex flex-col gap-3">
              {plan.recommendations.map((rec, i) => (
                <RecommendationCard key={i} rec={rec} />
              ))}
            </div>
          </div>

          {!plan.aiPowered && (
            <p className="text-[10px] text-center mt-4" style={{ color: 'var(--text-disabled)' }}>
              Rule-based plan · Add an OpenAI API key to enable AI-powered recommendations
            </p>
          )}
        </>
      )}
    </div>
  );
}
