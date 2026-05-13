'use client';

import { useLocale } from '@/lib/i18n';
import type { HabitType } from '@/lib/types';

export default function TypePicker({
  value,
  onChange,
}: {
  value: HabitType;
  onChange: (t: HabitType) => void;
}) {
  const { t } = useLocale();

  const TYPES: { value: HabitType; icon: string; label: string }[] = [
    { value: 'simple',  icon: '🎯', label: t.type_simple },
    { value: 'workout', icon: '💪', label: t.type_workout },
    { value: 'reading', icon: '📚', label: t.type_reading },
    { value: 'study',   icon: '🧠', label: t.type_study },
    { value: 'shift',   icon: '🕐', label: t.type_shift },
  ];

  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
        {t.type_label}
      </label>
      <div className="grid grid-cols-5 gap-2">
        {TYPES.map(type => {
          const active = type.value === value;
          return (
            <button
              key={type.value}
              type="button"
              onClick={() => onChange(type.value)}
              className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all text-center"
              style={{
                background: active ? 'var(--primary-muted)' : 'var(--surface-elevated)',
                border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
              }}
            >
              <span className="text-xl">{type.icon}</span>
              <span className="text-[10px] font-semibold" style={{ color: active ? 'var(--primary)' : 'var(--text-secondary)' }}>
                {type.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
