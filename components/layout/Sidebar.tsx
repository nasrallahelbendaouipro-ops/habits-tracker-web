'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, PenLine, CheckSquare, Target, Activity,
  Brain, Sparkles, BarChart2, Bot, CalendarDays, Settings,
  Sun, Moon, LogOut,
} from 'lucide-react';
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
    { href: '/dashboard', Icon: LayoutDashboard, label: t.nav_dashboard },
    { href: '/checkin',   Icon: PenLine,          label: 'Check-In' },
    { href: '/habits',    Icon: CheckSquare,       label: t.nav_habits },
    { href: '/goals',     Icon: Target,            label: t.nav_goals },
    { href: '/body',      Icon: Activity,          label: 'Body Metrics' },
    { href: '/mind',      Icon: Brain,             label: 'Digital Mind' },
    { href: '/soul',      Icon: Sparkles,          label: 'Soul Growth' },
    { href: '/analytics', Icon: BarChart2,         label: t.nav_analytics },
    { href: '/planner',   Icon: Bot,               label: t.nav_planner },
    { href: '/calendar',  Icon: CalendarDays,      label: t.nav_calendar },
    { href: '/settings',  Icon: Settings,          label: t.nav_settings },
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
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto scroll-hidden">
        {NAV_ITEMS.map(({ href, Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn('sidebar-nav-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all')}
              style={{
                background: active ? 'var(--primary-muted)' : 'transparent',
                color: active ? 'var(--primary)' : 'var(--text-secondary)',
                borderInlineStart: active ? '2px solid var(--primary)' : '2px solid transparent',
              }}
            >
              <Icon size={17} aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 flex flex-col gap-1" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
        <button
          onClick={toggleTheme}
          className="sidebar-footer-btn flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all w-full text-left"
          style={{ color: 'var(--text-secondary)' }}
        >
          {isDark ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
          {isDark ? t.nav_light_mode : t.nav_dark_mode}
        </button>

        <button
          onClick={handleSignOut}
          className="sidebar-signout-btn flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all w-full text-left"
          style={{ color: 'var(--error)' }}
        >
          <LogOut size={17} aria-hidden="true" />
          {t.nav_sign_out}
        </button>
      </div>
    </aside>
  );
}
