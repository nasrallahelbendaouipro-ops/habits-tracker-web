'use client';

import type { RoutineTask, ExerciseProgress } from '@/lib/types';

interface Props {
  task: RoutineTask;
  progress: ExerciseProgress;
  accentColor: string;
  onSetCount?: (taskId: string, n: number) => void;
  onBilateralSide?: (taskId: string, side: 'left' | 'right') => void;
  readOnly?: boolean;
}

const EMPTY: ExerciseProgress = { completed_sets: 0, current_left_done: false, current_right_done: false };

export default function SportTaskCard({ task, progress = EMPTY, accentColor, onSetCount, onBilateralSide, readOnly = false }: Props) {
  const totalSets = task.sets ?? 1;
  const { completed_sets, current_left_done, current_right_done } = progress;
  const allDone = completed_sets >= totalSets;

  function handleSetTap(n: number) {
    if (readOnly) return;
    // Tap same number = undo; tap different = jump there
    const next = n === completed_sets ? n - 1 : n;
    onSetCount?.(task.id, Math.max(0, next));
  }

  return (
    <div
      className="px-4 py-3.5 transition-all"
      style={{ borderBottom: '1px solid var(--border)', background: allDone ? accentColor + '06' : 'transparent' }}
    >
      {/* Task name + metadata */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-semibold"
            style={{ color: allDone ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: allDone ? 'line-through' : 'none' }}
          >
            {task.name}
          </p>
          {task.note && (
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{task.note}</p>
          )}
        </div>
        <div className="flex gap-1.5 flex-shrink-0 items-center">
          {task.type === 'bilateral' && task.reps != null && (
            <Pill label={`${task.reps}L · ${task.reps}R`} color={accentColor} />
          )}
          {task.type === 'reps' && task.reps != null && (
            <Pill label={`${task.reps} reps`} color={accentColor} />
          )}
          {task.type === 'time' && task.duration_min != null && (
            <Pill label={`${task.duration_min} min`} color={accentColor} />
          )}
        </div>
      </div>

      {/* Numbered set buttons */}
      <div className="flex gap-1.5 flex-wrap">
        {Array.from({ length: Math.min(totalSets, 10) }, (_, i) => i + 1).map(n => {
          const done = n <= completed_sets;
          return (
            <button
              key={n}
              onClick={() => handleSetTap(n)}
              disabled={readOnly}
              className="w-9 h-9 rounded-xl text-sm font-bold transition-all"
              style={{
                background: done ? accentColor : 'var(--surface-elevated)',
                color: done ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${done ? accentColor + '80' : 'var(--border)'}`,
                cursor: readOnly ? 'default' : 'pointer',
                boxShadow: done ? `0 2px 8px ${accentColor}40` : 'none',
              }}
            >
              {n}
            </button>
          );
        })}
        {totalSets > 10 && (
          <span className="self-center text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
            +{totalSets - 10} more
          </span>
        )}
      </div>

      {/* Bilateral: L / R buttons for the current in-progress set */}
      {task.type === 'bilateral' && !allDone && !readOnly && (
        <div className="flex gap-2 mt-3">
          <SideButton
            label="← L"
            done={current_left_done}
            color={accentColor}
            onClick={() => onBilateralSide?.(task.id, 'left')}
          />
          <SideButton
            label="R →"
            done={current_right_done}
            color={accentColor}
            onClick={() => onBilateralSide?.(task.id, 'right')}
          />
        </div>
      )}

      {allDone && (
        <p className="mt-2 text-[11px] font-semibold" style={{ color: accentColor }}>
          ✓ All {totalSets} sets complete
        </p>
      )}
    </div>
  );
}

function SideButton({ label, done, color, onClick }: { label: string; done: boolean; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={done}
      className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
      style={{
        background: done ? color + '25' : color + '10',
        color: done ? color : 'var(--text-secondary)',
        border: `1px solid ${done ? color + '60' : 'var(--border)'}`,
        cursor: done ? 'default' : 'pointer',
      }}
    >
      {done ? `✓ ${label}` : label}
    </button>
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
