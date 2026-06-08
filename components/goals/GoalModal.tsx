'use client';

import { useState, useEffect } from 'react';
import { useLocale } from '@/lib/i18n';
import { HABIT_ICONS, HABIT_COLORS } from '@/lib/habits';
import { createGoal, updateGoal, setGoalHabits, setGoalRoutines } from '@/lib/goals';
import type { Goal, GoalWithLinked, Habit, HabitDimension, Routine } from '@/lib/types';
import ModalShell from '@/components/ui/ModalShell';

const DIMENSION_COLORS: Record<HabitDimension, string> = {
  body: 'var(--body)',
  mind: 'var(--mind)',
  soul: 'var(--soul)',
};

const DIMENSION_LABELS: Record<HabitDimension, string> = {
  body: '💪 Body',
  mind: '🧠 Mind',
  soul: '✨ Soul',
};

type Props = {
  visible: boolean;
  userId: string;
  allHabits: Habit[];
  allRoutines: Routine[];
  goal?: GoalWithLinked;
  onClose: () => void;
  onSaved: () => void;
};

export default function GoalModal({ visible, userId, allHabits, allRoutines, goal, onClose, onSaved }: Props) {
  const { t } = useLocale();
  const [title, setTitle]               = useState('');
  const [icon, setIcon]                 = useState('🎯');
  const [color, setColor]               = useState('#6C63FF');
  const [description, setDesc]          = useState('');
  const [deadline, setDeadline]         = useState('');
  const [dimension, setDimension]       = useState<HabitDimension>('body');
  const [startingPoint, setStartingPt]  = useState('');
  const [targetPoint, setTargetPt]      = useState('');
  const [currentValue, setCurrentVal]   = useState('');
  const [unit, setUnit]                 = useState('');
  const [habitIds, setHabitIds]         = useState<string[]>([]);
  const [routineIds, setRoutineIds]     = useState<string[]>([]);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');

  useEffect(() => {
    if (!visible) return;
    if (goal) {
      setTitle(goal.title);
      setIcon(goal.icon);
      setColor(goal.color);
      setDesc(goal.description ?? '');
      setDeadline(goal.deadline ?? '');
      setDimension((goal.dimension as HabitDimension) ?? 'body');
      setStartingPt(goal.starting_point != null ? String(goal.starting_point) : '');
      setTargetPt(goal.target_point != null ? String(goal.target_point) : '');
      setCurrentVal(goal.current_value != null ? String(goal.current_value) : '');
      setUnit(goal.unit ?? '');
      setHabitIds(goal.habits.map(h => h.id));
      setRoutineIds(goal.routines?.map(r => r.id) ?? []);
    } else {
      setTitle(''); setIcon('🎯'); setColor('#6C63FF');
      setDesc(''); setDeadline(''); setDimension('body');
      setStartingPt(''); setTargetPt(''); setCurrentVal(''); setUnit('');
      setHabitIds([]);
      setRoutineIds([]);
    }
    setError('');
  }, [visible, goal]);

  if (!visible) return null;

  function toggleHabit(id: string) {
    setHabitIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function toggleRoutine(id: string) {
    setRoutineIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function handleSave() {
    if (!title.trim()) { setError(t.form_err_name); return; }
    setSaving(true);
    setError('');
    try {
      const values: Omit<Goal, 'id' | 'created_at'> = {
        user_id: userId, title: title.trim(), icon, color, dimension,
        description: description.trim() || undefined,
        deadline: deadline || undefined,
        starting_point: startingPoint !== '' ? Number(startingPoint) : undefined,
        target_point: targetPoint !== '' ? Number(targetPoint) : undefined,
        current_value: currentValue !== '' ? Number(currentValue) : undefined,
        unit: unit.trim() || undefined,
      };
      const saved = goal
        ? (await updateGoal(goal.id, values), goal)
        : await createGoal(values);
      await setGoalHabits(goal?.id ?? saved.id, habitIds);
      await setGoalRoutines(goal?.id ?? saved.id, routineIds);
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

  const dimColor = DIMENSION_COLORS[dimension];

  const saveButton = (
    <button
      onClick={handleSave}
      disabled={saving}
      className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all"
      style={{ background: saving ? 'var(--text-muted)' : color, cursor: saving ? 'not-allowed' : 'pointer' }}
    >
      {saving ? t.form_saving : t.goals_save}
    </button>
  );

  return (
    <ModalShell
      visible={visible}
      onClose={onClose}
      title={goal ? t.goals_edit : t.goals_new}
      footer={saveButton}
    >
      <div className="flex flex-col gap-5">

          {/* Dimension picker */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
              Dimension
            </label>
            <div className="flex gap-2">
              {(['body', 'mind', 'soul'] as HabitDimension[]).map(d => {
                const active = dimension === d;
                const c = DIMENSION_COLORS[d];
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDimension(d)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                    style={{
                      background: active ? `color-mix(in srgb, ${c} 15%, transparent)` : 'var(--surface-elevated)',
                      border: `1px solid ${active ? c : 'var(--border)'}`,
                      color: active ? c : 'var(--text-secondary)',
                    }}
                  >
                    {DIMENSION_LABELS[d]}
                  </button>
                );
              })}
            </div>
          </div>

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
              onFocus={e => (e.target.style.borderColor = dimColor)}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              autoFocus
            />
          </div>

          {/* KPI fields */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
              Progress KPI <span style={{ color: 'var(--text-disabled)' }}>(optional)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>Starting point</label>
                <input
                  type="number"
                  value={startingPoint}
                  onChange={e => setStartingPt(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={inputBase}
                />
              </div>
              <div>
                <label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>Target</label>
                <input
                  type="number"
                  value={targetPoint}
                  onChange={e => setTargetPt(e.target.value)}
                  placeholder="100"
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={inputBase}
                />
              </div>
              <div>
                <label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>Current value</label>
                <input
                  type="number"
                  value={currentValue}
                  onChange={e => setCurrentVal(e.target.value)}
                  placeholder="—"
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={inputBase}
                />
              </div>
              <div>
                <label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>Unit</label>
                <input
                  type="text"
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  placeholder="kg, books, min…"
                  maxLength={20}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={inputBase}
                />
              </div>
            </div>
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
                    background: icon === ic ? `color-mix(in srgb, ${color} 20%, transparent)` : 'var(--surface-elevated)',
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
                        background: selected ? `color-mix(in srgb, ${h.color} 12%, transparent)` : 'var(--surface-elevated)',
                        border: `1px solid ${selected ? h.color : 'var(--border)'}`,
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all"
                        style={{ background: selected ? h.color : 'transparent', border: `2px solid ${selected ? h.color : 'var(--border)'}` }}
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

          {/* Routines */}
          {allRoutines.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                Linked Routines <span style={{ color: 'var(--text-disabled)', fontWeight: 400 }}>(optional)</span>
              </label>
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                {allRoutines.map(r => {
                  const selected = routineIds.includes(r.id);
                  const rColor = r.color ?? 'var(--primary)';
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleRoutine(r.id)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                      style={{
                        background: selected ? `color-mix(in srgb, ${rColor} 12%, transparent)` : 'var(--surface-elevated)',
                        border: `1px solid ${selected ? rColor : 'var(--border)'}`,
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all"
                        style={{ background: selected ? rColor : 'transparent', border: `2px solid ${selected ? rColor : 'var(--border)'}` }}
                      >
                        {selected && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      {r.icon && <span className="text-sm">{r.icon}</span>}
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{r.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {error && <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>}
      </div>
    </ModalShell>
  );
}
