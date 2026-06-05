'use client';

import { useEffect, useRef, useState } from 'react';

type TimerState = 'idle' | 'running' | 'paused' | 'complete';

type Props = {
  durationSec: number;
  taskId: string;
  isActive: boolean;
  onRequestActivate: (id: string) => void;
  onComplete: (id: string) => void;
  accentColor: string;
};

function formatCountdown(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TaskCountdownTimer({
  durationSec,
  taskId,
  isActive,
  onRequestActivate,
  onComplete,
  accentColor,
}: Props) {
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [remaining, setRemaining] = useState(durationSec);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Respond to external active signal
  useEffect(() => {
    if (isActive && timerState === 'idle') setTimerState('running');
    if (!isActive && timerState === 'running') setTimerState('paused');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // Drive the countdown
  useEffect(() => {
    if (timerState === 'running') {
      intervalRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setTimerState('complete');
            onComplete(taskId);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerState]);

  const radius = 12;
  const circumference = 2 * Math.PI * radius;
  const progress = timerState === 'complete' ? 0 : remaining / durationSec;
  const strokeDashoffset = circumference * (1 - progress);

  if (timerState === 'complete') {
    return (
      <div
        className="flex items-center gap-3 px-3 py-2 rounded-xl"
        style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(34,197,94,0.2)' }}
        >
          <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
            <path d="M1 5.5L5 9.5L13 1.5" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="text-sm font-medium" style={{ color: '#22c55e' }}>Done</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 px-3 py-2 rounded-xl"
      style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}
    >
      {/* Progress ring */}
      <svg width="28" height="28" viewBox="0 0 28 28" className="flex-shrink-0 -rotate-90">
        <circle cx="14" cy="14" r={radius} fill="none" stroke="var(--border)" strokeWidth="2.5" />
        <circle
          cx="14" cy="14" r={radius}
          fill="none"
          stroke={accentColor}
          strokeWidth="2.5"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.9s linear' }}
        />
      </svg>

      {/* Time display */}
      <span
        className="font-mono text-sm font-bold flex-1"
        style={{ color: timerState === 'running' ? accentColor : 'var(--text-primary)' }}
      >
        {formatCountdown(remaining)}
      </span>

      {/* Play / Pause button */}
      <button
        onClick={() => {
          if (timerState === 'idle' || timerState === 'paused') {
            onRequestActivate(taskId);
            setTimerState('running');
          } else {
            setTimerState('paused');
          }
        }}
        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
        style={{ background: accentColor + '20', color: accentColor }}
        title={timerState === 'running' ? 'Pause' : 'Start'}
      >
        {timerState === 'running' ? (
          <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
            <rect x="0" y="0" width="3" height="12" rx="1" />
            <rect x="7" y="0" width="3" height="12" rx="1" />
          </svg>
        ) : (
          <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
            <path d="M0 0L10 6L0 12V0Z" />
          </svg>
        )}
      </button>
    </div>
  );
}
