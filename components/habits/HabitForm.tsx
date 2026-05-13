'use client';

import { useState } from 'react';
import { HABIT_ICONS, HABIT_COLORS } from '@/lib/habits';
import { useLocale } from '@/lib/i18n';
import type { HabitFormValues, HabitType, HabitMetadata } from '@/lib/types';
import TypePicker from './TypePicker';
import WorkoutForm, { defaultWorkout } from './WorkoutForm';
import ReadingForm, { defaultReading } from './ReadingForm';
import StudyForm, { defaultStudy } from './StudyForm';
import ShiftForm, { defaultShift } from './ShiftForm';
import type { WorkoutMetadata, ReadingMetadata, StudyMetadata, ShiftMetadata } from '@/lib/types';

const DEFAULT_METADATA: Record<HabitType, HabitMetadata> = {
  simple:  {},
  workout: defaultWorkout,
  reading: defaultReading,
  study:   defaultStudy,
  shift:   defaultShift,
};

type Props = {
  initial?: Partial<HabitFormValues>;
  onSubmit: (values: HabitFormValues) => Promise<void>;
  submitLabel: string;
};

// Mon=1 … Sun=7 (matches FullCalendar firstDay=1 convention)
const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 7];

function getDayLabel(dow: number, locale: string): string {
  // dow: 1=Mon … 7=Sun → get a representative date for that weekday
  const base = new Date('2024-01-01'); // Monday
  base.setDate(base.getDate() + (dow - 1));
  const tag = locale === 'fr' ? 'fr-FR' : locale === 'ar' ? 'ar-SA' : 'en-US';
  return base.toLocaleDateString(tag, { weekday: 'short' });
}

export default function HabitForm({ initial, onSubmit, submitLabel }: Props) {
  const { t, locale } = useLocale();
  const [name, setName]           = useState(initial?.name ?? '');
  const [icon, setIcon]           = useState(initial?.icon ?? '🎯');
  const [color, setColor]         = useState(initial?.color ?? '#6C63FF');
  const [type, setType]           = useState<HabitType>(initial?.type ?? 'simple');
  const [metadata, setMeta]       = useState<HabitMetadata>(initial?.metadata ?? {});
  const [targetDays, setTargetDays] = useState<number[]>(initial?.target_days ?? []);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  const isSpecific = targetDays.length > 0;

  function toggleDay(dow: number) {
    setTargetDays(prev =>
      prev.includes(dow) ? prev.filter(d => d !== dow) : [...prev, dow]
    );
  }

  function handleTypeChange(newType: HabitType) {
    setType(newType);
    setMeta(() => {
      if (initial?.type === newType) return initial?.metadata ?? DEFAULT_METADATA[newType];
      return DEFAULT_METADATA[newType];
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError(t.form_err_name); return; }
    setError('');
    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(), icon, color, type,
        frequency: targetDays.length > 0 ? 'weekly' : 'daily',
        target_days: targetDays,
        metadata,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.form_err_generic);
    } finally {
      setLoading(false);
    }
  }

  const inputBase = {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Type picker */}
      <TypePicker value={type} onChange={handleTypeChange} />

      {/* Name */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
          {t.form_name}
        </label>
        <input
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setError(''); }}
          placeholder={t.form_name_placeholder}
          maxLength={40}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={inputBase}
          onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
        />
      </div>

      {/* Icon picker */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
          {t.form_icon}
        </label>
        <div className="flex flex-wrap gap-2">
          {HABIT_ICONS.map(ic => (
            <button
              key={ic}
              type="button"
              onClick={() => setIcon(ic)}
              className="w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all"
              style={{
                background: icon === ic ? color + '30' : 'var(--surface-elevated)',
                border: `2px solid ${icon === ic ? color : 'var(--border)'}`,
              }}
            >
              {ic}
            </button>
          ))}
        </div>
      </div>

      {/* Color picker */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
          {t.form_color}
        </label>
        <div className="flex flex-wrap gap-2">
          {HABIT_COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="w-8 h-8 rounded-full transition-all"
              style={{
                background: c,
                outline: color === c ? `3px solid ${c}` : 'none',
                outlineOffset: '2px',
                transform: color === c ? 'scale(1.15)' : 'scale(1)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Schedule */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
          {t.sched_label}
        </label>
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setTargetDays([])}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: !isSpecific ? 'var(--primary)' : 'var(--surface-elevated)',
              color: !isSpecific ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${!isSpecific ? 'var(--primary)' : 'var(--border)'}`,
            }}
          >
            {t.sched_everyday}
          </button>
          <button
            type="button"
            onClick={() => { if (!isSpecific) setTargetDays([1, 2, 3, 4, 5]); }}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: isSpecific ? 'var(--primary)' : 'var(--surface-elevated)',
              color: isSpecific ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${isSpecific ? 'var(--primary)' : 'var(--border)'}`,
            }}
          >
            {t.sched_specific}
          </button>
        </div>
        {isSpecific && (
          <div className="flex gap-1.5 flex-wrap">
            {WEEK_DAYS.map(dow => {
              const active = targetDays.includes(dow);
              return (
                <button
                  key={dow}
                  type="button"
                  onClick={() => toggleDay(dow)}
                  className="w-9 h-9 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: active ? color : 'var(--surface-elevated)',
                    color: active ? '#fff' : 'var(--text-secondary)',
                    border: `2px solid ${active ? color : 'var(--border)'}`,
                  }}
                >
                  {getDayLabel(dow, locale)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Type-specific fields */}
      {type !== 'simple' && (
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
            {t.form_details}
          </label>
          {type === 'workout' && (
            <WorkoutForm value={metadata as WorkoutMetadata} onChange={setMeta} />
          )}
          {type === 'reading' && (
            <ReadingForm value={metadata as ReadingMetadata} onChange={setMeta} />
          )}
          {type === 'study' && (
            <StudyForm value={metadata as StudyMetadata} onChange={setMeta} />
          )}
          {type === 'shift' && (
            <ShiftForm value={metadata as ShiftMetadata} onChange={setMeta} />
          )}
        </div>
      )}

      {/* Preview */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
          {t.form_preview}
        </label>
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: 'var(--surface-elevated)', border: `1px solid ${color}30` }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: color + '20', border: `1px solid ${color}40` }}
          >
            {icon}
          </div>
          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            {name || t.form_habit_name_placeholder}
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all"
        style={{ background: loading ? 'var(--text-muted)' : color, cursor: loading ? 'not-allowed' : 'pointer' }}
      >
        {loading ? t.form_saving : submitLabel}
      </button>
    </form>
  );
}
