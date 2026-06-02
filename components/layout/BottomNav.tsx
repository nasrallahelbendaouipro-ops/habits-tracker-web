'use client';

import type { ComponentType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PenLine, ClipboardList, Target, User } from 'lucide-react';
import { useLocale } from '@/lib/i18n';

type NavItem =
  | { href: string; Icon: ComponentType<{ size?: number }>; labelKey: 'nav_home' | 'nav_goals' | 'nav_profile'; staticLabel?: never }
  | { href: string; Icon: ComponentType<{ size?: number }>; labelKey: null; staticLabel: string };

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', Icon: Home,          labelKey: 'nav_home' },
  { href: '/checkin',   Icon: PenLine,       labelKey: null, staticLabel: 'Check-In' },
  { href: '/routines',  Icon: ClipboardList, labelKey: null, staticLabel: 'Routines' },
  { href: '/goals',     Icon: Target,        labelKey: 'nav_goals' },
  { href: '/settings',  Icon: User,          labelKey: 'nav_profile' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useLocale();


  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2"
      style={{
        height: 'var(--bottomnav-height)',
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.3)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {NAV_ITEMS.map(({ href, Icon, labelKey, staticLabel }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        const label = staticLabel ?? (labelKey ? t[labelKey] : '');
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className="relative flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all min-w-[52px]"
            style={{ color: active ? 'var(--primary)' : 'var(--text-muted)' }}
          >
            {active && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                style={{ background: 'var(--primary)' }}
              />
            )}
            <Icon size={20} aria-hidden="true" />
            <span
              className="text-[10px] font-medium leading-none"
              style={{ color: active ? 'var(--primary)' : 'var(--text-muted)' }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
