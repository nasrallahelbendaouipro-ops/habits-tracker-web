'use client';

import { useState } from 'react';
import type { Routine, RoutineTask, RoutineCategory } from '@/lib/types';
import TaskListEditor from './TaskListEditor';

const ICONS = ['🦶', '💥', '🌀', '💪', '🏃', '🤸', '📊', '🗃️', '☁️', '⚡', '🔄', '📚', '🎯', '🧘', '🏋️', '🥊', '⚽', '🎵', '🧠', '💡'];
const COLORS = ['#FF4D00', '#FFB800', '#00D4FF', '#00E676', '#F2C811', '#4A9EFF', '#FF9900', '#A78BFA', '#F97316', '#6C63FF', '#FF6B6B', '#4ECDC4'];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Props {
  initial?: Partial<Routine>;
  onSubmit: (data: Omit<Routine, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

export default function RoutineForm({ initial, onSubmit, onCancel, submitting }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState<RoutineCategory>(initial?.category ?? 'sport');
  const [icon, setIcon] = useState(initial?.icon ?? '📋');
  const [color, setColor] = useState(initial?.color ?? COLORS[0]);
  const [days, setDays] = useState<number[]>(initial?.schedule_days ?? []);
  const [tasks, setTasks] = useState<RoutineTask[]>(initial?.tasks ?? []);

  function toggleDay(d: number) {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await onSubmit({ name: name.trim(), category, icon, color, schedule_days: days, tasks });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Name */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
          Routine name
        </label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Footwork, Power BI"
          required
          className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none"
          style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
          Category
        </label>
        <div className="flex gap-2">
          {(['sport', 'data', 'custom'] as RoutineCategory[]).map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className="px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all"
              style={{
                background: category === c ? color + '20' : 'var(--surface-elevated)',
                color: category === c ? color : 'var(--text-secondary)',
                border: `1px solid ${category === c ? color : 'var(--border)'}`,
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Icon picker */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
          Icon
        </label>
        <div className="flex flex-wrap gap-2">
          {ICONS.map(ic => (
            <button
              key={ic}
              type="button"
              onClick={() => setIcon(ic)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all"
              style={{
                background: icon === ic ? color + '20' : 'var(--surface-elevated)',
                border: `1px solid ${icon === ic ? color : 'var(--border)'}`,
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
          Color
        </label>
        <div className="flex flex-wrap gap-2">
          {COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="w-8 h-8 rounded-full transition-all"
              style={{
                background: c,
                border: color === c ? `3px solid white` : '2px solid transparent',
                outline: color === c ? `2px solid ${c}` : 'none',
              }}
            />
          ))}
        </div>
      </div>

      {/* Schedule days */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
          Schedule (days of week)
        </label>
        <div className="flex gap-1.5">
          {DAY_LABELS.map((label, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggleDay(i)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: days.includes(i) ? color + '20' : 'var(--surface-elevated)',
                color: days.includes(i) ? color : 'var(--text-muted)',
                border: `1px solid ${days.includes(i) ? color : 'var(--border)'}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Task list editor */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
          Tasks
        </label>
        <TaskListEditor tasks={tasks} onChange={setTasks} accentColor={color} />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all"
          style={{ background: 'var(--surface-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="flex-1 py-3 rounded-xl font-semibold text-sm text-white transition-all"
          style={{ background: submitting || !name.trim() ? 'var(--border)' : color, opacity: submitting ? 0.7 : 1 }}
        >
          {submitting ? 'Saving…' : initial?.id ? 'Save changes' : 'Create routine'}
        </button>
      </div>
    </form>
  );
}
