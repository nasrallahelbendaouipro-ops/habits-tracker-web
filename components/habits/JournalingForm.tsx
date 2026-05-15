'use client';

import type { JournalingMetadata } from '@/lib/types';

export const defaultJournaling: JournalingMetadata = {
  prompt: '',
};

type Props = { value: JournalingMetadata; onChange: (v: JournalingMetadata) => void };

export default function JournalingForm({ value, onChange }: Props) {
  const inputBase = {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  };

  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
        Default prompt <span style={{ color: 'var(--text-disabled)' }}>(optional)</span>
      </label>
      <textarea
        value={value.prompt ?? ''}
        onChange={e => onChange({ prompt: e.target.value })}
        placeholder="e.g. What am I grateful for today?"
        rows={3}
        maxLength={200}
        className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
        style={inputBase}
      />
    </div>
  );
}
