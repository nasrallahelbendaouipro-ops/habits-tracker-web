'use client';

import { useState } from 'react';
import { nanoid } from 'nanoid';
import type { RoutineTask, RoutineTaskType } from '@/lib/types';

interface Props {
  tasks: RoutineTask[];
  onChange: (tasks: RoutineTask[]) => void;
  accentColor: string;
}

const TYPE_LABELS: Record<RoutineTaskType, string> = {
  reps: 'Reps × Sets',
  time: 'Time-based',
  bilateral: 'Bilateral (L + R)',
  resource: 'Resource link',
};

export default function TaskListEditor({ tasks, onChange, accentColor }: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Partial<RoutineTask>>({ type: 'reps' });

  function addTask() {
    if (!draft.name?.trim()) return;
    const task: RoutineTask = {
      id: nanoid(),
      name: draft.name.trim(),
      type: draft.type ?? 'reps',
      section: draft.section?.trim() || undefined,
      sets: draft.sets,
      reps: draft.reps,
      duration_min: draft.duration_min,
      note: draft.note?.trim() || undefined,
      resources: draft.resources?.length ? draft.resources : undefined,
    };
    onChange([...tasks, task]);
    setDraft({ type: 'reps' });
    setAdding(false);
  }

  function removeTask(id: string) {
    onChange(tasks.filter(t => t.id !== id));
  }

  function moveTask(id: string, dir: -1 | 1) {
    const idx = tasks.findIndex(t => t.id === id);
    if (idx < 0) return;
    const next = [...tasks];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onChange(next);
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {tasks.length === 0 && !adding && (
        <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No tasks yet</p>
      )}

      {tasks.map((task, idx) => (
        <div
          key={task.id}
          className="flex items-center gap-2 px-4 py-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex-1 min-w-0">
            {task.section && (
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-muted)' }}>
                {task.section}
              </p>
            )}
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{task.name}</p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {TYPE_LABELS[task.type]}
              {task.type === 'reps' && task.reps != null ? ` · ${task.reps}r` : ''}
              {task.type === 'reps' && task.sets != null ? ` × ${task.sets}s` : ''}
              {task.type === 'time' && task.duration_min != null ? ` · ${task.duration_min}min` : ''}
            </p>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={() => moveTask(task.id, -1)} disabled={idx === 0} className="w-7 h-7 rounded-lg text-xs flex items-center justify-center" style={{ background: 'var(--surface-elevated)', color: 'var(--text-muted)' }}>↑</button>
            <button onClick={() => moveTask(task.id, 1)} disabled={idx === tasks.length - 1} className="w-7 h-7 rounded-lg text-xs flex items-center justify-center" style={{ background: 'var(--surface-elevated)', color: 'var(--text-muted)' }}>↓</button>
            <button onClick={() => removeTask(task.id)} className="w-7 h-7 rounded-lg text-xs flex items-center justify-center" style={{ background: 'rgba(255,107,107,0.1)', color: 'var(--error)' }}>✕</button>
          </div>
        </div>
      ))}

      {adding ? (
        <div className="p-4 flex flex-col gap-3" style={{ borderTop: tasks.length ? '1px solid var(--border)' : undefined }}>
          {/* Section divider (optional) */}
          <input
            value={draft.section ?? ''}
            onChange={e => setDraft(d => ({ ...d, section: e.target.value }))}
            placeholder="Section label (optional, e.g. Force, Cardio)"
            className="w-full px-3 py-2 rounded-xl text-xs outline-none"
            style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          />
          {/* Task name */}
          <input
            value={draft.name ?? ''}
            onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
            placeholder="Task name *"
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            autoFocus
          />
          {/* Type selector */}
          <div className="flex gap-1.5 flex-wrap">
            {(Object.keys(TYPE_LABELS) as RoutineTaskType[]).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setDraft(d => ({ ...d, type }))}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: draft.type === type ? accentColor + '20' : 'var(--surface-elevated)',
                  color: draft.type === type ? accentColor : 'var(--text-secondary)',
                  border: `1px solid ${draft.type === type ? accentColor : 'var(--border)'}`,
                }}
              >
                {TYPE_LABELS[type]}
              </button>
            ))}
          </div>
          {/* Type-specific fields */}
          {(draft.type === 'reps' || draft.type === 'bilateral') && (
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                value={draft.reps ?? ''}
                onChange={e => setDraft(d => ({ ...d, reps: +e.target.value || undefined }))}
                placeholder="Reps"
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
              {draft.type === 'reps' && (
                <input
                  type="number"
                  min={1}
                  value={draft.sets ?? ''}
                  onChange={e => setDraft(d => ({ ...d, sets: +e.target.value || undefined }))}
                  placeholder="Sets"
                  className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              )}
            </div>
          )}
          {draft.type === 'time' && (
            <input
              type="number"
              min={1}
              value={draft.duration_min ?? ''}
              onChange={e => setDraft(d => ({ ...d, duration_min: +e.target.value || undefined }))}
              placeholder="Duration (minutes)"
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          )}
          {draft.type === 'resource' && (
            <div className="flex gap-2">
              <input
                value={(draft.resources?.[0]?.label) ?? ''}
                onChange={e => setDraft(d => ({ ...d, resources: [{ label: e.target.value, url: d.resources?.[0]?.url ?? '' }] }))}
                placeholder="Link label"
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
              <input
                value={(draft.resources?.[0]?.url) ?? ''}
                onChange={e => setDraft(d => ({ ...d, resources: [{ label: d.resources?.[0]?.label ?? '', url: e.target.value }] }))}
                placeholder="URL"
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
          )}
          {/* Note */}
          <input
            value={draft.note ?? ''}
            onChange={e => setDraft(d => ({ ...d, note: e.target.value }))}
            placeholder="Note (optional, e.g. 1min on / 1min off)"
            className="w-full px-3 py-2 rounded-xl text-xs outline-none"
            style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setAdding(false); setDraft({ type: 'reps' }); }}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--surface-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={addTask}
              disabled={!draft.name?.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: draft.name?.trim() ? accentColor : 'var(--border)' }}
            >
              Add task
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full py-3 text-sm font-semibold transition-all"
          style={{ color: accentColor, borderTop: tasks.length ? '1px solid var(--border)' : undefined }}
        >
          + Add task
        </button>
      )}
    </div>
  );
}
