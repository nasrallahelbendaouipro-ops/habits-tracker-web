'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createRoutine } from '@/lib/routines';
import type { Routine } from '@/lib/types';
import RoutineForm from '@/components/routines/RoutineForm';

export default function NewRoutinePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(data: Omit<Routine, 'id' | 'user_id' | 'created_at'>) {
    setSubmitting(true);
    try {
      const { data: { user } } = await createClient().auth.getUser();
      if (!user) return;
      const routine = await createRoutine({ ...data, user_id: user.id });
      router.replace(`/routines/${routine.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="animate-fade-in max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>New Routine</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Define a structured session you can track</p>
      </div>
      <RoutineForm onSubmit={handleSubmit} onCancel={() => router.back()} submitting={submitting} />
    </div>
  );
}
