'use client';

import { useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';
import arLocale from '@fullcalendar/core/locales/ar';
import type { DateClickArg, EventResizeDoneArg } from '@fullcalendar/interaction';
import type { EventClickArg, EventDropArg, EventInput, DatesSetArg, EventContentArg } from '@fullcalendar/core';
import { createClient } from '@/lib/supabase/client';
import { updateCalendarEvent } from '@/lib/calendar';
import { useLocale } from '@/lib/i18n';
import type { CalendarEvent } from '@/lib/types';
import type { GoogleCalendarEvent } from '@/lib/google-calendar';
import EventModal from './EventModal';

type ModalState =
  | { mode: 'create'; start: string; end: string }
  | { mode: 'edit'; event: CalendarEvent }
  | null;

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Custom event pill rendered inside FullCalendar
function EventPill({ info }: { info: EventContentArg }) {
  const { event, timeText } = info;
  const isAllDay = event.allDay;
  return (
    <div
      className="fc-custom-pill"
      style={{
        background: event.backgroundColor,
        borderLeft: `3px solid ${event.borderColor ?? event.backgroundColor}`,
        borderRadius: '7px',
        padding: isAllDay ? '2px 6px' : '3px 7px',
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '1px',
        cursor: 'pointer',
        minHeight: 0,
      }}
    >
      {!isAllDay && timeText && (
        <span style={{ fontSize: '0.62rem', opacity: 0.8, fontWeight: 500, color: '#fff', lineHeight: 1 }}>
          {timeText}
        </span>
      )}
      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#fff', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {event.title}
      </span>
    </div>
  );
}

export default function CalendarView({ userId }: { userId: string }) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const calendarRef = useRef<FullCalendar>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [viewTitle, setViewTitle] = useState('');
  const [viewType, setViewType] = useState('timeGridWeek');

  const fcLocale = locale === 'fr' ? frLocale : locale === 'ar' ? arLocale : undefined;

  const fetchEvents = useCallback(async (
    info: { startStr: string; endStr: string },
    successCallback: (events: EventInput[]) => void,
    failureCallback: (error: Error) => void
  ) => {
    try {
      const supabase = createClient();
      const rangeStart = info.startStr.slice(0, 10);
      const rangeEnd   = info.endStr.slice(0, 10);

      const [habitsRes, logsRes, eventsRes, googleRes] = await Promise.all([
        supabase.from('habits').select('id, name, icon, color, frequency, target_days').eq('user_id', userId),
        supabase.from('habit_logs').select('habit_id, completed_at').eq('user_id', userId).gte('completed_at', rangeStart).lte('completed_at', rangeEnd),
        supabase.from('calendar_events').select('*').eq('user_id', userId).gte('start_at', info.startStr).lte('start_at', info.endStr),
        fetch(`/api/google-calendar/events?timeMin=${encodeURIComponent(info.startStr)}&timeMax=${encodeURIComponent(info.endStr)}`).then(r => r.json()).catch(() => ({ events: [] })),
      ]);

      const habitMap = new Map(
        (habitsRes.data ?? []).map(h => [h.id, h as { id: string; name: string; icon: string; color: string; frequency: string; target_days: number[] }])
      );

      // Build a set of completed dates per habit for quick lookup
      const logMap = new Map<string, Set<string>>();
      for (const log of logsRes.data ?? []) {
        if (!logMap.has(log.habit_id)) logMap.set(log.habit_id, new Set());
        logMap.get(log.habit_id)!.add(log.completed_at);
      }

      const habitEvents: EventInput[] = (logsRes.data ?? []).map(log => {
        const h = habitMap.get(log.habit_id);
        return {
          id: `habit-${log.habit_id}-${log.completed_at}`,
          title: `${h?.icon ?? '✅'} ${h?.name ?? 'Habit'}`,
          date: log.completed_at,
          allDay: true,
          backgroundColor: (h?.color ?? '#6C63FF') + 'CC',
          borderColor: h?.color ?? '#6C63FF',
          textColor: '#ffffff',
          extendedProps: { eventType: 'habit', habitId: log.habit_id },
          editable: false,
        };
      });

      // Ghost events: scheduled but not yet done (today + future only)
      const todayStr = new Date().toISOString().slice(0, 10);
      const ghostEvents: EventInput[] = [];
      for (const [habitId, habit] of habitMap) {
        const cursor = new Date(rangeStart + 'T00:00:00');
        const endDate = new Date(rangeEnd + 'T00:00:00');
        while (cursor <= endDate) {
          const ds = cursor.toISOString().slice(0, 10);
          if (ds >= todayStr) {
            const dow = cursor.getDay() === 0 ? 7 : cursor.getDay();
            const scheduled =
              habit.frequency === 'daily' || !habit.target_days?.length ||
              habit.target_days.includes(dow);
            const done = logMap.get(habitId)?.has(ds);
            if (scheduled && !done) {
              ghostEvents.push({
                id: `sched-${habitId}-${ds}`,
                title: `${habit.icon} ${habit.name}`,
                date: ds,
                allDay: true,
                backgroundColor: (habit.color ?? '#6C63FF') + '33',
                borderColor: habit.color ?? '#6C63FF',
                textColor: '#ffffff',
                extendedProps: { eventType: 'habit_scheduled', habitId },
                editable: false,
                classNames: ['fc-habit-ghost'],
              });
            }
          }
          cursor.setDate(cursor.getDate() + 1);
        }
      }

      const calEvents: EventInput[] = (eventsRes.data ?? []).map(ev => ({
        id: `cal-${ev.id}`,
        title: ev.title,
        start: ev.start_at,
        end: ev.end_at,
        backgroundColor: ev.color,
        borderColor: ev.color,
        textColor: '#ffffff',
        extendedProps: { eventType: 'calendar_event', rawEvent: ev },
        editable: true,
      }));

      const googleEvents: EventInput[] = ((googleRes.events ?? []) as GoogleCalendarEvent[]).map(ev => ({
        id: `gcal-${ev.id}`,
        title: ev.summary ?? '(No title)',
        start: ev.start.dateTime ?? ev.start.date,
        end: ev.end.dateTime ?? ev.end.date,
        allDay: !ev.start.dateTime,
        backgroundColor: '#4285F4',
        borderColor: '#3367D6',
        textColor: '#ffffff',
        editable: false,
        extendedProps: { eventType: 'google_event' },
      }));

      successCallback([...habitEvents, ...ghostEvents, ...calEvents, ...googleEvents]);
    } catch (err) {
      failureCallback(err instanceof Error ? err : new Error('Failed to load events'));
    }
  }, [userId]);

  function handleDatesSet(arg: DatesSetArg) {
    setViewTitle(arg.view.title);
    setViewType(arg.view.type);
  }

  function handleDateClick(arg: DateClickArg) {
    const s = arg.dateStr.includes('T')
      ? arg.dateStr.slice(0, 16)
      : `${arg.dateStr}T09:00`;
    const end = new Date(s);
    end.setHours(end.getHours() + 1);
    setModal({ mode: 'create', start: s, end: toLocalInput(end.toISOString()) });
  }

  function handleEventClick(arg: EventClickArg) {
    const { eventType, habitId, rawEvent } = arg.event.extendedProps;
    if (eventType === 'habit' || eventType === 'habit_scheduled') {
      router.push(`/habits/${habitId}`);
    } else if (eventType === 'calendar_event' && rawEvent) {
      setModal({ mode: 'edit', event: rawEvent as CalendarEvent });
    }
  }

  async function handleEventDrop(arg: EventDropArg) {
    const { eventType, rawEvent } = arg.event.extendedProps;
    if (eventType !== 'calendar_event' || !rawEvent) { arg.revert(); return; }
    try {
      await updateCalendarEvent((rawEvent as CalendarEvent).id, {
        start_at: arg.event.startStr,
        end_at: arg.event.endStr || arg.event.startStr,
      });
    } catch {
      arg.revert();
    }
  }

  async function handleEventResize(arg: EventResizeDoneArg) {
    const { eventType, rawEvent } = arg.event.extendedProps;
    if (eventType !== 'calendar_event' || !rawEvent) { arg.revert(); return; }
    try {
      await updateCalendarEvent((rawEvent as CalendarEvent).id, {
        start_at: arg.event.startStr,
        end_at: arg.event.endStr,
      });
    } catch {
      arg.revert();
    }
  }

  function refreshEvents() {
    calendarRef.current?.getApi().refetchEvents();
  }

  const api = () => calendarRef.current?.getApi();

  const VIEWS = [
    { key: 'dayGridMonth',  label: t.calendar_view_month },
    { key: 'timeGridWeek',  label: t.calendar_view_week },
    { key: 'timeGridDay',   label: t.calendar_view_day },
  ];

  return (
    <>
      {/* ─── Custom Toolbar ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">

        {/* Left: prev / next / today */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-0.5 p-0.5 rounded-xl"
            style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}
          >
            <button
              onClick={() => api()?.prev()}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-all"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
            >
              ‹
            </button>
            <button
              onClick={() => api()?.next()}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-all"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
            >
              ›
            </button>
          </div>
          <button
            onClick={() => api()?.today()}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{ background: 'var(--primary-muted)', color: 'var(--primary)', border: '1px solid var(--primary-muted)' }}
          >
            {t.today}
          </button>
        </div>

        {/* Center: current date range */}
        <span
          className="font-semibold text-sm"
          style={{ color: 'var(--text-primary)' }}
        >
          {viewTitle}
        </span>

        {/* Right: view switcher */}
        <div
          className="flex items-center gap-0.5 p-0.5 rounded-xl"
          style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}
        >
          {VIEWS.map(({ key, label }) => {
            const active = viewType === key;
            return (
              <button
                key={key}
                onClick={() => api()?.changeView(key)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: active ? 'var(--primary)' : 'transparent',
                  color: active ? '#fff' : 'var(--text-secondary)',
                  boxShadow: active ? 'var(--shadow-glow)' : 'none',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Calendar ───────────────────────────────────────────────────── */}
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        locale={fcLocale}
        headerToolbar={false}
        initialView="timeGridWeek"
        firstDay={1}
        datesSet={handleDatesSet}
        events={fetchEvents}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
        eventContent={(info) => <EventPill info={info} />}
        editable={true}
        selectable={true}
        dayMaxEvents={3}
        nowIndicator={true}
        height="auto"
        eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        slotMinTime="06:00:00"
        slotDuration="00:30:00"
      />

      {modal && (
        <EventModal
          visible={true}
          mode={modal.mode}
          userId={userId}
          initialStart={modal.mode === 'create' ? modal.start : undefined}
          initialEnd={modal.mode === 'create' ? modal.end : undefined}
          event={modal.mode === 'edit' ? modal.event : undefined}
          onClose={() => setModal(null)}
          onSaved={refreshEvents}
        />
      )}
    </>
  );
}
