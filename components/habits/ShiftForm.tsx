'use client';

import type { ShiftMetadata } from '@/lib/types';

type Props = { value: ShiftMetadata; onChange: (v: ShiftMetadata) => void };

export default function ShiftForm({ value, onChange }: Props) {
  const set = <K extends keyof ShiftMetadata>(k: K, v: ShiftMetadata[K]) =>
    onChange({ ...value, [k]: v });

  const inputStyle = {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  };
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = 'var(--primary)');
  const onBlur  = (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = 'var(--border)');

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Workplace</label>
        <input
          type="text"
          value={value.workplace}
          onChange={e => set('workplace', e.target.value)}
          placeholder="e.g. Bar Central"
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={inputStyle}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Start time</label>
          <input
            type="time"
            value={value.start_time}
            onChange={e => set('start_time', e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={inputStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>End time</label>
          <input
            type="time"
            value={value.end_time}
            onChange={e => set('end_time', e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={inputStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Break (min)</label>
          <input
            type="number"
            min={0}
            value={value.break_min}
            onChange={e => set('break_min', Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={inputStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Hourly rate (€)</label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={value.hourly_rate ?? ''}
            onChange={e => set('hourly_rate', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="Optional"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={inputStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        </div>
      </div>
    </div>
  );
}

export const defaultShift: ShiftMetadata = { workplace: '', start_time: '18:00', end_time: '23:00', break_min: 15 };
