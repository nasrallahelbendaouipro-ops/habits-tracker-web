'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getRoutine, getSession } from '@/lib/routines';
import type { Routine, RoutineSession } from '@/lib/types';
import { TODAY } from '@/lib/utils';
import SessionView from '@/components/routines/SessionView';

export default function RoutineSessionPage() {
  const { id } = useParams<{ id: string }>();
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

  return (
    <div className="animate-fade-in">
      <Link href={`/routines/${id}`} className="inline-flex items-center gap-1.5 text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
        ← {routine.name}
      </Link>
      <SessionView routine={routine} initialSession={session} />
    </div>
  );
}
