'use client';

import { useLocale } from '@/lib/i18n';
import type { StudyMetadata } from '@/lib/types';

type Props = { value: StudyMetadata; onChange: (v: StudyMetadata) => void };

export default function StudyForm({ value, onChange }: Props) {
  const { t } = useLocale();
  const set = <K extends keyof StudyMetadata>(k: K, v: StudyMetadata[K]) =>
    onChange({ ...value, [k]: v });

  const inputStyle = {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t.study_subject}</label>
          <input
            type="text"
            value={value.subject}
            onChange={e => set('subject', e.target.value)}
            placeholder="e.g. Mathematics"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t.study_chapter_topic}</label>
          <input
            type="text"
            value={value.chapter}
            onChange={e => set('chapter', e.target.value)}
            placeholder="e.g. Calculus"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t.study_time_goal}</label>
          <input
            type="number"
            min={5}
            value={value.time_target_min}
            onChange={e => set('time_target_min', Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t.study_difficulty}</label>
          <div className="flex gap-1.5 mt-1">
            {([1, 2, 3, 4, 5] as const).map(n => (
              <button
                key={n}
                type="button"
                onClick={() => set('difficulty', n)}
                className="flex-1 h-8 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: value.difficulty >= n ? 'var(--primary)' : 'var(--surface-elevated)',
                  color: value.difficulty >= n ? 'white' : 'var(--text-muted)',
                  border: `1px solid ${value.difficulty >= n ? 'var(--primary)' : 'var(--border)'}`,
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export const defaultStudy: StudyMetadata = { subject: '', chapter: '', time_target_min: 60, difficulty: 3 };
