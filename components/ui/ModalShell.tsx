'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** Fixed footer content (e.g. a Save button) */
  footer?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Shared modal shell: backdrop + card with sticky header/footer and scrollable body.
 * Uses dvh so mobile browser chrome doesn't clip the modal.
 */
export default function ModalShell({ visible, onClose, title, footer, children }: Props) {
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, onClose]);

  useEffect(() => {
    // Set on <html> (not just body) so the scrollbar track disappears completely on Windows
    document.documentElement.style.overflow = visible ? 'hidden' : '';
    return () => { document.documentElement.style.overflow = ''; };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:pt-[8vh]"
          style={{ backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}
          initial={{ background: 'rgba(0,0,0,0)' }}
          animate={{ background: 'rgba(0,0,0,0.6)' }}
          exit={{ background: 'rgba(0,0,0,0)' }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="w-full sm:max-w-lg flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-lg)',
              maxHeight: 'min(88dvh, 760px)',
            }}
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: 'spring' as const, stiffness: 400, damping: 30 }}
          >
            {/* Header — always visible */}
            <div
              className="flex items-center justify-between px-6 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
            >
              <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{title}</h2>
              <motion.button
                onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
                style={{ background: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Close"
              >
                ✕
              </motion.button>
            </div>

            {/* Body — scrollable */}
            <div className="overflow-y-auto flex-1 px-6 py-5">
              {children}
            </div>

            {/* Footer — always visible */}
            {footer && (
              <div className="px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
