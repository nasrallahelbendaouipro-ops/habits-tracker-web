'use client';

import { useState, useEffect, useRef } from 'react';
import type { HabitWithStreak } from '@/lib/types';
import { DIMENSION_ICONS } from '@/lib/habits';

type Props = {
  habit: HabitWithStreak;
  onComplete: (logData: { duration_sec: number; notes?: string }) => Promise<void>;
  onClose: () => void;
};

type Phase = 'running' | 'paused' | 'summary';

function fmt(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const DIM_COLOR: Record<string, string> = {
  body: 'var(--body)',
  mind: 'var(--mind)',
  soul: 'var(--soul)',
};

export default function SessionTimer({ habit, onComplete, onClose }: Props) {
  const [phase, setPhase]       = useState<Phase>('running');
  const [elapsed, setElapsed]   = useState(0);
  const [notes, setNotes]       = useState('');
  const [saving, setSaving]     = useState(false);
  const intervalRef             = useRef<ReturnType<typeof setInterval> | null>(null);
  const color                   = DIM_COLOR[habit.dimension] ?? 'var(--primary)';

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    if (phase === 'running') {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [phase]);

  function handleEnd() {
    setPhase('summary');
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onComplete({ duration_sec: elapsed, notes: notes.trim() || undefined });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const dimIcon = DIMENSION_ICONS[habit.dimension] ?? '⚡';

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }}
    >
      {phase !== 'summary' ? (
        <>
          {/* Habit info */}
          <div className="flex flex-col items-center gap-3 mb-12">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
              style={{ background: color + '20', border: `2px solid ${color}40` }}
            >
              {habit.icon}
            </div>
            <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{habit.name}</p>
            <span
              className="text-xs font-semibold px-3 py-1 rounded-full"
              style={{ background: color + '20', color }}
            >
              {dimIcon} {habit.dimension.charAt(0).toUpperCase() + habit.dimension.slice(1)}
            </span>
          </div>

          {/* Timer */}
          <div
            className="text-7xl font-mono font-bold mb-12 tabular-nums"
            style={{ color, textShadow: `0 0 40px ${color}60` }}
          >
            {fmt(elapsed)}
          </div>

          {/* Controls */}
          <div className="flex gap-4">
            <button
              onClick={() => setPhase(phase === 'running' ? 'paused' : 'running')}
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold transition-all"
              style={{ background: 'var(--surface)', border: `2px solid ${color}` }}
            >
              {phase === 'running' ? '⏸' : '▶'}
            </button>
            <button
              onClick={handleEnd}
              className="px-8 h-16 rounded-full font-bold text-white transition-all"
              style={{ background: color }}
            >
              End Session
            </button>
          </div>

          <button
            onClick={onClose}
            className="mt-10 text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            Cancel
          </button>
        </>
      ) : (
        /* Summary screen */
        <div
          className="w-full max-w-sm mx-4 rounded-2xl overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="px-6 py-5 text-center" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-4xl mb-3">🎉</p>
            <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Session Complete!</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{habit.name}</p>
            <p className="text-3xl font-mono font-bold mt-3" style={{ color }}>{fmt(elapsed)}</p>
          </div>
          <div className="px-6 py-5 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                Notes <span style={{ color: 'var(--text-disabled)' }}>(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="How did it go?"
                rows={3}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
                style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all"
              style={{ background: saving ? 'var(--text-muted)' : color }}
            >
              {saving ? 'Saving…' : 'Save & Complete'}
            </button>
            <button
              onClick={onClose}
              className="w-full py-2 text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
