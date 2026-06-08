'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Pencil, Trash2 } from 'lucide-react';
import { getRoutines, deleteRoutine } from '@/lib/routines';
import { useLocale } from '@/lib/i18n';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { Routine } from '@/lib/types';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function RoutineRow({ routine, onDeleteRequest }: { routine: Routine; onDeleteRequest: (id: string) => void }) {
  const accentColor = routine.color ?? 'var(--primary)';
  const scheduledDays = routine.schedule_days.map(d => DAY_LABELS[d]).join(' · ');
  const taskCount = routine.tasks.length;

  return (
    <div
      className="flex items-center gap-4 p-4 rounded-2xl transition-all"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${accentColor}` }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ background: accentColor + '20', border: `1px solid ${accentColor}30` }}
      >
        {routine.icon ?? '📋'}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{routine.name}</p>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {scheduledDays || 'No schedule'} · {taskCount} task{taskCount !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex gap-1.5 flex-shrink-0">
        <Link
          href={`/routines/${routine.id}/edit`}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
          style={{ background: 'var(--surface-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          aria-label={`Edit ${routine.name}`}
        >
          <Pencil size={14} />
        </Link>
        <button
          onClick={() => onDeleteRequest(routine.id)}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
          style={{ background: 'var(--error-muted)', color: 'var(--error)' }}
          aria-label={`Delete ${routine.name}`}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <Link href={`/routines/${routine.id}`} className="text-lg flex-shrink-0" style={{ color: 'var(--text-muted)' }}>›</Link>
    </div>
  );
}

export default function RoutinesPage() {
  const { t } = useLocale();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setRoutines(await getRoutines());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string) {
    await deleteRoutine(id);
    load();
  }

  const sport = routines.filter(r => r.category === 'sport');
  const data = routines.filter(r => r.category === 'data');
  const custom = routines.filter(r => r.category === 'custom');

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Routines</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Structured sessions linked to your schedule</p>
        </div>
        <Link
          href="/routines/new"
          className="px-4 py-2 rounded-xl font-semibold text-sm text-white"
          style={{ background: 'var(--primary)', boxShadow: 'var(--shadow-glow)' }}
        >
          + New
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} />)}
        </div>
      ) : routines.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-5xl mb-4">📋</div>
          <p className="font-semibold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>No routines yet</p>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Create your first routine to start tracking sessions</p>
          <Link href="/routines/new" className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white" style={{ background: 'var(--primary)' }}>
            Create routine
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {[
            { label: '🦶 Sport', items: sport },
            { label: '📊 Data', items: data },
            { label: '📋 Custom', items: custom },
          ]
            .filter(g => g.items.length > 0)
            .map(group => (
              <div key={group.label}>
                <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                  {group.label}
                </h2>
                <div className="flex flex-col gap-2">
                  {group.items.map(r => (
                    <RoutineRow key={r.id} routine={r} onDeleteRequest={setConfirmDeleteId} />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      <ConfirmDialog
        visible={!!confirmDeleteId}
        message={t.routines_delete_confirm}
        onConfirm={() => { if (confirmDeleteId) handleDelete(confirmDeleteId); setConfirmDeleteId(null); }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
