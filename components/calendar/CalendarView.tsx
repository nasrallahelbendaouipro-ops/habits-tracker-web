'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';
import arLocale from '@fullcalendar/core/locales/ar';
import type { DateClickArg, EventResizeDoneArg } from '@fullcalendar/interaction';
import type { EventClickArg, EventDropArg, EventInput, DatesSetArg, EventContentArg } from '@fullcalendar/core';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { updateCalendarEvent } from '@/lib/calendar';
import { updateHabit } from '@/lib/habits';
import { getRoutines } from '@/lib/routines';
import { useLocale } from '@/lib/i18n';
import { toISODate } from '@/lib/utils';
import type { CalendarEvent, Habit, Routine } from '@/lib/types';
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
          {!!(event.extendedProps.linkedRoutineIds as string[] | undefined)?.length && (
            <span style={{ marginLeft: 3 }}>
              🏋️{(event.extendedProps.linkedRoutineIds as string[]).length > 1
                ? ` ×${(event.extendedProps.linkedRoutineIds as string[]).length}`
                : ''}
            </span>
          )}
        </span>
      )}
      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#fff', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {event.title}
      </span>
    </div>
  );
}

export default function CalendarView({ userId, onWeekChange }: { userId: string; onWeekChange?: (weekStart: Date) => void }) {
  const { locale, t } = useLocale();
  const router = useRouter();
  const calendarRef = useRef<FullCalendar>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [viewTitle, setViewTitle] = useState('');
  const [viewType, setViewType] = useState('timeGridWeek');
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [habits, setHabits]     = useState<Habit[]>([]);

  useEffect(() => {
    getRoutines().then(setRoutines).catch(() => {});
    createClient().auth.getUser().then(({ data }) => {
      if (!data.user) return;
      createClient()
        .from('habits')
        .select('id, name, icon, color, type, dimension, frequency, target_days, metadata, user_id, created_at, calendar_start_time, calendar_duration_min, calendar_overrides')
        .eq('user_id', data.user.id)
        .order('name')
        .then(({ data: rows }) => { if (rows) setHabits(rows as Habit[]); });
    });
  }, []);

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

      // Fetch habits (for recurrence look-up), in-range events, pre-range events
      // (pre-range needed so a recurring event created before this week still shows),
      // and Google Calendar events.
      const [habitsRes, eventsRes, pastEventsRes, googleRes] = await Promise.all([
        supabase.from('habits')
          .select('id, frequency, target_days')
          .eq('user_id', userId),
        supabase.from('calendar_events').select('*').eq('user_id', userId)
          .gte('start_at', info.startStr).lte('start_at', info.endStr),
        // events that started before the range but may recur into it
        supabase.from('calendar_events').select('*').eq('user_id', userId)
          .lt('start_at', info.startStr),
        fetch(`/api/google-calendar/events?timeMin=${encodeURIComponent(info.startStr)}&timeMax=${encodeURIComponent(info.endStr)}`)
          .then(r => r.json()).catch(() => ({ events: [] })),
      ]);

      const habitMap = new Map(
        (habitsRes.data ?? []).map(h => [
          h.id,
          h as { id: string; frequency: string; target_days: number[] },
        ])
      );

      // Pre-range events are only relevant if they have linked habits (recurrence)
      const pastRecurring = (pastEventsRes.data ?? []).filter(
        ev => (ev.linked_habit_ids as string[] | null)?.length
      );

      // All events to process: in-range (editable) + past recurring (read-only anchors)
      const allSourceEvents = [
        ...(eventsRes.data ?? []).map(ev => ({ ev, inRange: true })),
        ...pastRecurring.map(ev => ({ ev, inRange: false })),
      ];

      const calEvents: EventInput[] = [];

      for (const { ev, inRange } of allSourceEvents) {
        // Original event — only add if it falls in the view range
        if (inRange) {
          calEvents.push({
            id: `cal-${ev.id}`,
            title: ev.title,
            start: ev.start_at,
            end: ev.end_at,
            backgroundColor: ev.color,
            borderColor: ev.color,
            textColor: '#ffffff',
            extendedProps: {
              eventType: 'calendar_event',
              rawEvent: ev,
              linkedRoutineIds: (ev.linked_routine_ids ?? []) as string[],
            },
            editable: true,
          });
        }

        // ── Recurrence expansion ──────────────────────────────────────
        const linkedHabitIds = (ev.linked_habit_ids ?? []) as string[];
        if (!linkedHabitIds.length) continue;

        const linkedHabits = linkedHabitIds
          .map(id => habitMap.get(id))
          .filter((h): h is { id: string; frequency: string; target_days: number[] } => !!h);

        if (!linkedHabits.length) continue;

        const isDaily = linkedHabits.some(h => h.frequency === 'daily');
        const weeklyDays = new Set(
          linkedHabits
            .filter(h => h.frequency === 'weekly')
            .flatMap(h => h.target_days ?? [])
        );

        if (!isDaily && weeklyDays.size === 0) continue;

        const startMs = new Date(ev.start_at).getTime();
        const duration = new Date(ev.end_at).getTime() - startMs;
        const originalDateStr = ev.start_at.slice(0, 10);

        const cursor = new Date(rangeStart + 'T00:00:00');
        const rangeEndDate = new Date(rangeEnd + 'T00:00:00');

        while (cursor <= rangeEndDate) {
          const ds = cursor.toISOString().slice(0, 10);

          if (ds !== originalDateStr) {
            // target_days uses 1=Mon…7=Sun (same convention as ghost events)
            const dow = cursor.getDay() === 0 ? 7 : cursor.getDay();
            const shouldShow = isDaily || weeklyDays.has(dow);

            if (shouldShow) {
              const offsetMs =
                cursor.getTime() - new Date(originalDateStr + 'T00:00:00').getTime();
              const newStart = new Date(startMs + offsetMs);
              const newEnd   = new Date(newStart.getTime() + duration);

              calEvents.push({
                id: `cal-${ev.id}-recur-${ds}`,
                title: ev.title,
                start: newStart.toISOString(),
                end: newEnd.toISOString(),
                // slightly transparent to distinguish from the "anchor" event
                backgroundColor: ev.color + 'CC',
                borderColor: ev.color,
                textColor: '#ffffff',
                extendedProps: {
                  eventType: 'calendar_event',
                  rawEvent: ev,          // same raw event → edit modal opens original
                  linkedRoutineIds: (ev.linked_routine_ids ?? []) as string[],
                  isRecurrence: true,
                },
                editable: false,         // recurrences can't be dragged individually
              });
            }
          }
          cursor.setDate(cursor.getDate() + 1);
        }
      }

      // ── Habit calendar events ─────────────────────────────────────────────────
      const habitCalEvents: EventInput[] = [];
      const rangeStartDate = new Date(rangeStart + 'T00:00:00');
      const rangeEndDate   = new Date(rangeEnd   + 'T00:00:00');

      for (const habit of habits) {
        if (!habit.calendar_start_time || !habit.calendar_duration_min) continue;
        const overrides = habit.calendar_overrides ?? {};
        const cursor = new Date(rangeStartDate);
        while (cursor <= rangeEndDate) {
          const dow = cursor.getDay() === 0 ? 7 : cursor.getDay();
          const isScheduled = habit.frequency === 'daily' || (habit.target_days ?? []).includes(dow);
          if (isScheduled) {
            // Per-occurrence override takes priority over the global default
            const ov = overrides[toISODate(cursor)];
            const timeStr    = ov?.start    ?? habit.calendar_start_time;
            const durationMin = ov?.duration ?? habit.calendar_duration_min;
            const [hh, mm] = timeStr.split(':').map(Number);
            const start = new Date(cursor);
            start.setHours(hh, mm, 0, 0);
            const end = new Date(start.getTime() + durationMin * 60_000);
            const ds = toISODate(cursor);
            habitCalEvents.push({
              id: `habit-cal-${habit.id}-${ds}`,
              title: `${habit.icon} ${habit.name}`,
              start: start.toISOString(),
              end: end.toISOString(),
              backgroundColor: habit.color + 'CC',
              borderColor: habit.color,
              textColor: '#ffffff',
              editable: true,
              extendedProps: { eventType: 'habit_calendar', habitId: habit.id },
            });
          }
          cursor.setDate(cursor.getDate() + 1);
        }
      }

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

      successCallback([...calEvents, ...habitCalEvents, ...googleEvents]);
    } catch (err) {
      failureCallback(err instanceof Error ? err : new Error('Failed to load events'));
    }
  }, [userId, habits]);

  function handleDatesSet(arg: DatesSetArg) {
    setViewTitle(arg.view.title);
    setViewType(arg.view.type);
    onWeekChange?.(arg.start);
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
    const { eventType, rawEvent, habitId } = arg.event.extendedProps;
    if (eventType === 'habit_calendar') {
      router.push(`/habits/${habitId}`);
      return;
    }
    if (eventType === 'calendar_event' && rawEvent) {
      setModal({ mode: 'edit', event: rawEvent as CalendarEvent });
    }
  }

  async function handleEventDrop(arg: EventDropArg) {
    const { eventType, rawEvent, habitId } = arg.event.extendedProps;
    if (eventType === 'habit_calendar') {
      if (!arg.event.start || !arg.oldEvent.start) { arg.revert(); return; }

      // Block cross-day drags — exceptions only support time changes within the same day
      const oldDow = arg.oldEvent.start.getDay();
      const newDow = arg.event.start.getDay();
      if (oldDow !== newDow) { arg.revert(); return; }

      const hStr = String(arg.event.start.getHours()).padStart(2, '0');
      const mStr = String(arg.event.start.getMinutes()).padStart(2, '0');
      const newTimeStr  = `${hStr}:${mStr}`;
      const newDuration = arg.event.end
        ? Math.round((arg.event.end.getTime() - arg.event.start.getTime()) / 60_000)
        : undefined;

      const origDate = toISODate(arg.oldEvent.start);
      const habit  = habits.find(h => h.id === (habitId as string));
      const currentOverrides = habit?.calendar_overrides ?? {};
      const updatedOverrides = {
        ...currentOverrides,
        [origDate]: {
          start: newTimeStr,
          duration: newDuration ?? currentOverrides[origDate]?.duration ?? habit?.calendar_duration_min,
        },
      };

      setHabits(prev => prev.map(h =>
        h.id === (habitId as string) ? { ...h, calendar_overrides: updatedOverrides } : h
      ));

      try {
        await updateHabit(habitId as string, { calendar_overrides: updatedOverrides });
        refreshEvents();
      } catch { arg.revert(); }
      return;
    }
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
    const { eventType, rawEvent, habitId } = arg.event.extendedProps;
    if (eventType === 'habit_calendar') {
      if (!arg.event.start || !arg.event.end) { arg.revert(); return; }
      const hStr = String(arg.event.start.getHours()).padStart(2, '0');
      const mStr = String(arg.event.start.getMinutes()).padStart(2, '0');
      const newTimeStr  = `${hStr}:${mStr}`;
      const newDuration = Math.round((arg.event.end.getTime() - arg.event.start.getTime()) / 60_000);
      const origDate = toISODate(arg.event.start);
      const habit = habits.find(h => h.id === (habitId as string));
      const updatedOverrides = {
        ...(habit?.calendar_overrides ?? {}),
        [origDate]: { start: newTimeStr, duration: newDuration },
      };
      setHabits(prev => prev.map(h =>
        h.id === (habitId as string) ? { ...h, calendar_overrides: updatedOverrides } : h
      ));
      try {
        await updateHabit(habitId as string, { calendar_overrides: updatedOverrides });
        refreshEvents();
      } catch { arg.revert(); }
      return;
    }
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
        height="calc(100vh - 250px)"
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
          habits={habits}
          routines={routines}
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
