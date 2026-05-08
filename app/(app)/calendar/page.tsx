'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import ShiftParserModal from '@/components/ui/ShiftParserModal';

const CalendarView = dynamic(
  () => import('@/components/calendar/CalendarView'),
  { ssr: false }
);

export default function CalendarPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const calendarKey = useRef(0);
  const [, forceRefresh] = useState(0);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
      setLoading(false);
    });
  }, []);

  function handleShiftsSaved() {
    calendarKey.current += 1;
    forceRefresh(k => k + 1);
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Calendar</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Click a day to add an event · Drag to reschedule
          </p>
        </div>
        <button
          onClick={() => setShowImport(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-white transition-all"
          style={{ background: 'var(--secondary)', boxShadow: '0 0 20px rgba(255,107,53,0.25)' }}
        >
          🕐 Import Shifts
        </button>
      </div>

      {loading || !userId ? (
        <div className="h-96 rounded-2xl animate-pulse" style={{ background: 'var(--surface)' }} />
      ) : (
        <div
          className="rounded-2xl p-4 md:p-6"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <CalendarView key={calendarKey.current} userId={userId} />
        </div>
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
