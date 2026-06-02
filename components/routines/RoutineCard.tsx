'use client';

import Link from 'next/link';
import type { RoutineWithSession } from '@/lib/types';
import { countBilateralSlots } from '@/lib/routines';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function RoutineCard({ routine, compact = false }: { routine: RoutineWithSession; compact?: boolean }) {
  const total = countBilateralSlots(routine.tasks);
  const done = routine.todaySession?.completed_task_ids.length ?? 0;
  const isComplete = !!routine.todaySession?.completed_at;
  const accentColor = routine.color ?? 'var(--primary)';
  const scheduledDays = routine.schedule_days.map(d => DAY_LABELS[d]).join(' · ');

  return (
    <Link
      href={`/routines/${routine.id}`}
      className="block rounded-2xl transition-all"
      style={{
        background: isComplete ? 'var(--surface-elevated)' : 'var(--surface)',
        border: `1px solid ${isComplete ? accentColor + '40' : 'var(--border)'}`,
        borderLeft: `3px solid ${accentColor}`,
        opacity: isComplete ? 0.75 : 1,
      }}
    >
      <div className="flex items-center gap-4 p-4">
        {/* Icon */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: accentColor + '20', border: `1px solid ${accentColor}30` }}
        >
          {routine.icon ?? '📋'}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p
            className="font-semibold text-sm truncate"
            style={{
              color: isComplete ? 'var(--text-muted)' : 'var(--text-primary)',
              textDecoration: isComplete ? 'line-through' : 'none',
            }}
          >
            {routine.name}
          </p>
          {!compact && (
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {scheduledDays}
            </p>
          )}
        </div>

        {/* Progress / status */}
        {total > 0 ? (
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {isComplete ? (
              <span className="text-sm font-bold" style={{ color: accentColor }}>✓ Done</span>
            ) : (
              <span className="text-sm font-bold" style={{ color: done > 0 ? accentColor : 'var(--text-muted)' }}>
                {done}/{total}
              </span>
            )}
            {!isComplete && total > 0 && (
              <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${total === 0 ? 0 : Math.round((done / total) * 100)}%`, background: accentColor }}
                />
              </div>
            )}
          </div>
        ) : (
          <span className="text-lg flex-shrink-0" style={{ color: 'var(--text-muted)' }}>›</span>
        )}
      </div>
    </Link>
  );
}
