'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchCalendarEvents } from '@/lib/calendar';
import {
  parseDayProgramHTML,
  saveDayProgram,
  clearDayProgram,
  loadDayProgram,
  type DayProgram,
  type DayActivity,
  type DayScenario,
  type ActivityCategory,
} from '@/lib/dayProgram';

// ─── Constants ─────────────────────────────────────────────────────────────────

const CAT_COLOR: Record<ActivityCategory, string> = {
  corps:   'var(--body)',
  cerveau: 'var(--mind)',
  ame:     'var(--soul)',
  travail: 'var(--secondary)',
};

const CAT_MUTED: Record<ActivityCategory, string> = {
  corps:   'var(--body-muted)',
  cerveau: 'var(--mind-muted)',
  ame:     'var(--soul-muted)',
  travail: 'var(--secondary-muted)',
};

const SCENARIO_LABEL: Record<DayScenario, string> = {
  withShift: '🏢 Service',
  freeDay:   '☀️ Libre',
  sunday:    '🕌 Dimanche',
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function ActivityRow({ a }: { a: DayActivity }) {
  const color = CAT_COLOR[a.category as ActivityCategory] ?? 'var(--primary)';
  const muted = CAT_MUTED[a.category as ActivityCategory] ?? 'var(--surface-elevated)';
  return (
    <div
      className="flex gap-3 py-2.5 px-3 rounded-xl mb-1.5"
      style={{ background: muted }}
    >
      <span
        className="w-[72px] flex-shrink-0 text-right text-[10px] font-mono leading-5 pt-0.5 select-none"
        style={{ color: 'var(--text-muted)' }}
      >
        {a.timeSlot}
      </span>
      <div className="w-0.5 flex-shrink-0 self-stretch rounded-full my-0.5" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm leading-none">{a.icon}</span>
          <span className="font-semibold text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>
            {a.title}
          </span>
        </div>
        {a.detail && (
          <p
            className="text-xs mt-1 leading-relaxed line-clamp-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            {a.detail}
          </p>
        )}
        {a.kcal && (
          <span
            className="inline-block text-[10px] font-semibold mt-1 px-1.5 py-0.5 rounded-full"
            style={{ color, background: `color-mix(in srgb, ${color} 15%, transparent)` }}
          >
            {a.kcal}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

type Props = {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  userId: string;
};

export default function DayProgramSheet({ isOpen, onClose, selectedDate, userId }: Props) {
  const [program, setProgram]               = useState<DayProgram | null>(null);
  const [scenario, setScenario]             = useState<DayScenario>('freeDay');
  const [detectedScenario, setDetectedScenario] = useState<DayScenario>('freeDay');
  const [loadingScenario, setLoadingScenario] = useState(false);
  const [uploadError, setUploadError]       = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const detectScenario = useCallback(async (prog: DayProgram | null) => {
    if (!prog || !userId) return;
    setLoadingScenario(true);
    try {
      const dayOfWeek = new Date(selectedDate + 'T00:00:00').getDay();
      if (dayOfWeek === 0) {
        setDetectedScenario('sunday');
        setScenario('sunday');
        return;
      }
      const events = await fetchCalendarEvents(
        userId,
        selectedDate + 'T00:00:00Z',
        selectedDate + 'T23:59:59Z'
      );
      const detected: DayScenario = events.some(e => e.type === 'shift') ? 'withShift' : 'freeDay';
      setDetectedScenario(detected);
      setScenario(detected);
    } catch {
      setDetectedScenario('freeDay');
      setScenario('freeDay');
    } finally {
      setLoadingScenario(false);
    }
  }, [userId, selectedDate]);

  useEffect(() => {
    if (!isOpen) return;
    const stored = loadDayProgram();
    setProgram(stored);
    setUploadError('');
    detectScenario(stored);
  }, [isOpen, detectScenario]);

  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  async function handleFile(file: File) {
    setUploadError('');
    try {
      const html = await file.text();
      const parsed = parseDayProgramHTML(html);
      if (!parsed.withShift.length && !parsed.freeDay.length && !parsed.sunday.length) {
        setUploadError('Fichier non reconnu — vérifie que ce fichier contient les sections #scenario1, #scenario2 et #scenario3.');
        return;
      }
      saveDayProgram(parsed);
      setProgram(parsed);
      detectScenario(parsed);
    } catch {
      setUploadError('Impossible de lire le fichier. Essaie à nouveau.');
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  function handleClear() {
    clearDayProgram();
    setProgram(null);
  }

  const activities: DayActivity[] = program ? program[scenario] : [];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="fixed left-0 right-0 bottom-0 z-50 flex flex-col rounded-t-3xl"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              maxHeight: '85vh',
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore — dvh is valid CSS but TS doesn't know it yet
              maxHeight: '85dvh',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.15}
            onDragEnd={(_, info) => { if (info.offset.y > 80) onClose(); }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
            </div>

            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-3 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div>
                <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                  📅 Programme du jour
                </h2>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('fr-FR', {
                    weekday: 'long', day: 'numeric', month: 'long',
                  })}
                  {program && ` · ${activities.length} créneaux`}
                  {loadingScenario && ' · …'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
                style={{ background: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}
              >
                ✕
              </button>
            </div>

            {program ? (
              <>
                {/* Scenario tabs */}
                <div className="flex gap-2 px-5 py-3 flex-shrink-0">
                  {(Object.entries(SCENARIO_LABEL) as [DayScenario, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setScenario(key)}
                      className="flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all relative"
                      style={{
                        background: scenario === key ? 'var(--primary)' : 'var(--surface-elevated)',
                        color: scenario === key ? 'white' : 'var(--text-secondary)',
                      }}
                    >
                      {label}
                      {/* dot = auto-detected scenario while another tab is active */}
                      {key === detectedScenario && scenario !== key && (
                        <span
                          className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border-2"
                          style={{ background: 'var(--primary)', borderColor: 'var(--surface)' }}
                        />
                      )}
                    </button>
                  ))}
                </div>

                {/* Timeline */}
                <div
                  className="flex-1 overflow-y-auto px-5 min-h-0"
                  style={{ overscrollBehavior: 'contain' }}
                  onPointerDown={e => e.stopPropagation()}
                >
                  {activities.length === 0 ? (
                    <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
                      Aucun créneau pour ce scénario.
                    </p>
                  ) : (
                    activities.map((a, i) => <ActivityRow key={i} a={a} />)
                  )}
                  <div className="h-4" />
                </div>

                {/* Footer */}
                <div
                  className="flex-shrink-0 px-5 py-4 flex items-center gap-3"
                  style={{ borderTop: '1px solid var(--border)' }}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".html"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                    style={{
                      background: 'var(--surface-elevated)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    ↑ Remplacer
                  </button>
                  <button
                    onClick={handleClear}
                    className="py-2.5 px-4 rounded-xl text-sm font-semibold"
                    style={{ color: 'var(--error)', background: 'var(--error-muted)' }}
                  >
                    Supprimer
                  </button>
                </div>
              </>
            ) : (
              /* Upload state */
              <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 gap-5">
                <div className="text-5xl select-none">📋</div>
                <div className="text-center">
                  <h3 className="font-bold text-base mb-2" style={{ color: 'var(--text-primary)' }}>
                    Importe ton programme quotidien
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    Upload ton fichier HTML. Le bon programme (service / libre / dimanche) s'affiche automatiquement selon tes shifts du calendrier.
                  </p>
                </div>
                {uploadError && (
                  <p className="text-xs text-center" style={{ color: 'var(--error)' }}>{uploadError}</p>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".html"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white"
                  style={{ background: 'var(--primary)' }}
                >
                  📂 Choisir le fichier HTML
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
