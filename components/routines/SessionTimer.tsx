'use client';

import { useEffect, useRef, useState } from 'react';
import { computeActiveSeconds } from '@/lib/routines';
import type { RoutineSession } from '@/lib/types';

interface Props {
  session: RoutineSession | null;
  accentColor: string;
  compact?: boolean;
  readOnly?: boolean;
  onStart: () => void;
  onPause: (pausedAt: string) => void;
  onResume: (totalPauseSeconds: number) => void;
}

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function deriveState(session: RoutineSession | null): 'idle' | 'running' | 'paused' {
  if (!session?.started_at) return 'idle';
  if (session.paused_at) return 'paused';
  return 'running';
}

export default function SessionTimer({ session, accentColor, compact = false, readOnly = false, onStart, onPause, onResume }: Props) {
  const [timerState, setTimerState] = useState<'idle' | 'running' | 'paused'>(() => deriveState(session));
  const [elapsed, setElapsed] = useState(() => (session ? computeActiveSeconds(session) : 0));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    if (timerState === 'running') {
      intervalRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerState]);

  function handleStart() {
    setTimerState('running');
    onStart();
  }

  function handlePause() {
    const now = new Date().toISOString();
    setTimerState('paused');
    onPause(now);
  }

  function handleResume() {
    const s = sessionRef.current;
    if (!s?.paused_at) return;
    const pausedMs = new Date(s.paused_at).getTime();
    const addedSeconds = Math.floor((Date.now() - pausedMs) / 1000);
    const newTotal = (s.pause_duration_seconds ?? 0) + addedSeconds;
    setTimerState('running');
    onResume(newTotal);
  }

  if (compact) {
    return (
      <div
        className="flex items-center justify-between px-4 py-3 rounded-2xl mb-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: timerState === 'running' ? accentColor : timerState === 'paused' ? 'var(--text-muted)' : 'var(--border)',
              boxShadow: timerState === 'running' ? `0 0 6px ${accentColor}` : 'none',
            }}
          />
          <span className="font-mono text-lg font-bold" style={{ color: timerState === 'idle' ? 'var(--text-muted)' : accentColor }}>
            {formatTime(elapsed)}
          </span>
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            {timerState === 'running' ? 'running' : timerState === 'paused' ? 'paused' : 'not started'}
          </span>
        </div>
        {!readOnly && (
          <div>
            {timerState === 'idle' && (
              <button
                onClick={handleStart}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white"
                style={{ background: accentColor }}
              >
                ▶ Start
              </button>
            )}
            {timerState === 'running' && (
              <button
                onClick={handlePause}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                style={{ background: accentColor + '20', color: accentColor, border: `1px solid ${accentColor}40` }}
              >
                ⏸ Pause
              </button>
            )}
            {timerState === 'paused' && (
              <button
                onClick={handleResume}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white"
                style={{ background: accentColor }}
              >
                ▶ Resume
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 py-6 mb-6 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div
        className="text-6xl font-mono font-bold tracking-tight tabular-nums"
        style={{ color: timerState === 'idle' ? 'var(--text-muted)' : accentColor }}
      >
        {formatTime(elapsed)}
      </div>
      <div className="flex items-center gap-2">
        {timerState === 'running' && (
          <>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accentColor }} />
            <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: accentColor }}>Running</span>
          </>
        )}
        {timerState === 'paused' && (
          <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--text-muted)' }}>Paused</span>
        )}
        {timerState === 'idle' && (
          <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Press Start to begin</span>
        )}
      </div>
      {!readOnly && (
        <div className="flex gap-3">
          {timerState === 'idle' && (
            <button
              onClick={handleStart}
              className="px-6 py-2.5 rounded-xl font-bold text-sm text-white"
              style={{ background: accentColor }}
            >
              ▶ Start Session
            </button>
          )}
          {timerState === 'running' && (
            <button
              onClick={handlePause}
              className="px-6 py-2.5 rounded-xl font-bold text-sm"
              style={{ background: accentColor + '20', color: accentColor, border: `1px solid ${accentColor}40` }}
            >
              ⏸ Pause
            </button>
          )}
          {timerState === 'paused' && (
            <button
              onClick={handleResume}
              className="px-6 py-2.5 rounded-xl font-bold text-sm text-white"
              style={{ background: accentColor }}
            >
              ▶ Resume
            </button>
          )}
        </div>
      )}
    </div>
  );
}
