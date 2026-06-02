'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { upsertSession, updateSessionTasks, completeSession, countBilateralSlots } from '@/lib/routines';
import type { Routine, RoutineSession, RoutineTask } from '@/lib/types';
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

export default function SessionView({ routine, initialSession }: Props) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [session, setSession] = useState<RoutineSession | null>(initialSession);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set(initialSession?.completed_task_ids ?? []));
  const [completing, setCompleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const accentColor = routine.color ?? 'var(--primary)';
  const total = countBilateralSlots(routine.tasks);
  const done = checkedIds.size;
  const allDone = total > 0 && done >= total;
  const isFinished = !!session?.completed_at;
  const sections = getSectionedTasks(routine.tasks);

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

  async function handleFinish() {
    if (!allDone || isFinished) return;
    setCompleting(true);
    try {
      const s = await ensureSession();
      const finished = await completeSession(s.id);
      setSession(finished);
    } finally {
      setCompleting(false);
    }
  }

  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: accentColor + '20', border: `1px solid ${accentColor}30` }}
        >
          {routine.icon ?? '📋'}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{routine.name}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {isFinished ? '✓ Session complete' : saving ? 'Saving…' : `${done} / ${total} tasks`}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mb-6">
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: isFinished ? 'var(--teal)' : `linear-gradient(90deg, ${accentColor}, ${accentColor}cc)`,
              }}
            />
          </div>
          <p className="text-xs font-semibold text-right mt-1" style={{ color: isFinished ? 'var(--teal)' : accentColor }}>
            {pct}%
          </p>
        </div>
      )}

      {/* Task list */}
      <div
        className="rounded-2xl overflow-hidden mb-6"
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
            {sec.tasks.map(task => (
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
            ))}
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
          disabled={!allDone || completing || !userId}
          className="w-full py-4 rounded-2xl font-bold text-sm text-white transition-all"
          style={{
            background: allDone ? accentColor : 'var(--border)',
            cursor: allDone ? 'pointer' : 'not-allowed',
            opacity: completing ? 0.7 : 1,
          }}
        >
          {completing ? 'Finishing…' : allDone ? 'Finish session ✓' : `${total - done} tasks remaining`}
        </button>
      )}
    </div>
  );
}
