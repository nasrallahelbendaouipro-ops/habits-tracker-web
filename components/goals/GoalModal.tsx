'use client';

import { useState, useEffect } from 'react';
import { useLocale } from '@/lib/i18n';
import { HABIT_ICONS, HABIT_COLORS } from '@/lib/habits';
import { createGoal, updateGoal, setGoalHabits } from '@/lib/goals';
import type { Goal, GoalWithHabits, Habit } from '@/lib/types';

type Props = {
  visible: boolean;
  userId: string;
  allHabits: Habit[];
  goal?: GoalWithHabits;
  onClose: () => void;
  onSaved: () => void;
};

export default function GoalModal({ visible, userId, allHabits, goal, onClose, onSaved }: Props) {
  const { t } = useLocale();
  const [title, setTitle]       = useState('');
  const [icon, setIcon]         = useState('🎯');
  const [color, setColor]       = useState('#6C63FF');
  const [description, setDesc]  = useState('');
  const [deadline, setDeadline] = useState('');
  const [habitIds, setHabitIds] = useState<string[]>([]);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (!visible) return;
    if (goal) {
      setTitle(goal.title);
      setIcon(goal.icon);
      setColor(goal.color);
      setDesc(goal.description ?? '');
      setDeadline(goal.deadline ?? '');
      setHabitIds(goal.habits.map(h => h.id));
    } else {
      setTitle(''); setIcon('🎯'); setColor('#6C63FF');
      setDesc(''); setDeadline(''); setHabitIds([]);
    }
    setError('');
  }, [visible, goal]);

  useEffect(() => {
    if (!visible) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [visible, onClose]);

  useEffect(() => {
    document.body.style.overflow = visible ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [visible]);

  if (!visible) return null;

  function toggleHabit(id: string) {
    setHabitIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function handleSave() {
    if (!title.trim()) { setError(t.form_err_name); return; }
    setSaving(true);
    setError('');
    try {
      const values: Omit<Goal, 'id' | 'created_at'> = {
        user_id: userId, title: title.trim(), icon, color,
        description: description.trim() || undefined,
        deadline: deadline || undefined,
      };
      const saved = goal
        ? (await updateGoal(goal.id, values), goal)
        : await createGoal(values);
      await setGoalHabits(goal?.id ?? saved.id, habitIds);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.form_err_generic);
    } finally {
      setSaving(false);
    }
  }

  const inputBase = {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full md:max-w-lg rounded-2xl animate-slide-up overflow-hidden max-h-[90vh] flex flex-col"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
            {goal ? t.goals_edit : t.goals_new}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
            style={{ background: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}
          >✕</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
              {t.form_name}
            </label>
            <input
              type="text"
              value={title}
              onChange={e => { setTitle(e.target.value); setError(''); }}
              placeholder={t.goals_new}
              maxLength={60}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={inputBase}
              onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              autoFocus
            />
          </div>

          {/* Icon picker */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
              {t.form_icon}
            </label>
            <div className="flex flex-wrap gap-2">
              {HABIT_ICONS.map(ic => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className="w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all"
                  style={{
                    background: icon === ic ? color + '30' : 'var(--surface-elevated)',
                    border: `2px solid ${icon === ic ? color : 'var(--border)'}`,
                  }}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
              {t.form_color}
            </label>
            <div className="flex flex-wrap gap-2">
              {HABIT_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full transition-all"
                  style={{
                    background: c,
                    outline: color === c ? `3px solid ${c}` : 'none',
                    outlineOffset: '2px',
                    transform: color === c ? 'scale(1.15)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
              {t.goals_description} <span style={{ color: 'var(--text-disabled)' }}>{t.event_optional}</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDesc(e.target.value)}
              placeholder={t.goals_description_placeholder}
              rows={2}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
              style={inputBase}
              onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
              {t.goals_deadline} <span style={{ color: 'var(--text-disabled)' }}>{t.event_optional}</span>
            </label>
            <input
              type="date"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ ...inputBase, colorScheme: 'dark' }}
              onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          {/* Habits */}
          {allHabits.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                {t.goals_select_habits}
              </label>
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                {allHabits.map(h => {
                  const selected = habitIds.includes(h.id);
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => toggleHabit(h.id)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                      style={{
                        background: selected ? h.color + '15' : 'var(--surface-elevated)',
                        border: `1px solid ${selected ? h.color + '50' : 'var(--border)'}`,
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all"
                        style={{
                          background: selected ? h.color : 'transparent',
                          border: `2px solid ${selected ? h.color : 'var(--border)'}`,
                        }}
                      >
                        {selected && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm">{h.icon}</span>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{h.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {error && <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all"
            style={{ background: saving ? 'var(--text-muted)' : color, cursor: saving ? 'not-allowed' : 'pointer' }}
          >
            {saving ? t.form_saving : t.goals_save}
          </button>
        </div>
      </div>
    </div>
  );
}
