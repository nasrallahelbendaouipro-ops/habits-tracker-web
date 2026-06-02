'use client';

import { useLocale } from '@/lib/i18n';
import ModalShell from '@/components/ui/ModalShell';
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

  return (
    <ModalShell
      visible={visible}
      onClose={onClose}
      title={mode === 'add' ? t.modal_new_habit : t.modal_edit_habit}
    >
      <HabitForm
        initial={habit ? {
          name: habit.name, icon: habit.icon, color: habit.color,
          type: habit.type, metadata: habit.metadata,
          frequency: habit.frequency, target_days: habit.target_days,
        } : undefined}
        onSubmit={onSubmit}
        submitLabel={mode === 'add' ? t.modal_add_habit_btn : t.modal_save_changes}
      />
    </ModalShell>
  );
}
