'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', icon: '🏠 ', label: 'Home' },
  { href: '/calendar',  icon: '📅', label: 'Calendar' },
  { href: '/habits',    icon: '✅', label: 'Habits' },
  { href: '/analytics', icon: '📊', label: 'Stats' },
  { href: '/settings',  icon: '👤', label: 'Profile' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 safe-area-inset-bottom"
      style={{
        height: 'var(--bottomnav-height)',
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.3)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {NAV_ITEMS.map(({ href, icon, label }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all min-w-[52px]"
            style={{ color: active ? 'var(--primary)' : 'var(--text-muted)' }}
          >
            <span className="text-xl leading-none">{icon}</span>
            <span
              className="text-[10px] font-medium leading-none"
              style={{ color: active ? 'var(--primary)' : 'var(--text-muted)' }}
            >
              {label}
            </span>
            {active && (
              <span
                className="absolute top-0 w-8 h-0.5 rounded-full"
                style={{ background: 'var(--primary)' }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
