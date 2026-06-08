'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PenLine, CalendarDays, MoreHorizontal } from 'lucide-react';
import { useLocale } from '@/lib/i18n';
import MoreSheet from './MoreSheet';

const MORE_PATHS = [
  '/habits', '/routines', '/goals', '/body',
  '/mind', '/soul', '/analytics', '/planner', '/settings',
];

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useLocale();
  const [moreOpen, setMoreOpen] = useState(false);

  const moreActive = MORE_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));

  return (
    <>
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
        {/* Dashboard */}
        <NavLink href="/dashboard" active={pathname === '/dashboard' || pathname.startsWith('/dashboard/')}>
          <Home size={20} aria-hidden="true" />
          <span className="text-[10px] font-medium leading-none">{t.nav_home}</span>
        </NavLink>

        {/* Check-In */}
        <NavLink href="/checkin" active={pathname === '/checkin' || pathname.startsWith('/checkin/')}>
          <PenLine size={20} aria-hidden="true" />
          <span className="text-[10px] font-medium leading-none">{t.nav_checkin}</span>
        </NavLink>

        {/* Calendar */}
        <NavLink href="/calendar" active={pathname === '/calendar' || pathname.startsWith('/calendar/')}>
          <CalendarDays size={20} aria-hidden="true" />
          <span className="text-[10px] font-medium leading-none">{t.nav_calendar}</span>
        </NavLink>

        {/* More */}
        <button
          onClick={() => setMoreOpen(o => !o)}
          aria-expanded={moreOpen}
          aria-label={t.nav_more}
          className="relative flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all min-w-[52px]"
          style={{ color: moreActive || moreOpen ? 'var(--primary)' : 'var(--text-muted)' }}
        >
          {(moreActive || moreOpen) && (
            <span
              className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
              style={{ background: 'var(--primary)' }}
            />
          )}
          <MoreHorizontal size={20} aria-hidden="true" />
          <span
            className="text-[10px] font-medium leading-none"
            style={{ color: moreActive || moreOpen ? 'var(--primary)' : 'var(--text-muted)' }}
          >
            {t.nav_more}
          </span>
        </button>
      </nav>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}

function NavLink({
  href, active, children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
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
      {children}
    </Link>
  );
}
