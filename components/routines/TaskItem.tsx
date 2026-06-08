'use client';

import type { RoutineTask } from '@/lib/types';

interface TaskItemProps {
  task: RoutineTask;
  checked: boolean;
  checkedRight?: boolean;
  checkedLeft?: boolean;
  accentColor: string;
  onToggle?: (taskId: string) => void;
  readOnly?: boolean;
}

export default function TaskItem({ task, checked, checkedRight, checkedLeft, accentColor, onToggle, readOnly }: TaskItemProps) {
  if (task.type === 'resource') {
    return (
      <div className="flex items-start gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-base flex-shrink-0 mt-0.5">🔗</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{task.name}</p>
          {task.resources?.length ? (
            <div className="flex flex-wrap gap-2 mt-1.5">
              {task.resources.map((r, i) => (
                <a
                  key={i}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] px-2.5 py-1 rounded-lg font-medium"
                  style={{ background: accentColor + '15', color: accentColor, border: `1px solid ${accentColor}30` }}
                >
                  ↗ {r.label}
                </a>
              ))}
            </div>
          ) : null}
          {task.note && <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{task.note}</p>}
        </div>
      </div>
    );
  }

  if (task.type === 'bilateral') {
    return (
      <>
        <BilateralRow
          task={task}
          side="right"
          checked={!!checkedRight}
          accentColor={accentColor}
          onToggle={onToggle}
          readOnly={readOnly}
        />
        <BilateralRow
          task={task}
          side="left"
          checked={!!checkedLeft}
          accentColor={accentColor}
          onToggle={onToggle}
          readOnly={readOnly}
        />
      </>
    );
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 transition-all"
      style={{ borderBottom: '1px solid var(--border)', background: checked ? accentColor + '08' : 'transparent' }}
      onClick={readOnly ? undefined : () => onToggle?.(task.id)}
    >
      <Checkbox checked={checked} color={accentColor} readOnly={readOnly} />
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium"
          style={{ color: checked ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: checked ? 'line-through' : 'none' }}
        >
          {task.name}
        </p>
        {task.note && <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{task.note}</p>}
      </div>
      <div className="flex gap-1.5 flex-shrink-0">
        {task.type === 'reps' && task.reps != null && (
          <Pill label={`${task.reps} reps`} color={accentColor} />
        )}
        {task.type === 'reps' && task.sets != null && (
          <Pill label={`× ${task.sets}`} dim />
        )}
        {task.type === 'time' && task.duration_min != null && (
          <Pill label={`${task.duration_min} min`} color={accentColor} />
        )}
      </div>
    </div>
  );
}

function BilateralRow({
  task, side, checked, accentColor, onToggle, readOnly,
}: { task: RoutineTask; side: 'right' | 'left'; checked: boolean; accentColor: string; onToggle?: (id: string) => void; readOnly?: boolean }) {
  const taskKey = `${task.id}:${side}`;
  const label = side === 'right' ? '→ Right' : '← Left';
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 transition-all"
      style={{ borderBottom: '1px solid var(--border)', background: checked ? accentColor + '08' : 'transparent' }}
      onClick={readOnly ? undefined : () => onToggle?.(taskKey)}
    >
      <Checkbox checked={checked} color={accentColor} readOnly={readOnly} />
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium"
          style={{ color: checked ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: checked ? 'line-through' : 'none' }}
        >
          {task.name}
        </p>
      </div>
      <div className="flex gap-1.5 flex-shrink-0 items-center">
        {task.reps != null && <Pill label={`${task.reps} reps`} color={accentColor} />}
        <span
          className="text-[10px] px-2 py-0.5 rounded font-mono"
          style={{ background: 'var(--surface-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

function Checkbox({ checked, color, readOnly }: { checked: boolean; color: string; readOnly?: boolean }) {
  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
      style={{
        background: checked ? color : 'transparent',
        border: `2px solid ${checked ? color : 'var(--border)'}`,
        cursor: readOnly ? 'default' : 'pointer',
      }}
    >
      {checked && (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

function Pill({ label, color, dim }: { label: string; color?: string; dim?: boolean }) {
  return (
    <span
      className="text-[11px] px-2 py-0.5 rounded-full font-mono font-medium"
      style={
        dim
          ? { background: 'var(--surface-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
          : { background: (color ?? 'var(--primary)') + '18', color: color ?? 'var(--primary)' }
      }
    >
      {label}
    </span>
  );
}
