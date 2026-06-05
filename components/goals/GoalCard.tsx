'use client';

import { useLocale, LOCALE_DATE_TAG } from '@/lib/i18n';
import type { GoalWithLinked, HabitWithRate, HabitDimension } from '@/lib/types';

const DIMENSION_COLORS: Record<HabitDimension, string> = {
  body: 'var(--body)',
  mind: 'var(--mind)',
  soul: 'var(--soul)',
};
const DIMENSION_LABELS: Record<HabitDimension, string> = {
  body: '💪 Body',
  mind: '🧠 Mind',
  soul: '✨ Soul',
};

type Props = {
  goal: GoalWithLinked;
  onEdit: (goal: GoalWithLinked) => void;
  onDelete: (id: string) => void;
};

export default function GoalCard({ goal, onEdit, onDelete }: Props) {
  const linkedRoutines = goal.routines ?? [];
  const totalSecs = goal.totalTimeSeconds ?? 0;
  const { t, locale } = useLocale();

  function formatDeadline(date?: string) {
    if (!date) return null;
    return new Date(date + 'T00:00:00').toLocaleDateString(LOCALE_DATE_TAG[locale], {
      month: 'short', year: 'numeric',
    });
  }

  const deadline    = formatDeadline(goal.deadline);
  const rate        = goal.completionRate;
  const dimColor    = DIMENSION_COLORS[(goal.dimension as HabitDimension) ?? 'body'];
  const dimLabel    = DIMENSION_LABELS[(goal.dimension as HabitDimension) ?? 'body'];

  // KPI progress
  const hasKpi = goal.starting_point != null && goal.target_point != null && goal.current_value != null;
  const kpiPct = hasKpi
    ? Math.max(0, Math.min(100, Math.round(
        ((goal.current_value! - goal.starting_point!) / (goal.target_point! - goal.starting_point!)) * 100
      )))
    : null;

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderLeft: `4px solid ${goal.color}`,
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: goal.color + '20', border: `1px solid ${goal.color}40` }}
          >
            {goal.icon}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-base leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
              {goal.title}
            </h3>
            {goal.description && (
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{goal.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Dimension badge */}
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: dimColor + '20', color: dimColor }}
          >
            {dimLabel}
          </span>
          {deadline && (
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: goal.color + '20', color: goal.color }}
            >
              {deadline}
            </span>
          )}
          <button
            onClick={() => onEdit(goal)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all"
            style={{ background: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}
            title={t.goals_edit}
          >✏️</button>
          <button
            onClick={() => { if (confirm(t.goals_delete_confirm)) onDelete(goal.id); }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all"
            style={{ background: 'rgba(255,107,107,0.1)', color: 'var(--error)' }}
            title="Delete"
          >🗑️</button>
        </div>
      </div>

      {/* KPI progress (if defined) */}
      {hasKpi && kpiPct !== null && (
        <div className="px-5 pb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              {goal.current_value} → {goal.target_point} {goal.unit}
            </span>
            <span className="text-xs font-bold" style={{ color: goal.color }}>{kpiPct}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-elevated)' }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${kpiPct}%`, background: goal.color }} />
          </div>
        </div>
      )}

      {/* Habit consistency progress bar */}
      <div className="px-5 pb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{t.goals_progress}</span>
          <span className="text-xs font-bold" style={{ color: goal.color }}>{rate}% {t.goals_on_track}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-elevated)' }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${rate}%`, background: goal.color }} />
        </div>
      </div>

      {/* Habits list */}
      <div style={{ borderTop: '1px solid var(--border)' }}>
        <div className="px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
            {t.goals_habits}
          </p>
          {goal.habits.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-disabled)' }}>{t.goals_no_habits}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {goal.habits.map((h: HabitWithRate) => (
                <div key={h.id} className="flex items-center gap-2">
                  <span className="text-sm">{h.icon}</span>
                  <span className="text-xs font-medium flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                    {h.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold" style={{ color: h.color }}>{h.completionRate}%</span>
                    <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-elevated)' }}>
                      <div className="h-full rounded-full" style={{ width: `${h.completionRate}%`, background: h.color }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Routines + time invested */}
      {(linkedRoutines.length > 0 || totalSecs > 0) && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <div className="px-5 py-3">
            {linkedRoutines.length > 0 && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                  Routines
                </p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {linkedRoutines.map(r => (
                    <span
                      key={r.id}
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: (r.color ?? 'var(--primary)') + '20',
                        color: r.color ?? 'var(--primary)',
                      }}
                    >
                      {r.icon ?? ''} {r.name}
                    </span>
                  ))}
                </div>
              </>
            )}
            {totalSecs > 0 && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                ⏱ Time invested: {Math.floor(totalSecs / 3600)}h {Math.floor((totalSecs % 3600) / 60)}m
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
