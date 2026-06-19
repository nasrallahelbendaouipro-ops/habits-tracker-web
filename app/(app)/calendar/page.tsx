'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n';
import ShiftParserModal from '@/components/ui/ShiftParserModal';
import RoutinePlanningPanel from '@/components/calendar/RoutinePlanningPanel';

const CalendarView = dynamic(
  () => import('@/components/calendar/CalendarView'),
  { ssr: false }
);

export default function CalendarPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);
  const [googleBanner, setGoogleBanner] = useState<'success' | 'error' | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 1); // Monday
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const { t, locale } = useLocale();
  const calendarKey = useRef(0);
  const [, forceRefresh] = useState(0);

  useEffect(() => {
    // Handle redirect params from OAuth callback
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_connected') === '1') {
      setGoogleBanner('success');
      window.history.replaceState({}, '', '/calendar');
    } else if (params.get('google_error')) {
      setGoogleBanner('error');
      window.history.replaceState({}, '', '/calendar');
    }

    createClient().auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        checkGoogleConnection();
      }
      setLoading(false);
    });
  }, []);

  function checkGoogleConnection() {
    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + 86_400_000).toISOString();
    fetch(`/api/google-calendar/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`)
      .then(r => r.json())
      .then(data => setGoogleConnected(data.connected ?? false))
      .catch(() => setGoogleConnected(false));
  }

  function handleShiftsSaved() {
    calendarKey.current += 1;
    forceRefresh(k => k + 1);
  }

  return (
    <div className="animate-fade-in">
      {/* Banner */}
      {googleBanner === 'success' && (
        <div
          className="rounded-xl px-4 py-3 text-sm mb-4 flex items-center justify-between"
          style={{ background: 'rgba(78,205,196,0.12)', border: '1px solid rgba(78,205,196,0.3)', color: 'var(--success)' }}
        >
          <span>✅ Google Calendar connected — your events will now appear here.</span>
          <button onClick={() => setGoogleBanner(null)} style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>
      )}
      {googleBanner === 'error' && (
        <div
          className="rounded-xl px-4 py-3 text-sm mb-4 flex items-center justify-between"
          style={{ background: 'rgba(255,107,107,0.12)', border: '1px solid rgba(255,107,107,0.3)', color: 'var(--error)' }}
        >
          <span>❌ Google Calendar connection failed. Please try again.</span>
          <button onClick={() => setGoogleBanner(null)} style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{t.calendar_title}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {t.calendar_subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Google Calendar connect / status */}
          {googleConnected === false && (
            <a
              href="/api/auth/google"
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {t.calendar_connect_google}
            </a>
          )}
          {googleConnected === true && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
              style={{ background: 'rgba(66,133,244,0.12)', border: '1px solid rgba(66,133,244,0.25)', color: '#4285F4' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              Google Calendar
            </div>
          )}

          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-white transition-all"
            style={{ background: 'var(--secondary)', boxShadow: '0 0 20px rgba(255,107,53,0.25)' }}
          >
            🕐 {t.calendar_import}
          </button>
        </div>
      </div>

      {loading || !userId ? (
        <div className="h-96 rounded-2xl animate-pulse" style={{ background: 'var(--surface)' }} />
      ) : (
        <>
          <RoutinePlanningPanel userId={userId} weekStart={weekStart} />
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '20px 20px 0' }}
          >
            <CalendarView key={`${calendarKey.current}-${locale}`} userId={userId} onWeekChange={setWeekStart} />
          </div>
        </>
      )}

      {userId && (
        <ShiftParserModal
          visible={showImport}
          userId={userId}
          onClose={() => setShowImport(false)}
          onSaved={handleShiftsSaved}
        />
      )}
    </div>
  );
}
