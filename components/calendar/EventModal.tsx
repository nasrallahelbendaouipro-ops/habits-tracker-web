'use client';

import { useState, useEffect } from 'react';
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/lib/calendar';
import type { CalendarEvent, CalendarEventType } from '@/lib/types';

const EVENT_COLORS = ['#6C63FF', '#FF6B35', '#4ECDC4', '#45B7D1', '#FF6B6B', '#96CEB4', '#FFD93D', '#DDA0DD'];

const TYPE_OPTIONS: { value: CalendarEventType; label: string; icon: string }[] = [
  { value: 'event',     label: 'Event',     icon: '📅' },
  { value: 'meeting',   label: 'Meeting',   icon: '🤝' },
  { value: 'interview', label: 'Interview', icon: '💼' },
  { value: 'shift',     label: 'Shift',     icon: '🕐' },
];

type Props = {
  visible: boolean;
  mode: 'create' | 'edit';
  initialStart?: string;
  initialEnd?: string;
  event?: CalendarEvent;
  userId: string;
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

export default function EventModal({ visible, mode, initialStart, initialEnd, event, userId, onClose, onSaved }: Props) {
  const [title, setTitle]   = useState('');
  const [type, setType]     = useState<CalendarEventType>('event');
  const [start, setStart]   = useState(initialStart ?? '');
  const [end, setEnd]       = useState(initialEnd ?? '');
  const [color, setColor]   = useState('#6C63FF');
  const [notes, setNotes]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    if (!visible) return;
    if (mode === 'edit' && event) {
      setTitle(event.title);
      setType(event.type);
      setStart(toLocalInput(event.start_at));
      setEnd(toLocalInput(event.end_at));
      setColor(event.color);
      setNotes(event.notes ?? '');
    } else {
      setTitle('');
      setType('event');
      setColor('#6C63FF');
      setNotes('');
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!start || !end) { setError('Start and end are required.'); return; }
    if (new Date(start) >= new Date(end)) { setError('End must be after start.'); return; }
    setError('');
    setLoading(true);
    try {
      if (mode === 'create') {
        await createCalendarEvent({
          user_id: userId, title: title.trim(), type,
          start_at: fromLocalInput(start), end_at: fromLocalInput(end),
          color, notes: notes.trim() || undefined, source: 'manual',
        });
      } else if (event) {
        await updateCalendarEvent(event.id, {
          title: title.trim(), type,
          start_at: fromLocalInput(start), end_at: fromLocalInput(end),
          color, notes: notes.trim() || undefined,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!event || !confirm('Delete this event?')) return;
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
  const focusBorder = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    (e.target.style.borderColor = 'var(--primary)');
  const blurBorder = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
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
            {mode === 'create' ? '+ New event' : 'Edit event'}
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
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => { setTitle(e.target.value); setError(''); }}
              placeholder="e.g. Team standup"
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
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Start</label>
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
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>End</label>
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
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Color</label>
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

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Notes <span style={{ color: 'var(--text-disabled)' }}>(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any notes..."
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
              {loading ? 'Saving…' : mode === 'create' ? 'Add event' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
