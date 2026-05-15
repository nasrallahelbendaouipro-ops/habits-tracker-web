'use client';

import type { MeditationMetadata } from '@/lib/types';

export const defaultMeditation: MeditationMetadata = {
  duration_min: 10,
  technique: '',
};

const TECHNIQUES = ['Mindfulness', 'Breathing', 'Body Scan', 'Visualization', 'Loving-Kindness', 'Transcendental', 'Other'];

type Props = { value: MeditationMetadata; onChange: (v: MeditationMetadata) => void };

export default function MeditationForm({ value, onChange }: Props) {
  const inputBase = {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
          Target duration (min)
        </label>
        <input
          type="number"
          min={1}
          max={180}
          value={value.duration_min}
          onChange={e => onChange({ ...value, duration_min: Number(e.target.value) })}
          className="w-full px-3 py-2 rounded-xl text-sm outline-none"
          style={inputBase}
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
          Technique <span style={{ color: 'var(--text-disabled)' }}>(optional)</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {TECHNIQUES.map(t => {
            const active = value.technique === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => onChange({ ...value, technique: active ? '' : t })}
                className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                style={{
                  background: active ? 'var(--soul)' : 'var(--surface-elevated)',
                  color: active ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${active ? 'var(--soul)' : 'var(--border)'}`,
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
