'use client';

import { useState, useEffect } from 'react';
import { createCalendarEvent } from '@/lib/calendar';
import { useLocale, LOCALE_DATE_TAG } from '@/lib/i18n';
import type { ParsedShift } from '@/app/api/parse-shift/route';

type ShiftEntry = ParsedShift & { selected: boolean; key: string };

type Props = {
  visible: boolean;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
};

function calcDuration(start: string, end: string): string {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function ShiftParserModal({ visible, userId, onClose, onSaved }: Props) {
  const { t, locale } = useLocale();
  const [step, setStep]         = useState<'input' | 'review'>('input');
  const [text, setText]         = useState('');
  const [shifts, setShifts]     = useState<ShiftEntry[]>([]);
  const [parsing, setParsing]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [aiPowered, setAiPowered] = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (!visible) { setStep('input'); setText(''); setShifts([]); setError(''); }
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

  function formatDisplayDate(iso: string): string {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString(LOCALE_DATE_TAG[locale], { weekday: 'short', month: 'short', day: 'numeric' });
  }

  async function handleParse() {
    if (!text.trim()) { setError(t.parser_err_empty); return; }
    setError('');
    setParsing(true);
    try {
      const res = await fetch('/api/parse-shift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (!data.shifts?.length) { setError(t.parser_err_none); return; }
      setShifts(data.shifts.map((s: ParsedShift, i: number) => ({ ...s, selected: true, key: `${i}` })));
      setAiPowered(data.aiPowered ?? false);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : t.parser_err_failed);
    } finally {
      setParsing(false);
    }
  }

  function updateShift(key: string, updates: Partial<ShiftEntry>) {
    setShifts(prev => prev.map(s => s.key === key ? { ...s, ...updates } : s));
  }

  async function handleSave() {
    const toSave = shifts.filter(s => s.selected);
    if (!toSave.length) return;
    setSaving(true);
    try {
      await Promise.all(toSave.map(s => {
        const startISO = new Date(`${s.date}T${s.start}:00`).toISOString();
        const endDate = s.end < s.start
          ? new Date(`${s.date}T${s.end}:00`).setDate(new Date(`${s.date}`).getDate() + 1)
          : new Date(`${s.date}T${s.end}:00`).getTime();
        const endISO = new Date(endDate).toISOString();
        return createCalendarEvent({
          user_id: userId,
          title: s.title || t.parser_shift_default,
          type: 'shift',
          start_at: startISO,
          end_at: endISO,
          color: '#FF6B35',
          source: 'ai-parsed',
          linked_habit_ids: [],
        });
      }));
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.parser_err_save);
    } finally {
      setSaving(false);
    }
  }

  const selectedCount = shifts.filter(s => s.selected).length;

  const inputStyle = {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  };

  const headerSubtitle = step === 'input'
    ? (aiPowered ? t.parser_ai_powered : t.parser_paste_schedule)
    : `${shifts.length} ${shifts.length !== 1 ? t.parser_shifts_noun : t.parser_shift_noun} ${t.parser_detected}${aiPowered ? ' · AI' : ''}`;

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
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div>
            <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
              {t.parser_title}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {headerSubtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
            style={{ background: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}
          >✕</button>
        </div>

        {/* Step 1: Input */}
        {step === 'input' && (
          <div className="px-6 py-5 flex flex-col gap-4">
            <div
              className="rounded-xl px-4 py-3 text-xs"
              style={{ background: 'var(--primary-muted)', border: '1px solid var(--primary-muted)', color: 'var(--text-secondary)' }}
            >
              <p className="font-semibold mb-1" style={{ color: 'var(--primary)' }}>{t.parser_formats}</p>
              <p>Mon 18h-23h &nbsp;·&nbsp; Wednesday 19:00-02:00</p>
              <p>Sat 20h30-23h00 &nbsp;·&nbsp; 15/05 18h-23h</p>
              <p>Mon, Wed, Fri 20h-23h</p>
            </div>

            <textarea
              value={text}
              onChange={e => { setText(e.target.value); setError(''); }}
              placeholder={`Paste your work schedule here...\n\nExample:\nMon 18h-23h\nWed 19h-02h\nSat 20h30-23h`}
              rows={7}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none font-mono"
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              autoFocus
            />

            {error && <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>}

            <button
              onClick={handleParse}
              disabled={parsing}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all"
              style={{ background: parsing ? 'var(--text-muted)' : 'var(--secondary)', cursor: parsing ? 'not-allowed' : 'pointer' }}
            >
              {parsing ? t.parser_parsing : t.parser_parse_btn}
            </button>
          </div>
        )}

        {/* Step 2: Review */}
        {step === 'review' && (
          <div className="px-6 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {t.parser_select}
            </p>

            <div className="flex flex-col gap-2">
              {shifts.map(s => (
                <div
                  key={s.key}
                  className="flex items-start gap-3 p-3 rounded-xl transition-all"
                  style={{
                    background: s.selected ? 'rgba(255,107,53,0.08)' : 'var(--surface-elevated)',
                    border: `1px solid ${s.selected ? '#FF6B3540' : 'var(--border)'}`,
                  }}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => updateShift(s.key, { selected: !s.selected })}
                    className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                    style={{
                      background: s.selected ? '#FF6B35' : 'transparent',
                      border: `2px solid ${s.selected ? '#FF6B35' : 'var(--border)'}`,
                    }}
                  >
                    {s.selected && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {formatDisplayDate(s.date)}
                      </span>
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ background: '#FF6B3520', color: '#FF6B35' }}
                      >
                        {s.start} → {s.end}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {calcDuration(s.start, s.end)}
                      </span>
                    </div>
                    {/* Editable title */}
                    <input
                      type="text"
                      value={s.title}
                      onChange={e => updateShift(s.key, { title: e.target.value })}
                      className="mt-1.5 px-2 py-1 rounded-lg text-xs w-full outline-none"
                      style={{ background: 'var(--border)', color: 'var(--text-secondary)', border: 'none' }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {error && <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setStep('input'); setError(''); }}
                className="px-4 py-2.5 rounded-xl font-semibold text-sm transition-all"
                style={{ background: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}
              >
                {t.habit_back}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || selectedCount === 0}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white transition-all"
                style={{
                  background: saving || selectedCount === 0 ? 'var(--text-muted)' : '#FF6B35',
                  cursor: saving || selectedCount === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {saving
                  ? t.form_saving
                  : `${t.parser_save} ${selectedCount} ${selectedCount !== 1 ? t.parser_shifts_noun : t.parser_shift_noun}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
