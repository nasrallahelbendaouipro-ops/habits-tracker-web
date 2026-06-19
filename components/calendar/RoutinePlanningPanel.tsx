'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchRoutineWeeklyProgress } from '@/lib/analytics';
import type { RoutineWeeklyProgress } from '@/lib/types';

type Props = {
  userId: string;
  weekStart: Date;
};

function StatusBadge({ planned, target }: { planned: number; target: number }) {
  if (planned >= target) {
    return (
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: '#00E67620', color: '#00E676' }}>
        Fully Planned
      </span>
    );
  }
  if (planned > 0) {
    return (
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: '#FFB80020', color: '#FFB800' }}>
        Partial
      </span>
    );
  }
  return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'var(--surface-elevated)', color: 'var(--text-muted)' }}>
      Not Planned
    </span>
  );
}

export default function RoutinePlanningPanel({ userId, weekStart }: Props) {
  const [progress, setProgress] = useState<RoutineWeeklyProgress[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      fetchRoutineWeeklyProgress(userId, weekStart, weekEnd).then(setProgress);
    });
  }, [userId, weekStart]);

  if (!progress.length) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Weekly Routine Targets
        </h3>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} week
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {progress.map(r => {
          const accentColor = r.color ?? 'var(--primary)';
          const plannedPct  = r.targetHours > 0 ? Math.min(100, (r.plannedHours / r.targetHours) * 100) : 0;
          const donePct     = r.targetHours > 0 ? Math.min(100, (r.completedHours / r.targetHours) * 100) : 0;

          return (
            <div
              key={r.routineId}
              className="flex-shrink-0 rounded-2xl p-3 min-w-[160px]"
              style={{ background: 'var(--surface)', border: `1px solid ${accentColor}30`, borderLeft: `3px solid ${accentColor}` }}
            >
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{r.icon ?? '📋'}</span>
                <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>{r.name}</p>
              </div>

              {/* Dual progress bar */}
              <div className="relative h-2 rounded-full mb-2 overflow-hidden" style={{ background: 'var(--border)' }}>
                {/* planned */}
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all"
                  style={{ width: `${plannedPct}%`, background: accentColor + '50' }}
                />
                {/* completed */}
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all"
                  style={{ width: `${donePct}%`, background: accentColor }}
                />
              </div>

              {/* Stats */}
              <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                <span style={{ color: accentColor, fontWeight: 700 }}>{r.completedHours}h done</span>
                {' · '}{r.plannedHours}h planned{' · '}{r.targetHours}h target
              </p>

              {/* Status */}
              <div className="mt-1.5">
                <StatusBadge planned={r.plannedHours} target={r.targetHours} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
