'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTheme, COLOR_THEMES, type ColorTheme } from '@/lib/theme';
import { useLocale, LOCALE_LABELS, type Locale } from '@/lib/i18n';
import { CalendarDays, HeartPulse, Activity, Watch, LogOut, Bell, BellOff, Moon, Sun, Smartphone } from 'lucide-react';
import { getHealthConnectAuthUrl } from '@/lib/integrations/health-connect';
import type { User } from '@supabase/supabase-js';
import GlassCard from '@/components/ui/GlassCard';
import { requestPermission } from '@/lib/push';


function AppleHealthSection() {
  const [token, setToken]       = useState<string | null>(null);
  const [lastUsed, setLastUsed] = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);
  const [copied, setCopied]     = useState<'token' | 'url' | null>(null);
  const [regen, setRegen]       = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  const fetchToken = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/health/token', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json() as { token: string; last_used: string | null };
        setToken(data.token);
        setLastUsed(data.last_used);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchToken(); }, [fetchToken]);

  async function handleRegenerate() {
    setRegen(true);
    try {
      const res = await fetch('/api/health/token', { method: 'POST' });
      if (res.ok) {
        const data = await res.json() as { token: string; last_used: string | null };
        setToken(data.token);
        setLastUsed(data.last_used);
      }
    } finally {
      setRegen(false);
    }
  }

  function copy(text: string, which: 'token' | 'url') {
    navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window !== 'undefined' ? window.location.origin : null);
  const ingestUrl = appUrl ? `${appUrl}/api/health/ingest` : null;

  const STEPS = [
    { n: 1, text: 'Open the Shortcuts app on your iPhone.' },
    { n: 2, text: 'Tap the + button to create a new Shortcut.' },
    { n: 3, text: 'Search for "Health" and add a "Find Health Samples" action. Choose the metric (e.g. Steps). Set "Sort by" = Date, "Limit" = 1, order = Latest.' },
    { n: 4, text: 'Repeat step 3 for each metric you want to sync: Steps, Sleep Analysis, Heart Rate, HRV (Heart Rate Variability), Active Energy.' },
    { n: 5, text: 'Add a "Get Contents of URL" action. Set the URL to the Ingest URL below. Set Method = POST, Request Body = JSON.' },
    { n: 6, text: 'Add these JSON keys to the body: token (paste your Sync Token), date (use "Shortcut Input" or a "Format Date" action for today → YYYY-MM-DD), steps, sleep_hours, heart_rate_avg, hrv, active_calories.' },
    { n: 7, text: 'Go to Automation → Create Personal Automation → Time of Day → set to e.g. 10 PM daily. Add "Run Shortcut" and select the one you just made. Disable "Ask Before Running".' },
  ];

  return (
    <GlassCard className="mb-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-wide font-semibold" style={{ color: 'var(--text-muted)' }}>Apple Health Sync</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>iPhone Shortcuts → automatic daily sync</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: lastUsed ? 'var(--success)' : 'var(--border)' }} />
          <span className="text-xs" style={{ color: lastUsed ? 'var(--success)' : 'var(--text-muted)' }}>
            {lastUsed ? `Last sync ${new Date(lastUsed).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : 'Not yet synced'}
          </span>
        </div>
      </div>

      {/* Sync Token */}
      <div className="mb-3">
        <p className="text-[10px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Sync Token</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2 rounded-xl font-mono text-xs overflow-hidden text-ellipsis whitespace-nowrap" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            {loading ? '…' : token}
          </div>
          <button
            onClick={() => token && copy(token, 'token')}
            disabled={!token}
            className="px-3 py-2 rounded-xl text-xs font-semibold flex-shrink-0 transition-all"
            style={{ background: copied === 'token' ? 'var(--success)20' : 'var(--primary-muted)', color: copied === 'token' ? 'var(--success)' : 'var(--primary)', border: `1px solid ${copied === 'token' ? 'var(--success)' : 'var(--primary-muted)'}` }}
          >
            {copied === 'token' ? '✓ Copied' : 'Copy'}
          </button>
          <button
            onClick={handleRegenerate}
            disabled={regen}
            className="px-3 py-2 rounded-xl text-xs font-semibold flex-shrink-0 transition-all"
            style={{ background: 'var(--surface-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          >
            {regen ? '…' : '↻'}
          </button>
        </div>
        <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-disabled)' }}>Keep this private — anyone with it can write to your health data.</p>
      </div>

      {/* Ingest URL */}
      <div className="mb-4">
        <p className="text-[10px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Ingest URL</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2 rounded-xl font-mono text-xs overflow-hidden text-ellipsis whitespace-nowrap" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: ingestUrl ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
            {ingestUrl ?? 'Set NEXT_PUBLIC_APP_URL in your .env'}
          </div>
          <button
            onClick={() => ingestUrl && copy(ingestUrl, 'url')}
            disabled={!ingestUrl}
            className="px-3 py-2 rounded-xl text-xs font-semibold flex-shrink-0 transition-all disabled:opacity-40"
            style={{ background: copied === 'url' ? 'var(--success)20' : 'var(--primary-muted)', color: copied === 'url' ? 'var(--success)' : 'var(--primary)', border: `1px solid ${copied === 'url' ? 'var(--success)' : 'var(--primary-muted)'}` }}
          >
            {copied === 'url' ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Synced metrics chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {['Steps', 'Sleep', 'Heart Rate', 'HRV', 'Active Calories', 'Weight'].map(m => (
          <span key={m} className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: 'var(--body)15', color: 'var(--body)', border: '1px solid var(--body)30' }}>{m}</span>
        ))}
      </div>

      {/* Setup instructions toggle */}
      <button
        onClick={() => setShowSteps(s => !s)}
        className="w-full text-left text-xs font-semibold py-2.5 px-3 rounded-xl transition-all flex items-center justify-between"
        style={{ background: 'var(--surface-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
      >
        <span className="flex items-center gap-1.5"><Smartphone size={14} /> Step-by-step Shortcut setup</span>
        <span style={{ color: 'var(--text-muted)' }}>{showSteps ? '▲' : '▼'}</span>
      </button>

      {showSteps && (
        <div className="mt-3 flex flex-col gap-2">
          {STEPS.map(({ n, text }) => (
            <div key={n} className="flex gap-3 items-start">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5" style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}>{n}</div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{text}</p>
            </div>
          ))}
          <div className="mt-2 p-3 rounded-xl text-xs leading-relaxed" style={{ background: 'var(--mind)10', border: '1px solid var(--mind)30', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--mind)' }}>JSON body example:</strong>
            <pre className="mt-1 text-[10px] whitespace-pre-wrap break-all" style={{ color: 'var(--text-muted)' }}>{`{
  "token": "<your sync token>",
  "date": "2026-05-14",
  "steps": 8500,
  "sleep_hours": 7.5,
  "heart_rate_avg": 68,
  "hrv": 45,
  "active_calories": 420,
  "weight_kg": 80.5
}`}</pre>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

function NotificationsSection() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [anchorTime, setAnchorTime] = useState('08:00');
  const [supported, setSupported] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setSupported(true);
      setPermission(Notification.permission);
      setAnchorTime(localStorage.getItem('anchor_time') ?? '08:00');
    }
  }, []);

  if (!supported) return null;

  async function handleToggle() {
    const result = await requestPermission();
    setPermission(result);
    if (result === 'granted') {
      localStorage.setItem('notifications_enabled', 'true');
      setIosHint(false);
    } else if (result === 'default') {
      // iOS ≥ 16.4 not on home screen: permission stays 'default' after request
      setIosHint(true);
    }
  }

  function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    setAnchorTime(e.target.value);
    localStorage.setItem('anchor_time', e.target.value);
  }

  return (
    <GlassCard className="mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Bell size={14} style={{ color: 'var(--text-muted)' }} />
        <p className="text-xs uppercase tracking-wide font-semibold" style={{ color: 'var(--text-muted)' }}>
          Notifications
        </p>
      </div>

      {permission === 'denied' ? (
        <div className="flex items-start gap-2">
          <BellOff size={15} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 2 }} />
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Notifications blocked. Enable in your browser Settings under Site Permissions.
          </p>
        </div>
      ) : permission === 'granted' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Daily check-in reminder</span>
            <span
              className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
              style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}
            >
              ON
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Remind me at</span>
            <input
              type="time"
              value={anchorTime}
              onChange={handleTimeChange}
              className="rounded-lg px-2.5 py-1.5 text-xs font-mono"
              style={{
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            onClick={handleToggle}
            className="text-sm px-4 py-2 rounded-xl font-medium transition-all w-full text-center"
            style={{ background: 'var(--primary-muted)', color: 'var(--primary)', border: '1px solid var(--primary-muted)' }}
          >
            Enable notifications
          </button>
          {iosHint && (
            <p className="text-xs leading-relaxed mt-1" style={{ color: 'var(--text-muted)' }}>
              Add LifeOS to your Home Screen first (Safari → Share → Add to Home Screen), then try again.
            </p>
          )}
        </div>
      )}
    </GlassCard>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { theme, toggleTheme, colorTheme, setColorTheme } = useTheme();
  const { t, locale, setLocale } = useLocale();
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
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>{t.settings_title}</h1>

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
            {t.settings_member_since} {user ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '…'}
          </p>
        </div>
      </GlassCard>

      {/* Appearance */}
      <GlassCard className="mb-4">
        <p className="text-xs uppercase tracking-wide font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
          {t.settings_appearance}
        </p>

        {/* Dark / Light toggle */}
        <button
          onClick={toggleTheme}
          role="switch"
          aria-checked={theme === 'dark'}
          className="flex items-center justify-between w-full py-2 text-sm"
          style={{ color: 'var(--text-primary)' }}
        >
          <div className="flex items-center gap-3">
            {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
            <span>{theme === 'dark' ? t.settings_dark_mode : t.settings_light_mode}</span>
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

        {/* Color Theme picker */}
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs uppercase tracking-wide font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
            Color Theme
          </p>
          <div className="flex flex-col gap-2">
            {(Object.entries(COLOR_THEMES) as [ColorTheme, typeof COLOR_THEMES[ColorTheme]][]).map(([id, meta]) => {
              const active = colorTheme === id;
              return (
                <button
                  key={id}
                  onClick={() => setColorTheme(id)}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all text-left w-full"
                  style={{
                    background: active ? `${meta.primary}18` : 'var(--surface-elevated)',
                    border: `1px solid ${active ? meta.primary : 'var(--border)'}`,
                  }}
                >
                  {/* Palette swatches */}
                  <div className="flex gap-1 flex-shrink-0">
                    <div className="w-5 h-5 rounded-full" style={{ background: meta.bg, border: '1px solid rgba(255,255,255,0.12)' }} />
                    <div className="w-5 h-5 rounded-full" style={{ background: meta.primary }} />
                    <div className="w-5 h-5 rounded-full" style={{ background: meta.secondary }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-none" style={{ color: active ? meta.primary : 'var(--text-primary)' }}>
                      {meta.name}
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                      {meta.description}
                    </p>
                  </div>
                  {active && (
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: meta.primary }}
                    >
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </GlassCard>

      {/* Notifications */}
      <NotificationsSection />

      {/* Language */}
      <GlassCard className="mb-4">
        <p className="text-xs uppercase tracking-wide font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
          {t.settings_language}
        </p>
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(LOCALE_LABELS) as Locale[]).map(l => (
            <button
              key={l}
              onClick={() => setLocale(l)}
              className="flex-1 min-w-[100px] py-2.5 px-3 rounded-xl text-sm font-medium transition-all"
              style={{
                background: locale === l ? 'var(--primary-muted)' : 'var(--surface-elevated)',
                border: `1px solid ${locale === l ? 'var(--primary)' : 'var(--border)'}`,
                color: locale === l ? 'var(--primary)' : 'var(--text-secondary)',
              }}
            >
              {LOCALE_LABELS[l]}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Integrations */}
      <GlassCard className="mb-4">
        <p className="text-xs uppercase tracking-wide font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
          {t.settings_integrations}
        </p>
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <CalendarDays size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t.settings_gcal}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.settings_gcal_desc}</p>
            </div>
          </div>
          <a
            href="/api/auth/google"
            className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
            style={{ background: 'var(--primary-muted)', color: 'var(--primary)', border: '1px solid var(--primary-muted)' }}
          >
            {t.calendar_connect_google}
          </a>
        </div>
      </GlassCard>

      {/* Apple Health Sync */}
      <AppleHealthSection />

      {/* Connected Devices */}
      <GlassCard className="mb-4">
        <p className="text-xs uppercase tracking-wide font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
          Connected Devices
        </p>

        {/* Google Health Connect */}
        <div className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--body)20', border: '1px solid var(--body)30', color: 'var(--body)' }}>
              <Activity size={18} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Google Health Connect</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Steps, sleep, heart rate (Android)</p>
            </div>
          </div>
          <a
            href={getHealthConnectAuthUrl()}
            className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex-shrink-0"
            style={{ background: 'var(--body)20', color: 'var(--body)', border: '1px solid var(--body)40' }}
          >
            Connect
          </a>
        </div>

        {/* Apple Health */}
        <div className="flex items-center justify-between py-2.5" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--mind)20', border: '1px solid var(--mind)30', color: 'var(--mind)' }}>
              <HeartPulse size={18} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Apple Health</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Via iPhone Shortcuts — see setup above</p>
            </div>
          </div>
          <span className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{ background: 'var(--success)20', color: 'var(--success)', border: '1px solid var(--success)40' }}>
            ✓ Active
          </span>
        </div>

        {/* Wearables row */}
        <div className="flex items-center justify-between py-2.5" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--soul)20', border: '1px solid var(--soul)30', color: 'var(--soul)' }}>
              <Watch size={18} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Garmin / Fitbit / Oura / Whoop</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Via Health Connect aggregator</p>
            </div>
          </div>
          <span className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{ background: 'var(--surface-elevated)', color: 'var(--text-disabled)', border: '1px solid var(--border)' }}>
            Coming soon
          </span>
        </div>
      </GlassCard>

      {/* Account */}
      <GlassCard>
        <p className="text-xs uppercase tracking-wide font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
          {t.settings_account}
        </p>
        <button
          onClick={handleSignOut}
          className="settings-signout-btn flex items-center gap-3 py-2 text-sm font-medium w-full text-left transition-all rounded-lg px-2 -mx-2"
          style={{ color: 'var(--error)' }}
        >
          <LogOut size={17} />
          {t.settings_sign_out}
        </button>
      </GlassCard>
    </div>
  );
}
