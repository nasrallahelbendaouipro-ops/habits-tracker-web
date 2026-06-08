'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dumbbell, ClipboardList, Target, Activity, Brain,
  Sparkles, BarChart2, Bot, Settings, PenLine,
} from 'lucide-react';
import { useLocale } from '@/lib/i18n';

type SheetItem = {
  href: string;
  Icon: React.ComponentType<{ size?: number }>;
  labelKey: keyof ReturnType<typeof useLocale>['t'];
};

const SHEET_ITEMS: SheetItem[] = [
  { href: '/habits',    Icon: Dumbbell,      labelKey: 'nav_habits' },
  { href: '/routines',  Icon: ClipboardList, labelKey: 'nav_routines' },
  { href: '/goals',     Icon: Target,        labelKey: 'nav_goals' },
  { href: '/body',      Icon: Activity,      labelKey: 'nav_body' },
  { href: '/mind',      Icon: Brain,         labelKey: 'nav_mind' },
  { href: '/soul',      Icon: Sparkles,      labelKey: 'nav_soul' },
  { href: '/analytics', Icon: BarChart2,     labelKey: 'nav_analytics' },
  { href: '/planner',   Icon: Bot,           labelKey: 'nav_planner' },
  { href: '/settings',  Icon: Settings,      labelKey: 'nav_settings' },
];

type Props = { open: boolean; onClose: () => void };

export default function MoreSheet({ open, onClose }: Props) {
  const pathname = usePathname();
  const { t } = useLocale();

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 md:hidden"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="fixed left-0 right-0 z-50 md:hidden rounded-t-2xl overflow-hidden"
            style={{
              bottom: 'var(--bottomnav-height)',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderBottom: 'none',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
            </div>

            {/* Grid */}
            <div className="grid grid-cols-3 gap-1 px-3 pb-4">
              {SHEET_ITEMS.map(({ href, Icon, labelKey }) => {
                const active = pathname === href || pathname.startsWith(href + '/');
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    aria-current={active ? 'page' : undefined}
                    className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all"
                    style={{
                      background: active ? 'var(--primary-muted)' : 'transparent',
                      color: active ? 'var(--primary)' : 'var(--text-secondary)',
                    }}
                  >
                    <Icon size={22} aria-hidden="true" />
                    <span className="text-[10px] font-medium text-center leading-tight">
                      {t[labelKey] as string}
                    </span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
