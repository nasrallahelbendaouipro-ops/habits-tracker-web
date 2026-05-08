'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/lib/theme';
import type { User } from '@supabase/supabase-js';
import GlassCard from '@/components/ui/GlassCard';

export default function SettingsPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  async function handleSignOut() {
    await createClient().auth.signOut();
    router.replace('/login');
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? '??';

  return (
    <div className="animate-fade-in max-w-lg">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Settings</h1>

      {/* Profile Card */}
      <GlassCard className="mb-4 flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg text-white flex-shrink-0"
          style={{ background: 'var(--primary)' }}
        >
          {initials}
        </div>
        <div>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{user?.email}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Member since {user ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '…'}
          </p>
        </div>
      </GlassCard>

      {/* Appearance */}
      <GlassCard className="mb-4">
        <p className="text-xs uppercase tracking-wide font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
          Appearance
        </p>
        <button
          onClick={toggleTheme}
          className="flex items-center justify-between w-full py-2 text-sm"
          style={{ color: 'var(--text-primary)' }}
        >
          <div className="flex items-center gap-3">
            <span>{theme === 'dark' ? '🌙' : '☀️'}</span>
            <span>{theme === 'dark' ? 'Dark mode' : 'Light mode'}</span>
          </div>
          <div
            className="w-10 h-5 rounded-full relative transition-all"
            style={{ background: theme === 'dark' ? 'var(--primary)' : 'var(--border)' }}
          >
            <div
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
              style={{ left: theme === 'dark' ? '22px' : '2px' }}
            />
          </div>
        </button>
      </GlassCard>

      {/* Integrations */}
      <GlassCard className="mb-4">
        <p className="text-xs uppercase tracking-wide font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
          Integrations
        </p>
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <span>📅</span>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Google Calendar</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sync meetings and events</p>
            </div>
          </div>
          <span className="text-xs px-2 py-1 rounded-lg font-medium" style={{ background: 'var(--surface-elevated)', color: 'var(--text-muted)' }}>
            Phase 6
          </span>
        </div>
      </GlassCard>

      {/* Account */}
      <GlassCard>
        <p className="text-xs uppercase tracking-wide font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
          Account
        </p>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 py-2 text-sm font-medium w-full text-left transition-all rounded-lg px-2 -mx-2"
          style={{ color: 'var(--error)' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,107,107,0.08)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
        >
          <span>🚪</span>
          Sign out
        </button>
      </GlassCard>
    </div>
  );
}
