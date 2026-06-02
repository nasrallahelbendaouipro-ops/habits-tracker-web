'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getRoutine, getSession, computeSetProgress } from '@/lib/routines';
import type { Routine, RoutineSession, RoutineTask } from '@/lib/types';
import { TODAY } from '@/lib/utils';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getSections(tasks: RoutineTask[]) {
  const sections: { label: string | null; tasks: RoutineTask[] }[] = [];
  let cur: { label: string | null; tasks: RoutineTask[] } = { label: null, tasks: [] };
  for (const t of tasks) {
    if (t.section) {
      if (cur.tasks.length) sections.push(cur);
      cur = { label: t.section, tasks: [] };
    }
    cur.tasks.push(t);
  }
  if (cur.tasks.length) sections.push(cur);
  return sections;
}

export default function RoutineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [session, setSession] = useState<RoutineSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [r, s] = await Promise.all([getRoutine(id), getSession(id, TODAY)]);
        setRoutine(r);
        setSession(s);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <div className="animate-pulse h-48 rounded-2xl" style={{ background: 'var(--surface)' }} />;
  if (!routine) return <p style={{ color: 'var(--error)' }}>Routine not found.</p>;

  const accentColor = routine.color ?? 'var(--primary)';
  const scheduledDays = routine.schedule_days.map(d => DAY_LABELS[d]).join(' · ');
  const { totalSets, doneSets } = computeSetProgress(routine, session);
  const total = totalSets;
  const done = doneSets;
  const isFinished = !!session?.completed_at;
  const sections = getSections(routine.tasks);

  return (
    <div className="animate-fade-in">
      {/* Back */}
      <Link href="/routines" className="inline-flex items-center gap-1.5 text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
        ← Routines
      </Link>

      {/* Header */}
      <div
        className="flex items-start gap-4 p-5 rounded-2xl mb-5"
        style={{ background: 'var(--surface)', border: `1px solid ${accentColor}30`, borderLeft: `4px solid ${accentColor}` }}
      >
        <div className="text-3xl">{routine.icon ?? '📋'}</div>
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{routine.name}</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {scheduledDays || 'No schedule'} · {routine.tasks.length} tasks
          </p>
          {total > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${total === 0 ? 0 : Math.round((done / total) * 100)}%`, background: accentColor }}
                />
              </div>
              <span className="text-xs font-semibold" style={{ color: isFinished ? 'var(--teal)' : accentColor }}>
                {isFinished ? '✓ Done' : `${done}/${total}`}
              </span>
            </div>
          )}
        </div>
        <Link
          href={`/routines/${id}/edit`}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0"
          style={{ background: 'var(--surface-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
        >
          Edit
        </Link>
      </div>

      {/* Start session CTA */}
      {!isFinished && (
        <Link
          href={`/routines/${id}/session`}
          className="block w-full text-center py-4 rounded-2xl font-bold text-base text-white mb-5 transition-all"
          style={{ background: accentColor, boxShadow: `0 4px 20px ${accentColor}40` }}
        >
          {done > 0 ? `▶ Continue session (${done}/${total})` : '▶ Start session'}
        </Link>
      )}

      {isFinished && (
        <div
          className="w-full py-4 rounded-2xl text-center font-bold text-sm mb-5"
          style={{ background: 'var(--teal)20', color: 'var(--teal)', border: '1px solid var(--teal)40' }}
        >
          ✓ Session completed today
        </div>
      )}

      {/* Task preview */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
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
              <div
                key={task.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <div
                  className="w-5 h-5 rounded-full flex-shrink-0"
                  style={{ background: 'transparent', border: `2px solid ${task.type === 'resource' ? 'var(--border)' : 'var(--border)'}` }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{task.name}</p>
                </div>
                <div className="flex gap-1.5 text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                  {task.type === 'reps' && task.reps != null && <span>{task.reps}r</span>}
                  {task.type === 'reps' && task.sets != null && <span>× {task.sets}</span>}
                  {task.type === 'time' && task.duration_min != null && <span>{task.duration_min}min</span>}
                  {task.type === 'bilateral' && <span>L+R</span>}
                  {task.type === 'resource' && <span>🔗</span>}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
