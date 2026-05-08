'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { fetchHabitsWithStatus, createHabit, updateHabit, deleteHabit } from '@/lib/habits';
import HabitModal from '@/components/habits/HabitModal';
import GlassCard from '@/components/ui/GlassCard';
import type { HabitWithStreak, HabitFormValues } from '@/lib/types';

const TYPE_META: Record<string, { icon: string; label: string; color: string }> = {
  simple:  { icon: '🎯', label: 'Simple',  color: '#6C63FF' },
  workout: { icon: '💪', label: 'Workout', color: '#FF6B35' },
  reading: { icon: '📚', label: 'Reading', color: '#4ECDC4' },
  study:   { icon: '🧠', label: 'Study',   color: '#45B7D1' },
  shift:   { icon: '🕐', label: 'Shift',   color: '#96CEB4' },
};

export default function HabitsPage() {
  const router = useRouter();
  const [userId, setUserId]       = useState<string | null>(null);
  const [habits, setHabits]       = useState<HabitWithStreak[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [editing, setEditing]     = useState<HabitWithStreak | null>(null);
  const [deleting, setDeleting]   = useState<string | null>(null);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try { setHabits(await fetchHabitsWithStatus(userId)); }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(values: HabitFormValues) {
    await createHabit({ ...values, user_id: userId! });
    setShowAdd(false);
    load();
  }

  async function handleEdit(values: HabitFormValues) {
    if (!editing) return;
    await updateHabit(editing.id, values);
    setEditing(null);
    load();
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try { await deleteHabit(id); load(); }
    finally { setDeleting(null); }
  }

  const grouped = habits.reduce<Record<string, HabitWithStreak[]>>((acc, h) => {
    const t = h.type ?? 'simple';
    if (!acc[t]) acc[t] = [];
    acc[t].push(h);
    return acc;
  }, {});

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>My Habits</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {habits.length} habit{habits.length !== 1 ? 's' : ''} tracked
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 rounded-xl font-semibold text-sm text-white transition-all"
          style={{ background: 'var(--primary)', boxShadow: 'var(--shadow-glow)' }}
        >
          + New habit
        </button>
      </div>

      {/* Type filter summary */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(TYPE_META).map(([t, meta]) => {
          const count = grouped[t]?.length ?? 0;
          if (count === 0) return null;
          return (
            <span
              key={t}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: meta.color + '20', color: meta.color, border: `1px solid ${meta.color}30` }}
            >
              {meta.icon} {meta.label} · {count}
            </span>
          );
        })}
      </div>

      {/* Habits grouped by type */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--surface)' }} />
          ))}
        </div>
      ) : habits.length === 0 ? (
        <GlassCard className="text-center py-16">
          <div className="text-5xl mb-4">🌱</div>
          <p className="font-semibold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>No habits yet</p>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Create your first habit to start tracking.</p>
          <button
            onClick={() => setShowAdd(true)}
            className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white"
            style={{ background: 'var(--primary)' }}
          >
            + Add habit
          </button>
        </GlassCard>
      ) : (
        <div className="flex flex-col gap-2">
          {habits.map(h => {
            const meta = TYPE_META[h.type ?? 'simple'];
            return (
              <div
                key={h.id}
                className="flex items-center gap-4 p-4 rounded-2xl transition-all group"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 cursor-pointer"
                  style={{ background: h.color + '20', border: `1px solid ${h.color}30` }}
                  onClick={() => router.push(`/habits/${h.id}`)}
                >
                  {h.icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => router.push(`/habits/${h.id}`)}>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{h.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                      style={{ background: meta.color + '20', color: meta.color }}
                    >
                      {meta.icon} {meta.label}
                    </span>
                    {h.streak > 0 && (
                      <span className="text-[10px] font-medium" style={{ color: 'var(--secondary)' }}>
                        🔥 {h.streak}d
                      </span>
                    )}
                    {h.completedToday && (
                      <span className="text-[10px] font-medium" style={{ color: 'var(--success)' }}>✓ Done today</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditing(h)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all"
                    style={{ background: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(h.id)}
                    disabled={deleting === h.id}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all"
                    style={{ background: 'rgba(255,107,107,0.12)', color: 'var(--error)' }}
                    title="Delete"
                  >
                    {deleting === h.id ? '…' : '🗑️'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add modal */}
      <HabitModal
        mode="add"
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSubmit={handleAdd}
      />

      {/* Edit modal */}
      <HabitModal
        mode="edit"
        habit={editing ?? undefined}
        visible={!!editing}
        onClose={() => setEditing(null)}
        onSubmit={handleEdit}
      />
    </div>
  );
}
