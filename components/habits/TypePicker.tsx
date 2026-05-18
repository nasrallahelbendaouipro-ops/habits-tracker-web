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
      { value: 'body_metric', icon: '⚖️', label: 'Metric' },
    ],
  },
  {
    dimension: 'mind',
    label: '🧠 Mind',
    color: 'var(--mind)',
    types: [
      { value: 'reading', icon: '📚', label: 'Reading' },
      { value: 'study',   icon: '🧠', label: 'Study' },
      { value: 'simple',  icon: '🎯', label: 'Simple' },
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
          <div key={group.dimension}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: group.color }}>
              {group.label}
            </p>
            <div className={`grid gap-2 ${group.types.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {group.types.map(type => {
                const active = type.value === value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => onChange(type.value)}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all text-center"
                    style={{
                      background: active ? group.color + '20' : 'var(--surface-elevated)',
                      border: `1px solid ${active ? group.color : 'var(--border)'}`,
                    }}
                  >
                    <span className="text-xl">{type.icon}</span>
                    <span className="text-[10px] font-semibold" style={{ color: active ? group.color : 'var(--text-secondary)' }}>
                      {type.label}
                    </span>
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
