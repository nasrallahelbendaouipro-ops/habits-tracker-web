'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from '@/lib/theme';
import { useLocale } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();
  const { t } = useLocale();

  const NAV_ITEMS = [
    { href: '/dashboard', icon: '🏠', label: t.nav_dashboard },
    { href: '/checkin',   icon: '✍️', label: 'Check-In' },
    { href: '/habits',    icon: '✅', label: t.nav_habits },
    { href: '/goals',     icon: '🎯', label: t.nav_goals },
    { href: '/body',      icon: '💪', label: 'Body Metrics' },
    { href: '/mind',      icon: '🧠', label: 'Digital Mind' },
    { href: '/analytics', icon: '📊', label: t.nav_analytics },
    { href: '/planner',   icon: '🤖', label: t.nav_planner },
    { href: '/calendar',  icon: '📅', label: t.nav_calendar },
    { href: '/settings',  icon: '⚙️', label: t.nav_settings },
  ];

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <aside
      className="hidden md:flex flex-col h-full relative z-[60]"
      style={{
        width: 'var(--sidebar-width)',
        background: 'var(--surface)',
        borderInlineEnd: '1px solid var(--border)',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
          style={{ background: 'var(--primary)', boxShadow: 'var(--shadow-glow)' }}
        >
          ✦
        </div>
        <div>
          <p className="font-bold text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>LifeOS</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Life Operating System</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {NAV_ITEMS.map(({ href, icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all')}
              style={{
                background: active ? 'var(--primary-muted)' : 'transparent',
                color: active ? 'var(--primary)' : 'var(--text-secondary)',
                borderInlineStart: active ? '2px solid var(--primary)' : '2px solid transparent',
              }}
              onMouseEnter={e => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)';
              }}
              onMouseLeave={e => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 flex flex-col gap-1" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all w-full text-left"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
        >
          <span>{isDark ? '☀️' : '🌙'}</span>
          {isDark ? t.nav_light_mode : t.nav_dark_mode}
        </button>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all w-full text-left"
          style={{ color: 'var(--error)' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,107,107,0.08)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
        >
          <span>🚪</span>
          {t.nav_sign_out}
        </button>
      </div>
    </aside>
  );
}
