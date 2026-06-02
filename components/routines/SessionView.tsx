'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  upsertSession, completeSession, updateSessionTasks,
  startSession, pauseSession, resumeSession, updateExerciseProgress,
  computeSetProgress,
} from '@/lib/routines';
import type { Routine, RoutineSession, RoutineTask, ExerciseProgress } from '@/lib/types';
import SessionTimer from './SessionTimer';
import SportTaskCard from './SportTaskCard';
import TaskItem from './TaskItem';
import { TODAY } from '@/lib/utils';

interface Props {
  routine: Routine;
  initialSession: RoutineSession | null;
}

function getSectionedTasks(tasks: RoutineTask[]) {
  const sections: { label: string | null; tasks: RoutineTask[] }[] = [];
  let current: { label: string | null; tasks: RoutineTask[] } = { label: null, tasks: [] };
  for (const t of tasks) {
    if (t.section) {
      if (current.tasks.length) sections.push(current);
      current = { label: t.section, tasks: [] };
    }
    current.tasks.push(t);
  }
  if (current.tasks.length) sections.push(current);
  return sections;
}

function plannedSeconds(routine: Routine): number {
  return routine.tasks.reduce((n, t) => n + (t.duration_min ?? 0) * 60, 0);
}

const EMPTY_PROGRESS: ExerciseProgress = { completed_sets: 0, current_left_done: false, current_right_done: false };

export default function SessionView({ routine, initialSession }: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [session, setSession] = useState<RoutineSession | null>(initialSession);
  const [exerciseProgress, setExerciseProgress] = useState<Record<string, ExerciseProgress>>(
    initialSession?.exercise_progress ?? {}
  );
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set(initialSession?.completed_task_ids ?? []));
  const [completing, setCompleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const accentColor = routine.color ?? 'var(--primary)';
  const isSport = routine.category === 'sport';
  const isFinished = !!session?.completed_at;
  const sections = getSectionedTasks(routine.tasks);

  const progressSnapshot = session ? { ...session, exercise_progress: exerciseProgress } : null;
  const { totalSets, doneSets } = computeSetProgress(routine, progressSnapshot);
  const sportPct = totalSets === 0 ? 0 : Math.round((doneSets / totalSets) * 100);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  async function ensureSession(): Promise<RoutineSession> {
    if (session) return session;
    const s = await upsertSession(routine.id, userId!, TODAY);
    setSession(s);
    return s;
  }

  // ─── Timer handlers ───────────────────────────────────────────────────────────

  async function handleTimerStart() {
    const s = await ensureSession();
    await startSession(s.id);
    setSession(prev => prev ? { ...prev, started_at: new Date().toISOString() } : prev);
  }

  async function handleTimerPause(pausedAt: string) {
    if (!session) return;
    await pauseSession(session.id);
    setSession(prev => prev ? { ...prev, paused_at: pausedAt } : prev);
  }

  async function handleTimerResume(totalPauseSeconds: number) {
    if (!session) return;
    await resumeSession(session.id, totalPauseSeconds);
    setSession(prev => prev ? { ...prev, paused_at: null, pause_duration_seconds: totalPauseSeconds } : prev);
  }

  // ─── Sport: set tracking ──────────────────────────────────────────────────────

  async function handleSetDone(taskId: string) {
    const task = routine.tasks.find(t => t.id === taskId);
    if (!task) return;
    const current = exerciseProgress[taskId] ?? EMPTY_PROGRESS;
    if (current.completed_sets >= (task.sets ?? 1)) return;
    const next = { ...current, completed_sets: current.completed_sets + 1 };
    const updated = { ...exerciseProgress, [taskId]: next };
    setExerciseProgress(updated);
    setSaving(true);
    try {
      const s = await ensureSession();
      await updateExerciseProgress(s.id, updated);
    } finally {
      setSaving(false);
    }
  }

  async function handleBilateralSide(taskId: string, side: 'left' | 'right') {
    const task = routine.tasks.find(t => t.id === taskId);
    if (!task) return;
    const current = exerciseProgress[taskId] ?? EMPTY_PROGRESS;
    if (current.completed_sets >= (task.sets ?? 1)) return;

    let next: ExerciseProgress = side === 'left'
      ? { ...current, current_left_done: true }
      : { ...current, current_right_done: true };

    if (next.current_left_done && next.current_right_done) {
      next = { completed_sets: next.completed_sets + 1, current_left_done: false, current_right_done: false };
    }

    const updated = { ...exerciseProgress, [taskId]: next };
    setExerciseProgress(updated);
    setSaving(true);
    try {
      const s = await ensureSession();
      await updateExerciseProgress(s.id, updated);
    } finally {
      setSaving(false);
    }
  }

  // ─── Data: checklist toggle ───────────────────────────────────────────────────

  async function handleToggle(taskKey: string) {
    if (isFinished) return;
    const next = new Set(checkedIds);
    if (next.has(taskKey)) next.delete(taskKey);
    else next.add(taskKey);
    setCheckedIds(next);
    setSaving(true);
    try {
      const s = await ensureSession();
      const updated = await updateSessionTasks(s.id, [...next]);
      setSession(updated);
    } finally {
      setSaving(false);
    }
  }

  // ─── Finish ───────────────────────────────────────────────────────────────────

  async function handleFinish() {
    if (isFinished) return;
    setCompleting(true);
    try {
      const s = await ensureSession();
      const finished = await completeSession(s.id);
      setSession(finished);
    } finally {
      setCompleting(false);
    }
  }

  const canFinish = !!session?.started_at && !isFinished;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4 mb-5">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: accentColor + '20', border: `1px solid ${accentColor}30` }}
        >
          {routine.icon ?? '📋'}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{routine.name}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {isFinished
              ? '✓ Session complete'
              : saving
              ? 'Saving…'
              : isSport
              ? `${doneSets} / ${totalSets} sets`
              : `${checkedIds.size} tasks checked`}
          </p>
        </div>
      </div>

      {/* Timer */}
      <SessionTimer
        session={session}
        accentColor={accentColor}
        compact={isSport}
        readOnly={isFinished}
        onStart={handleTimerStart}
        onPause={handleTimerPause}
        onResume={handleTimerResume}
      />

      {/* Sport: set progress bar */}
      {isSport && totalSets > 0 && (
        <div className="mb-5">
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${sportPct}%`,
                background: isFinished ? 'var(--teal)' : `linear-gradient(90deg, ${accentColor}, ${accentColor}cc)`,
              }}
            />
          </div>
          <p className="text-xs font-semibold text-right mt-1" style={{ color: isFinished ? 'var(--teal)' : accentColor }}>
            {sportPct}%
          </p>
        </div>
      )}

      {/* Data: planned time bar */}
      {!isSport && (() => {
        const planned = plannedSeconds(routine);
        if (!planned || !session?.started_at) return null;
        const elapsed = Math.min(
          Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000) - (session.pause_duration_seconds ?? 0),
          planned,
        );
        const pct = Math.max(0, Math.round((elapsed / planned) * 100));
        return (
          <div className="mb-5">
            <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
              <span>Time invested</span>
              <span>{Math.floor(planned / 60)} min planned</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${accentColor}, ${accentColor}cc)` }}
              />
            </div>
          </div>
        );
      })()}

      {/* Task list */}
      <div
        className="rounded-2xl overflow-hidden mb-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {sections.map((sec, si) => (
          <div key={si}>
            {sec.label && (
              <div
                className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest"
                style={{ background: 'var(--surface-elevated)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}
              >
                {sec.label}
              </div>
            )}
            {sec.tasks.map(task =>
              task.type === 'resource' ? (
                <TaskItem
                  key={task.id}
                  task={task}
                  checked={false}
                  accentColor={accentColor}
                  readOnly
                />
              ) : isSport ? (
                <SportTaskCard
                  key={task.id}
                  task={task}
                  progress={exerciseProgress[task.id] ?? EMPTY_PROGRESS}
                  accentColor={accentColor}
                  onSetDone={isFinished ? undefined : handleSetDone}
                  onBilateralSide={isFinished ? undefined : handleBilateralSide}
                  readOnly={isFinished}
                />
              ) : (
                <TaskItem
                  key={task.id}
                  task={task}
                  checked={checkedIds.has(task.id)}
                  checkedRight={checkedIds.has(`${task.id}:right`)}
                  checkedLeft={checkedIds.has(`${task.id}:left`)}
                  accentColor={accentColor}
                  onToggle={isFinished ? undefined : handleToggle}
                  readOnly={isFinished}
                />
              )
            )}
          </div>
        ))}
      </div>

      {/* Finish CTA */}
      {isFinished ? (
        <div
          className="w-full py-4 rounded-2xl text-center font-bold text-sm"
          style={{ background: 'var(--teal)20', color: 'var(--teal)', border: '1px solid var(--teal)40' }}
        >
          ✓ Session completed for today
        </div>
      ) : (
        <button
          onClick={handleFinish}
          disabled={!canFinish || completing || !userId}
          className="w-full py-4 rounded-2xl font-bold text-sm text-white transition-all"
          style={{
            background: canFinish ? accentColor : 'var(--border)',
            cursor: canFinish && !completing ? 'pointer' : 'not-allowed',
            opacity: completing ? 0.7 : 1,
          }}
        >
          {completing
            ? 'Finishing…'
            : !session?.started_at
            ? 'Start the timer first'
            : isSport && doneSets < totalSets
            ? `Finish Early · ${doneSets}/${totalSets} sets done`
            : 'Finish Session ✓'}
        </button>
      )}
    </div>
  );
}
