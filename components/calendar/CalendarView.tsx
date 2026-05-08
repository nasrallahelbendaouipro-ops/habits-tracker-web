'use client';

import { useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateClickArg, EventResizeDoneArg } from '@fullcalendar/interaction';
import type { EventClickArg, EventDropArg, EventInput } from '@fullcalendar/core';
import { createClient } from '@/lib/supabase/client';
import { updateCalendarEvent } from '@/lib/calendar';
import type { CalendarEvent } from '@/lib/types';
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

export default function CalendarView({ userId }: { userId: string }) {
  const router = useRouter();
  const calendarRef = useRef<FullCalendar>(null);
  const [modal, setModal] = useState<ModalState>(null);

  const fetchEvents = useCallback(async (
    info: { startStr: string; endStr: string },
    successCallback: (events: EventInput[]) => void,
    failureCallback: (error: Error) => void
  ) => {
    try {
      const supabase = createClient();
      const rangeStart = info.startStr.slice(0, 10);
      const rangeEnd   = info.endStr.slice(0, 10);

      const [habitsRes, logsRes, eventsRes] = await Promise.all([
        supabase.from('habits').select('id, name, icon, color').eq('user_id', userId),
        supabase
          .from('habit_logs')
          .select('habit_id, completed_at')
          .eq('user_id', userId)
          .gte('completed_at', rangeStart)
          .lte('completed_at', rangeEnd),
        supabase
          .from('calendar_events')
          .select('*')
          .eq('user_id', userId)
          .gte('start_at', info.startStr)
          .lte('start_at', info.endStr),
      ]);

      const habitMap = new Map(
        (habitsRes.data ?? []).map(h => [h.id, h as { id: string; name: string; icon: string; color: string }])
      );

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
          classNames: ['habit-event'],
          extendedProps: { eventType: 'habit', habitId: log.habit_id },
          editable: false,
        };
      });

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

      successCallback([...habitEvents, ...calEvents]);
    } catch (err) {
      failureCallback(err instanceof Error ? err : new Error('Failed to load events'));
    }
  }, [userId]);

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
    if (eventType === 'habit') {
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

  return (
    <>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        events={fetchEvents}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
        editable={true}
        selectable={true}
        dayMaxEvents={3}
        nowIndicator={true}
        height="auto"
        eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
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
