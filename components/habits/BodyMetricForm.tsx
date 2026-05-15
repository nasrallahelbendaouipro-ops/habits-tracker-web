'use client';

import type { BodyMetricMetadata } from '@/lib/types';

export const defaultBodyMetric: BodyMetricMetadata = {
  metric: 'weight',
  unit: 'kg',
};

const METRICS: { value: BodyMetricMetadata['metric']; label: string; icon: string; defaultUnit: string }[] = [
  { value: 'weight',      label: 'Weight',     icon: '⚖️',  defaultUnit: 'kg' },
  { value: 'body_fat',    label: 'Body Fat',   icon: '📊',  defaultUnit: '%' },
  { value: 'sleep_hours', label: 'Sleep',      icon: '😴',  defaultUnit: 'hrs' },
  { value: 'mood',        label: 'Mood',       icon: '😊',  defaultUnit: '/10' },
];

type Props = { value: BodyMetricMetadata; onChange: (v: BodyMetricMetadata) => void };

export default function BodyMetricForm({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
          Metric to track
        </label>
        <div className="grid grid-cols-2 gap-2">
          {METRICS.map(m => {
            const active = value.metric === m.value;
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => onChange({ metric: m.value, unit: m.defaultUnit })}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all"
                style={{
                  background: active ? 'rgba(239,68,68,0.15)' : 'var(--surface-elevated)',
                  border: `1px solid ${active ? 'var(--body)' : 'var(--border)'}`,
                }}
              >
                <span className="text-lg">{m.icon}</span>
                <div>
                  <p className="text-xs font-semibold" style={{ color: active ? 'var(--body)' : 'var(--text-primary)' }}>
                    {m.label}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{m.defaultUnit}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
