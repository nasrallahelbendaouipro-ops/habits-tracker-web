'use client';

import { useLocale, LOCALE_DATE_TAG } from '@/lib/i18n';
import type { GoalWithHabits, HabitWithRate } from '@/lib/types';

type Props = {
  goal: GoalWithHabits;
  onEdit: (goal: GoalWithHabits) => void;
  onDelete: (id: string) => void;
};

export default function GoalCard({ goal, onEdit, onDelete }: Props) {
  const { t, locale } = useLocale();

  function formatDeadline(date?: string) {
    if (!date) return null;
    return new Date(date + 'T00:00:00').toLocaleDateString(LOCALE_DATE_TAG[locale], {
      month: 'short', year: 'numeric',
    });
  }

  const deadline = formatDeadline(goal.deadline);
  const rate = goal.completionRate;

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
          >
            ✏️
          </button>
          <button
            onClick={() => {
              if (confirm(t.goals_delete_confirm)) onDelete(goal.id);
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all"
            style={{ background: 'rgba(255,107,107,0.1)', color: 'var(--error)' }}
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-5 pb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{t.goals_progress}</span>
          <span className="text-xs font-bold" style={{ color: goal.color }}>{rate}% {t.goals_on_track}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-elevated)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${rate}%`, background: goal.color }}
          />
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
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${h.completionRate}%`, background: h.color }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
