'use client';

import type { WorkoutMetadata } from '@/lib/types';

type Props = { value: WorkoutMetadata; onChange: (v: WorkoutMetadata) => void };

const Field = ({
  label, name, value, onChange, unit, min = 0,
}: {
  label: string; name: keyof WorkoutMetadata; value: number;
  onChange: (v: number) => void; unit?: string; min?: number;
}) => (
  <div>
    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
      {label}{unit && <span style={{ color: 'var(--text-muted)' }}> ({unit})</span>}
    </label>
    <input
      type="number"
      min={min}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
      style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
      onBlur={e => (e.target.style.borderColor = 'var(--border)')}
    />
  </div>
);

export default function WorkoutForm({ value, onChange }: Props) {
  const set = (k: keyof WorkoutMetadata) => (v: number) => onChange({ ...value, [k]: v });
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Sets" name="sets" value={value.sets} onChange={set('sets')} min={1} />
      <Field label="Reps" name="reps" value={value.reps} onChange={set('reps')} min={1} />
      <Field label="Weight" name="weight" value={value.weight} onChange={set('weight')} unit="kg" />
      <Field label="Rest time" name="rest_time" value={value.rest_time} onChange={set('rest_time')} unit="sec" />
      <Field label="Duration" name="duration_min" value={value.duration_min} onChange={set('duration_min')} unit="min" />
    </div>
  );
}

export const defaultWorkout: WorkoutMetadata = { sets: 3, reps: 10, weight: 0, rest_time: 60, duration_min: 30 };
