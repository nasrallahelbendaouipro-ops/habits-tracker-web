'use client';

import { useEffect } from 'react';
import { useLocale } from '@/lib/i18n';
import HabitForm from './HabitForm';
import type { Habit, HabitFormValues } from '@/lib/types';

type Props = {
  mode: 'add' | 'edit';
  habit?: Habit;
  visible: boolean;
  onClose: () => void;
  onSubmit: (values: HabitFormValues) => Promise<void>;
};

export default function HabitModal({ mode, habit, visible, onClose, onSubmit }: Props) {
  const { t } = useLocale();

  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, onClose]);

  useEffect(() => {
    document.body.style.overflow = visible ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-4"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full md:max-w-lg max-h-[78vh] flex flex-col rounded-2xl animate-slide-up"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
      >
        {/* Header — never scrolls */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', borderRadius: '1rem 1rem 0 0' }}
        >
          <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
            {mode === 'add' ? t.modal_new_habit : t.modal_edit_habit}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-all"
            style={{ background: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}
          >
            ✕
          </button>
        </div>

        {/* Form — scrolls inside the modal */}
        <div className="px-6 py-5 overflow-y-auto flex-1 scroll-hidden">
          <HabitForm
            initial={habit ? {
              name: habit.name, icon: habit.icon, color: habit.color,
              type: habit.type, metadata: habit.metadata,
              frequency: habit.frequency, target_days: habit.target_days,
            } : undefined}
            onSubmit={onSubmit}
            submitLabel={mode === 'add' ? t.modal_add_habit_btn : t.modal_save_changes}
          />
        </div>
      </div>
    </div>
  );
}
