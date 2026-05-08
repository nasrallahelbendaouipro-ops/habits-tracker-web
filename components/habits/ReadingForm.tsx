'use client';

import type { ReadingMetadata } from '@/lib/types';

type Props = { value: ReadingMetadata; onChange: (v: ReadingMetadata) => void };

export default function ReadingForm({ value, onChange }: Props) {
  const set = <K extends keyof ReadingMetadata>(k: K, v: ReadingMetadata[K]) =>
    onChange({ ...value, [k]: v });

  const inputStyle = {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Book name</label>
        <input
          type="text"
          value={value.book_name}
          onChange={e => set('book_name', e.target.value)}
          placeholder="e.g. Atomic Habits"
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={inputStyle}
          onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {([
          ['Total pages', 'pages_target', 1],
          ['Pages/session', 'duration_min', 1],
        ] as const).map(([label, key, min]) => (
          <div key={key}>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</label>
            <input
              type="number"
              min={min}
              value={value[key]}
              onChange={e => set(key, Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export const defaultReading: ReadingMetadata = { book_name: '', pages_target: 300, pages_done: 0, duration_min: 30 };
