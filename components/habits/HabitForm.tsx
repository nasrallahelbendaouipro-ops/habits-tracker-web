'use client';

import { useState } from 'react';
import { HABIT_ICONS, HABIT_COLORS } from '@/lib/habits';
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

export default function HabitForm({ initial, onSubmit, submitLabel }: Props) {
  const [name, setName]       = useState(initial?.name ?? '');
  const [icon, setIcon]       = useState(initial?.icon ?? '🎯');
  const [color, setColor]     = useState(initial?.color ?? '#6C63FF');
  const [type, setType]       = useState<HabitType>(initial?.type ?? 'simple');
  const [metadata, setMeta]   = useState<HabitMetadata>(initial?.metadata ?? {});
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  function handleTypeChange(t: HabitType) {
    setType(t);
    setMeta(prev => {
      // keep existing metadata if same type, reset otherwise
      if (initial?.type === t) return initial?.metadata ?? DEFAULT_METADATA[t];
      return DEFAULT_METADATA[t];
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Habit name is required.'); return; }
    setError('');
    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(), icon, color, type,
        frequency: 'daily', target_days: [],
        metadata,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
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
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setError(''); }}
          placeholder="e.g. Morning run"
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
          Icon
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
          Color
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

      {/* Type-specific fields */}
      {type !== 'simple' && (
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
            Details
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
          Preview
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
            {name || 'Habit name'}
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
        {loading ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
