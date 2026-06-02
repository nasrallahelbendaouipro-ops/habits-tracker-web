'use client';

import { useState, useEffect } from 'react';
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/lib/calendar';
import { useLocale } from '@/lib/i18n';
import type { CalendarEvent, CalendarEventType, Routine } from '@/lib/types';

const EVENT_COLORS = ['#6C63FF', '#FF6B35', '#4ECDC4', '#45B7D1', '#FF6B6B', '#96CEB4', '#FFD93D', '#DDA0DD'];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type Props = {
  visible: boolean;
  mode: 'create' | 'edit';
  initialStart?: string;
  initialEnd?: string;
  event?: CalendarEvent;
  userId: string;
  routines: Routine[];
  onClose: () => void;
  onSaved: () => void;
};

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(local: string): string {
  return new Date(local).toISOString();
}

function defaultEnd(start: string): string {
  const d = new Date(start);
  d.setHours(d.getHours() + 1);
  return toLocalInput(d.toISOString());
}

export default function EventModal({ visible, mode, initialStart, initialEnd, event, userId, routines, onClose, onSaved }: Props) {
  const { t } = useLocale();
  const [title, setTitle]   = useState('');
  const [type, setType]     = useState<CalendarEventType>('event');
  const [start, setStart]   = useState(initialStart ?? '');
  const [end, setEnd]       = useState(initialEnd ?? '');
  const [color, setColor]   = useState('#6C63FF');
  const [notes, setNotes]   = useState('');
  const [linkedRoutineIds, setLinkedRoutineIds] = useState<string[]>([]);
  const [loading, setLoading]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError]   = useState('');

  const TYPE_OPTIONS: { value: CalendarEventType; label: string; icon: string }[] = [
    { value: 'event',     label: t.event_type_event,     icon: '📅' },
    { value: 'meeting',   label: t.event_type_meeting,   icon: '🤝' },
    { value: 'interview', label: t.event_type_interview, icon: '💼' },
    { value: 'shift',     label: t.event_type_shift,     icon: '🕐' },
  ];

  useEffect(() => {
    if (!visible) return;
    if (mode === 'edit' && event) {
      setTitle(event.title);
      setType(event.type);
      setStart(toLocalInput(event.start_at));
      setEnd(toLocalInput(event.end_at));
      setColor(event.color);
      setNotes(event.notes ?? '');
      setLinkedRoutineIds(event.linked_routine_ids ?? []);
    } else {
      setTitle('');
      setType('event');
      setColor('#6C63FF');
      setNotes('');
      setLinkedRoutineIds([]);
      const s = initialStart ?? toLocalInput(new Date().toISOString());
      setStart(s);
      setEnd(initialEnd ?? defaultEnd(s));
    }
    setError('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [visible, onClose]);

  useEffect(() => {
    document.body.style.overflow = visible ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [visible]);

  if (!visible) return null;

  function addRoutine(id: string) {
    if (!id || linkedRoutineIds.includes(id)) return;
    const routine = routines.find(r => r.id === id);
    if (!routine) return;
    setLinkedRoutineIds(prev => {
      if (prev.length === 0 && !title.trim()) {
        setTitle(routine.name);
        if (routine.color) setColor(routine.color);
      }
      return [...prev, id];
    });
  }

  function removeRoutine(id: string) {
    setLinkedRoutineIds(prev => prev.filter(x => x !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError(t.event_err_title); return; }
    if (!start || !end) { setError(t.event_err_dates); return; }
    if (new Date(start) >= new Date(end)) { setError(t.event_err_order); return; }
    setError('');
    setLoading(true);
    try {
      if (mode === 'create') {
        await createCalendarEvent({
          user_id: userId, title: title.trim(), type,
          start_at: fromLocalInput(start), end_at: fromLocalInput(end),
          color, notes: notes.trim() || undefined,
          source: 'manual',
          linked_habit_ids: [],
          linked_routine_ids: linkedRoutineIds,
        });
      } else if (event) {
        await updateCalendarEvent(event.id, {
          title: title.trim(), type,
          start_at: fromLocalInput(start), end_at: fromLocalInput(end),
          color, notes: notes.trim() || undefined,
          linked_routine_ids: linkedRoutineIds,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.form_err_generic);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!event || !confirm(t.event_delete_confirm)) return;
    setDeleting(true);
    try {
      await deleteCalendarEvent(event.id);
      onSaved();
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  const inputStyle = {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  };
  const focusBorder = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    (e.target.style.borderColor = 'var(--primary)');
  const blurBorder = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    (e.target.style.borderColor = 'var(--border)');

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full md:max-w-lg rounded-2xl animate-slide-up overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 sticky top-0"
          style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
        >
          <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
            {mode === 'create' ? t.event_new : t.event_edit}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-all"
            style={{ background: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}
          >✕</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
          {/* Type */}
          <div className="flex gap-2 flex-wrap">
            {TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: type === opt.value ? color + '25' : 'var(--surface-elevated)',
                  border: `1px solid ${type === opt.value ? color : 'var(--border)'}`,
                  color: type === opt.value ? color : 'var(--text-secondary)',
                }}
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
              {t.event_title}
            </label>
            <input
              type="text"
              value={title}
              onChange={e => { setTitle(e.target.value); setError(''); }}
              placeholder={t.event_title_placeholder}
              maxLength={80}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={inputStyle}
              onFocus={focusBorder}
              onBlur={blurBorder}
              autoFocus
            />
          </div>

          {/* Start / End */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>{t.event_start}</label>
              <input
                type="datetime-local"
                value={start}
                onChange={e => { setStart(e.target.value); setError(''); }}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>{t.event_end}</label>
              <input
                type="datetime-local"
                value={end}
                onChange={e => { setEnd(e.target.value); setError(''); }}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>{t.form_color}</label>
            <div className="flex flex-wrap gap-2">
              {EVENT_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full transition-all"
                  style={{
                    background: c,
                    outline: color === c ? `3px solid ${c}` : 'none',
                    outlineOffset: '2px',
                    transform: color === c ? 'scale(1.15)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Link to routines */}
          {routines.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Link Routine
              </label>

              <select
                value=""
                onChange={e => { addRoutine(e.target.value); e.currentTarget.value = ''; }}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ ...inputStyle, cursor: 'pointer' }}
                onFocus={focusBorder}
                onBlur={blurBorder}
              >
                <option value="">Add a routine…</option>
                {routines
                  .filter(r => !linkedRoutineIds.includes(r.id))
                  .map(r => (
                    <option key={r.id} value={r.id}>{r.icon ?? '📋'} {r.name}</option>
                  ))}
              </select>

              {/* Linked routine cards */}
              {linkedRoutineIds.length > 0 && (
                <div className="flex flex-col gap-2 mt-2">
                  {linkedRoutineIds.map(id => {
                    const routine = routines.find(r => r.id === id);
                    if (!routine) return null;
                    const accentColor = routine.color ?? '#6C63FF';
                    const scheduledDays = routine.schedule_days.map(d => DAY_LABELS[d]).join(' · ');
                    return (
                      <div
                        key={id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                        style={{ background: accentColor + '12', border: `1px solid ${accentColor}35` }}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                          style={{ background: accentColor + '25' }}
                        >
                          {routine.icon ?? '📋'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: accentColor }}>
                            {routine.name}
                          </p>
                          <p className="text-[10px] mt-0.5 capitalize" style={{ color: 'var(--text-muted)' }}>
                            {routine.category} · {scheduledDays || 'No schedule'} · {routine.tasks.length} tasks
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRoutine(id)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-xs flex-shrink-0 transition-all"
                          style={{ background: 'var(--surface-elevated)', color: 'var(--text-muted)' }}
                        >✕</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
              {t.event_notes} <span style={{ color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 0 }}>{t.event_optional}</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={t.event_notes_placeholder}
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={inputStyle}
              onFocus={focusBorder}
              onBlur={blurBorder}
            />
          </div>

          {error && <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>}

          <div className="flex gap-2">
            {mode === 'edit' && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2.5 rounded-xl font-semibold text-sm transition-all"
                style={{ background: 'rgba(255,107,107,0.12)', color: 'var(--error)' }}
              >
                {deleting ? '…' : '🗑️'}
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white transition-all"
              style={{ background: loading ? 'var(--text-muted)' : color, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? t.form_saving : mode === 'create' ? t.event_add : t.modal_save_changes}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
