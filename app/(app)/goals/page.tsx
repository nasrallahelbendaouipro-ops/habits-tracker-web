'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchGoals, deleteGoal } from '@/lib/goals';
import { useLocale } from '@/lib/i18n';
import type { GoalWithHabits, Habit } from '@/lib/types';
import GoalCard from '@/components/goals/GoalCard';
import GoalModal from '@/components/goals/GoalModal';

export default function GoalsPage() {
  const { t } = useLocale();
  const [userId, setUserId]     = useState<string | null>(null);
  const [goals, setGoals]       = useState<GoalWithHabits[]>([]);
  const [allHabits, setAllHabits] = useState<Habit[]>([]);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState<GoalWithHabits | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        load(data.user.id);
      } else {
        setLoading(false);
      }
    });
  }, []);

  async function load(uid: string) {
    setLoading(true);
    try {
      const supabase = createClient();
      const [goalsData, habitsRes] = await Promise.all([
        fetchGoals(uid),
        supabase.from('habits').select('*').eq('user_id', uid).order('created_at'),
      ]);
      setGoals(goalsData);
      setAllHabits((habitsRes.data ?? []) as Habit[]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteGoal(id);
    if (userId) load(userId);
  }

  function handleEdit(goal: GoalWithHabits) {
    setEditing(goal);
    setShowModal(true);
  }

  function handleNew() {
    setEditing(null);
    setShowModal(true);
  }

  function handleSaved() {
    if (userId) load(userId);
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{t.goals_title}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {goals.length > 0
              ? `${goals.length} ${goals.length === 1 ? 'goal' : 'goals'}`
              : t.goals_empty_desc}
          </p>
        </div>
        <button
          onClick={handleNew}
          className="px-4 py-2 rounded-xl font-semibold text-sm text-white transition-all"
          style={{ background: 'var(--primary)', boxShadow: 'var(--shadow-glow)' }}
        >
          {t.goals_new}
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2].map(i => (
            <div key={i} className="h-40 rounded-2xl animate-pulse" style={{ background: 'var(--surface)' }} />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div
          className="rounded-2xl flex flex-col items-center justify-center py-20 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="text-5xl mb-4">🎯</div>
          <h2 className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>{t.goals_empty}</h2>
          <p className="text-sm max-w-xs" style={{ color: 'var(--text-muted)' }}>{t.goals_empty_desc}</p>
          <button
            onClick={handleNew}
            className="mt-6 px-6 py-2.5 rounded-xl font-semibold text-sm text-white"
            style={{ background: 'var(--primary)' }}
          >
            {t.goals_new}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {goals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {userId && (
        <GoalModal
          visible={showModal}
          userId={userId}
          allHabits={allHabits}
          goal={editing ?? undefined}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
