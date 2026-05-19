'use client';

import { useLocale } from '@/lib/i18n';
import type { HabitType, HabitDimension } from '@/lib/types';

type TypeDef = { value: HabitType; icon: string; label: string };

const DIMENSION_GROUPS: { dimension: HabitDimension; label: string; color: string; types: TypeDef[] }[] = [
  {
    dimension: 'body',
    label: '💪 Body',
    color: 'var(--body)',
    types: [
      { value: 'workout',     icon: '💪', label: 'Workout' },
      { value: 'shift',       icon: '🕐', label: 'Shift' },
      { value: 'body_metric', icon: '⚖️', label: 'Metric' },
      { value: 'simple',      icon: '🎯', label: 'Simple' },
    ],
  },
  {
    dimension: 'mind',
    label: '🧠 Mind',
    color: 'var(--mind)',
    types: [
      { value: 'reading', icon: '📚', label: 'Reading' },
      { value: 'study',   icon: '🧠', label: 'Study' },
    ],
  },
  {
    dimension: 'soul',
    label: '✨ Soul',
    color: 'var(--soul)',
    types: [
      { value: 'meditation', icon: '🧘', label: 'Meditate' },
      { value: 'prayer',     icon: '🙏', label: 'Prayer' },
      { value: 'journaling', icon: '✍️', label: 'Journal' },
    ],
  },
];

export default function TypePicker({
  value,
  onChange,
}: {
  value: HabitType;
  onChange: (t: HabitType) => void;
}) {
  const { t } = useLocale();

  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
        {t.type_label}
      </label>
      <div className="flex flex-col gap-3">
        {DIMENSION_GROUPS.map(group => (
          <div key={group.dimension} className="flex items-center gap-2">
            <span
              className="text-[10px] font-bold uppercase tracking-widest flex-shrink-0 w-10 text-right"
              style={{ color: group.color }}
            >
              {group.label.split(' ')[0]}
            </span>
            <div className="flex gap-1.5 flex-wrap">
              {group.types.map(type => {
                const active = type.value === value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => onChange(type.value)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: active ? group.color + '25' : 'var(--surface-elevated)',
                      border: `1px solid ${active ? group.color : 'var(--border)'}`,
                      color: active ? group.color : 'var(--text-secondary)',
                    }}
                  >
                    <span>{type.icon}</span>
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
