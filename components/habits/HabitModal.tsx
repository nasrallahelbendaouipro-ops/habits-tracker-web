'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 overflow-y-auto"
          style={{ backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}
          initial={{ background: 'rgba(0,0,0,0)' }}
          animate={{ background: 'rgba(0,0,0,0.6)' }}
          exit={{ background: 'rgba(0,0,0,0)' }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              className="w-full md:max-w-lg rounded-2xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
              initial={{ opacity: 0, y: 32, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-6 py-4 sticky top-0 rounded-t-2xl"
                style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
              >
                <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                  {mode === 'add' ? t.modal_new_habit : t.modal_edit_habit}
                </h2>
                <motion.button
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
                  style={{ background: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label="Close modal"
                >
                  ✕
                </motion.button>
              </div>

              {/* Form */}
              <div className="px-6 py-5">
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
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
