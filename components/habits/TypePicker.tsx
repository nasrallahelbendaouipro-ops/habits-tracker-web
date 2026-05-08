'use client';

import type { HabitType } from '@/lib/types';

const TYPES: { value: HabitType; icon: string; label: string; desc: string }[] = [
  { value: 'simple',  icon: '🎯', label: 'Simple',  desc: 'Basic daily habit' },
  { value: 'workout', icon: '💪', label: 'Workout', desc: 'Sets, reps, weight' },
  { value: 'reading', icon: '📚', label: 'Reading', desc: 'Book & page tracking' },
  { value: 'study',   icon: '🧠', label: 'Study',   desc: 'Subject & time goal' },
  { value: 'shift',   icon: '🕐', label: 'Shift',   desc: 'Work schedule' },
];

export default function TypePicker({
  value,
  onChange,
}: {
  value: HabitType;
  onChange: (t: HabitType) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
        Habit type
      </label>
      <div className="grid grid-cols-5 gap-2">
        {TYPES.map(t => {
          const active = t.value === value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => onChange(t.value)}
              className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all text-center"
              style={{
                background: active ? 'var(--primary-muted)' : 'var(--surface-elevated)',
                border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
              }}
            >
              <span className="text-xl">{t.icon}</span>
              <span className="text-[10px] font-semibold" style={{ color: active ? 'var(--primary)' : 'var(--text-secondary)' }}>
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
