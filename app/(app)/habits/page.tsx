'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { fetchHabitsWithStatus, createHabit, updateHabit, deleteHabit } from '@/lib/habits';
import { useLocale } from '@/lib/i18n';
import { Pencil, Trash2, Flame, Leaf, Activity, Brain, Sparkles } from 'lucide-react';
import HabitModal from '@/components/habits/HabitModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import GlassCard from '@/components/ui/GlassCard';
import type { HabitWithStreak, HabitFormValues, HabitDimension } from '@/lib/types';

const DIMENSION_ORDER: HabitDimension[] = ['body', 'mind', 'soul'];

const DIM_COLOR: Record<HabitDimension, string> = {
  body: 'var(--body)',
  mind: 'var(--mind)',
  soul: 'var(--soul)',
};

const DIM_ICON: Record<HabitDimension, React.ComponentType<{ size?: number }>> = {
  body: Activity,
  mind: Brain,
  soul: Sparkles,
};

export default function HabitsPage() {
  const { t } = useLocale();
  const DIM_LABEL: Record<HabitDimension, string> = { body: t.dim_body, mind: t.dim_mind, soul: t.dim_soul };
  const [userId, setUserId]       = useState<string | null>(null);
  const [habits, setHabits]       = useState<HabitWithStreak[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [editing, setEditing]     = useState<HabitWithStreak | null>(null);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try { setHabits(await fetchHabitsWithStatus(userId, undefined, undefined, true)); }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(values: HabitFormValues) {
    await createHabit({ ...values, user_id: userId! });
    setShowAdd(false);
    await load();
  }

  async function handleEdit(values: HabitFormValues) {
    if (!editing) return;
    await updateHabit(editing.id, values);
    setEditing(null);
    await load();
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try { await deleteHabit(id); await load(); }
    finally { setDeleting(null); }
  }

  // Group by dimension
  const grouped = habits.reduce<Record<HabitDimension, HabitWithStreak[]>>((acc, h) => {
    const dim = (h.dimension as HabitDimension) ?? 'body';
    if (!acc[dim]) acc[dim] = [];
    acc[dim].push(h);
    return acc;
  }, { body: [], mind: [], soul: [] });

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{t.habits_title}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {habits.length} {habits.length !== 1 ? t.habits_tracked_other : t.habits_tracked_one}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 rounded-xl font-semibold text-sm text-white transition-all"
          style={{ background: 'var(--primary)', boxShadow: 'var(--shadow-glow)' }}
        >
          {t.habits_new}
        </button>
      </div>

      {/* Dimension summary chips */}
      <div className="flex gap-2 mb-6">
        {DIMENSION_ORDER.map(dim => {
          const count = grouped[dim]?.length ?? 0;
          if (count === 0) return null;
          const c = DIM_COLOR[dim];
          return (
            <span key={dim} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: `color-mix(in srgb, ${c} 15%, transparent)`, color: c, border: `1px solid color-mix(in srgb, ${c} 20%, transparent)` }}>
              {React.createElement(DIM_ICON[dim], { size: 12 })} {DIM_LABEL[dim]} · {count}
            </span>
          );
        })}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--surface)' }} />)}
        </div>
      ) : habits.length === 0 ? (
        <GlassCard className="text-center py-16">
          <div className="flex justify-center mb-4" style={{ color: 'var(--primary)' }}><Leaf size={40} /></div>
          <p className="font-semibold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>{t.habits_empty}</p>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>{t.habits_empty_desc}</p>
          <button onClick={() => setShowAdd(true)} className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white" style={{ background: 'var(--primary)' }}>
            {t.habits_add_btn}
          </button>
        </GlassCard>
      ) : (
        <div className="flex flex-col gap-6">
          {DIMENSION_ORDER.map(dim => {
            const dimHabits = grouped[dim];
            if (!dimHabits || dimHabits.length === 0) return null;
            const c = DIM_COLOR[dim];
            return (
              <div key={dim}>
                {/* Section header */}
                <div className="flex items-center gap-2 mb-3">
                  {React.createElement(DIM_ICON[dim], { size: 16 })}
                  <h2 className="font-bold text-sm uppercase tracking-widest" style={{ color: c }}>{DIM_LABEL[dim]}</h2>
                  <div className="flex-1 h-px" style={{ background: `color-mix(in srgb, ${c} 20%, transparent)` }} />
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `color-mix(in srgb, ${c} 15%, transparent)`, color: c }}>
                    {dimHabits.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {dimHabits.map(h => (
                    <div
                      key={h.id}
                      className="flex items-center gap-4 p-4 rounded-2xl transition-all group"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${c}` }}
                    >
                      <Link
                        href={`/habits/${h.id}`}
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                        style={{ background: h.color + '20', border: `1px solid ${h.color}30` }}
                        aria-label={h.name}
                      >
                        {h.icon}
                      </Link>
                      <Link href={`/habits/${h.id}`} className="flex-1 min-w-0">
                        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{h.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: `color-mix(in srgb, ${c} 15%, transparent)`, color: c }}>
                            {h.type}
                          </span>
                          {h.streak > 0 && <span className="text-[10px] font-medium flex items-center gap-0.5" style={{ color: 'var(--secondary)' }}><Flame size={12} /> {h.streak}d</span>}
                          {h.completedToday && <span className="text-[10px] font-medium" style={{ color: 'var(--success)' }}>{t.habits_done_today}</span>}
                        </div>
                      </Link>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditing(h)}
                          className="w-10 h-10 rounded-lg flex items-center justify-center transition-all"
                          style={{ background: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}
                          aria-label={`Edit ${h.name}`}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(h.id)}
                          disabled={deleting === h.id}
                          aria-busy={deleting === h.id}
                          aria-label={`Delete ${h.name}`}
                          className="w-10 h-10 rounded-lg flex items-center justify-center transition-all"
                          style={{ background: 'var(--error-muted)', color: 'var(--error)' }}
                        >
                          {deleting === h.id
                            ? <span className="animate-pulse text-xs font-bold">…</span>
                            : <Trash2 size={14} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <HabitModal mode="add" visible={showAdd} onClose={() => setShowAdd(false)} onSubmit={handleAdd} />
      <HabitModal mode="edit" habit={editing ?? undefined} visible={!!editing} onClose={() => setEditing(null)} onSubmit={handleEdit} />
      <ConfirmDialog
        visible={!!confirmDeleteId}
        message={t.habit_delete_confirm}
        onConfirm={() => { if (confirmDeleteId) handleDelete(confirmDeleteId); setConfirmDeleteId(null); }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
