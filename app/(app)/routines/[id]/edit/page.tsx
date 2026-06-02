'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getRoutine, updateRoutine } from '@/lib/routines';
import type { Routine } from '@/lib/types';
import RoutineForm from '@/components/routines/RoutineForm';

export default function EditRoutinePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getRoutine(id).then(r => { setRoutine(r); setLoading(false); });
  }, [id]);

  async function handleSubmit(data: Omit<Routine, 'id' | 'user_id' | 'created_at'>) {
    setSubmitting(true);
    try {
      await updateRoutine(id, data);
      router.replace(`/routines/${id}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="animate-pulse h-48 rounded-2xl" style={{ background: 'var(--surface)' }} />;
  if (!routine) return <p style={{ color: 'var(--error)' }}>Routine not found.</p>;

  return (
    <div className="animate-fade-in max-w-lg">
      <Link href={`/routines/${id}`} className="inline-flex items-center gap-1.5 text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
        ← {routine.name}
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Edit Routine</h1>
      </div>
      <RoutineForm
        initial={routine}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        submitting={submitting}
      />
    </div>
  );
}
