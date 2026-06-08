'use client';

import { useLocale } from '@/lib/i18n';
import ModalShell from './ModalShell';

type Props = {
  visible: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({ visible, title, message, onConfirm, onCancel }: Props) {
  const { t } = useLocale();

  return (
    <ModalShell
      visible={visible}
      onClose={onCancel}
      title={title ?? t.confirm_delete_title}
      footer={
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}
          >
            {t.confirm_cancel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: 'var(--error)' }}
          >
            {t.confirm_delete}
          </button>
        </div>
      }
    >
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{message}</p>
    </ModalShell>
  );
}
