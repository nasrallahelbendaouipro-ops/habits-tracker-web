'use client';

import type { PrayerMetadata } from '@/lib/types';

export const defaultPrayer: PrayerMetadata = {
  name: '',
  duration_min: 5,
};

type Props = { value: PrayerMetadata; onChange: (v: PrayerMetadata) => void };

export default function PrayerForm({ value, onChange }: Props) {
  const inputBase = {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
          Prayer name <span style={{ color: 'var(--text-disabled)' }}>(optional)</span>
        </label>
        <input
          type="text"
          value={value.name ?? ''}
          onChange={e => onChange({ ...value, name: e.target.value })}
          placeholder="e.g. Fajr, Morning prayer…"
          maxLength={40}
          className="w-full px-3 py-2 rounded-xl text-sm outline-none"
          style={inputBase}
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
          Target duration (min)
        </label>
        <input
          type="number"
          min={1}
          max={120}
          value={value.duration_min}
          onChange={e => onChange({ ...value, duration_min: Number(e.target.value) })}
          className="w-full px-3 py-2 rounded-xl text-sm outline-none"
          style={inputBase}
        />
      </div>
    </div>
  );
}
