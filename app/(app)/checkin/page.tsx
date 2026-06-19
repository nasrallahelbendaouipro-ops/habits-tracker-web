'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchHabitsWithStatus, toggleHabit } from '@/lib/habits';
import {
  fetchCheckin, upsertMorningCheckin, upsertEveningCheckin,
  type BodyMetrics, type MindMetrics, type SoulMetrics, type MorningData, type EveningData,
} from '@/lib/checkin';
import { getRoutineBlocksForDate, computeSetProgress, countTrackableTasks } from '@/lib/routines';
import { fetchCalendarEvents } from '@/lib/calendar';
import { TODAY } from '@/lib/utils';
import type { HabitWithStreak, RoutineCalendarBlock, CalendarEvent } from '@/lib/types';
import GlassCard from '@/components/ui/GlassCard';
import { Sun, Moon, CheckCircle2, XCircle } from 'lucide-react';

const DIM_COLOR = { body: 'var(--body)', mind: 'var(--mind)', soul: 'var(--soul)' };

// ─── Rating Picker ─────────────────────────────────────────────────────────────

function RatingPicker({ label, value, onChange, color, hint }: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  color: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        {value != null && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ background: color + '20', color }}>
            {value}/10
          </span>
        )}
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
          const active = n === value;
          return (
            <button
              key={n}
              onClick={() => onChange(active ? undefined : n)}
              aria-label={`${label} ${n} out of 10`}
              aria-pressed={active}
              className="flex-1 h-11 rounded-lg text-xs font-bold transition-all"
              style={{
                background: active ? color : 'var(--surface-elevated)',
                color: active ? 'white' : 'var(--text-muted)',
                border: `1px solid ${active ? color : 'var(--border)'}`,
                transform: active ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
      {hint && <p className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>{hint}</p>}
    </div>
  );
}

// ─── Metric Input ──────────────────────────────────────────────────────────────

function MetricInput({ label, value, onChange, unit, min, max, step = 0.1 }: {
  label: string; value: number | undefined; onChange: (v: number | undefined) => void;
  unit: string; min?: number; max?: number; step?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={value ?? ''}
          min={min}
          max={max}
          step={step}
          onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
          placeholder="—"
          className="form-input w-20 text-right"
          style={{ padding: '6px 8px' }}
        />
        <span className="text-xs w-8 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{unit}</span>
      </div>
    </div>
  );
}

// ─── Habit Row ─────────────────────────────────────────────────────────────────

function HabitRow({ habit, onToggle }: { habit: HabitWithStreak; onToggle: () => void }) {
  const dimColor = DIM_COLOR[habit.dimension] ?? 'var(--primary)';
  return (
    <button
      type="button"
      aria-pressed={habit.completedToday}
      className="flex items-center gap-3 p-3 rounded-xl transition-all w-full text-left"
      style={{
        background: habit.completedToday ? dimColor + '12' : 'var(--surface-elevated)',
        border: `1px solid ${habit.completedToday ? dimColor + '40' : 'var(--border)'}`,
      }}
      onClick={onToggle}
    >
      <span className="text-lg">{habit.icon}</span>
      <span
        className="flex-1 text-sm font-medium"
        style={{
          color: habit.completedToday ? 'var(--text-muted)' : 'var(--text-primary)',
          textDecoration: habit.completedToday ? 'line-through' : 'none',
        }}
      >
        {habit.name}
      </span>
      {habit.streak > 0 && (
        <span className="text-[10px]" style={{ color: 'var(--secondary)' }}>🔥{habit.streak}d</span>
      )}
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
        style={{
          background: habit.completedToday ? dimColor : 'transparent',
          border: `2px solid ${habit.completedToday ? dimColor : 'var(--border)'}`,
        }}
      >
        {habit.completedToday && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" className="animate-check-draw">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </button>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getRoutineCompletionPct(block: RoutineCalendarBlock): number {
  const session = block.session;
  if (!session) return 0;
  if (block.routine.category === 'sport') {
    const { totalSets, doneSets } = computeSetProgress(block.routine, session);
    return totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;
  }
  const trackable = countTrackableTasks(block.routine.tasks);
  return trackable > 0 ? Math.round((session.completed_task_ids.length / trackable) * 100) : 0;
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CheckInPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'morning' | 'evening'>(
    () => new Date().getHours() < 14 ? 'morning' : 'evening'
  );

  // Morning
  const [body, setBody] = useState<BodyMetrics>({});
  const [mind, setMind] = useState<MindMetrics>({});
  const [morningData, setMorningData] = useState<MorningData>({});
  const [morningComplete, setMorningComplete] = useState(false);
  const [morningSaving, setMorningSaving] = useState(false);
  const [morningSaved, setMorningSaved] = useState(false);

  // Evening
  const [soul, setSoul] = useState<SoulMetrics>({});
  const [eveningData, setEveningData] = useState<EveningData>({});
  const [notes, setNotes] = useState('');
  const [eveningComplete, setEveningComplete] = useState(false);
  const [eveningSaving, setEveningSaving] = useState(false);
  const [eveningSaved, setEveningSaved] = useState(false);

  // Evening bilan data
  const [habits, setHabits] = useState<HabitWithStreak[]>([]);
  const [routineBlocks, setRoutineBlocks] = useState<RoutineCalendarBlock[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => { if (data.user) setUserId(data.user.id); });
  }, []);

  const load = useCallback(async () => {
    if (!userId) return;
    const [habitsData, checkin, blocksData, events] = await Promise.all([
      fetchHabitsWithStatus(userId, TODAY),
      fetchCheckin(userId, TODAY),
      getRoutineBlocksForDate(TODAY),
      fetchCalendarEvents(userId, `${TODAY}T00:00:00`, `${TODAY}T23:59:59`),
    ]);
    setHabits(habitsData);
    setRoutineBlocks(blocksData);
    setCalendarEvents(events);
    if (checkin) {
      setBody(checkin.body_metrics ?? {});
      setMind(checkin.mind_metrics ?? {});
      setSoul(checkin.soul_metrics ?? {});
      setNotes(checkin.notes ?? '');
      setMorningData(checkin.morning_data ?? {});
      setEveningData(checkin.evening_data ?? {});
      setMorningComplete(!!checkin.morning_data?.completed_at);
      setEveningComplete(!!checkin.evening_data?.completed_at);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (habit: HabitWithStreak) => {
    setHabits(prev => prev.map(h =>
      h.id === habit.id ? { ...h, completedToday: !h.completedToday } : h
    ));
    try { await toggleHabit(habit.id, userId!, habit.completedToday, TODAY); }
    catch { load(); }
  };

  const handleSaveMorning = async () => {
    if (!userId) return;
    setMorningSaving(true);
    try {
      await upsertMorningCheckin(userId, TODAY, body, mind, morningData);
      setMorningComplete(true);
      setMorningSaved(true);
      setTimeout(() => setMorningSaved(false), 3000);
    } finally {
      setMorningSaving(false);
    }
  };

  const handleSaveEvening = async () => {
    if (!userId) return;
    setEveningSaving(true);
    try {
      await upsertEveningCheckin(userId, TODAY, soul, notes || undefined, eveningData);
      setEveningComplete(true);
      setEveningSaved(true);
      setTimeout(() => setEveningSaved(false), 3000);
    } finally {
      setEveningSaving(false);
    }
  };

  const now = new Date().toLocaleDateString('fr-FR', { weekday: 'long', month: 'long', day: 'numeric' });
  const completedHabits = habits.filter(h => h.completedToday).length;

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="mb-5">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Check-in</h1>
        <p className="text-sm mt-0.5 capitalize" style={{ color: 'var(--text-secondary)' }}>{now}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: 'var(--surface)' }}>
        {([
          { key: 'morning' as const, Icon: Sun, label: 'Matin', done: morningComplete },
          { key: 'evening' as const, Icon: Moon, label: 'Soir', done: eveningComplete },
        ]).map(({ key, Icon, label, done }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: activeTab === key ? 'var(--surface-elevated)' : 'transparent',
              color: activeTab === key ? 'var(--primary)' : 'var(--text-muted)',
              boxShadow: activeTab === key ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
            }}
          >
            <Icon size={15} />
            {label}
            {done && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--teal)' }} />}
          </button>
        ))}
      </div>

      {/* ── MORNING TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'morning' && (
        <div className="flex flex-col gap-4">
          {/* Physical metrics */}
          <GlassCard>
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-4" style={{ color: 'var(--body)' }}>
              Métriques physiques
            </p>
            <div className="flex flex-col gap-4">
              <MetricInput label="Poids" value={body.weight} onChange={v => setBody(b => ({ ...b, weight: v }))} unit="kg" min={20} max={300} step={0.1} />
              <MetricInput label="Heures de sommeil" value={body.sleep_hours} onChange={v => setBody(b => ({ ...b, sleep_hours: v }))} unit="hrs" min={0} max={24} step={0.5} />
              <RatingPicker label="Qualité du sommeil" value={mind.sleep_quality} onChange={v => setMind(m => ({ ...m, sleep_quality: v }))} color="var(--body)" hint="1 = très mauvais  ·  10 = excellent" />
              <RatingPicker label="Humeur" value={body.mood} onChange={v => setBody(b => ({ ...b, mood: v }))} color="var(--body)" hint="1 = très bas  ·  10 = excellent" />
            </div>
          </GlassCard>

          {/* Mental state */}
          <GlassCard>
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-4" style={{ color: 'var(--mind)' }}>
              État mental
            </p>
            <div className="flex flex-col gap-4">
              <RatingPicker label="Énergie" value={mind.energy} onChange={v => setMind(m => ({ ...m, energy: v }))} color="var(--mind)" hint="1 = épuisé  ·  10 = plein d'énergie" />
              <RatingPicker label="Motivation" value={mind.motivation} onChange={v => setMind(m => ({ ...m, motivation: v }))} color="var(--mind)" hint="1 = pas de motivation  ·  10 = très motivé" />
            </div>
          </GlassCard>

          {/* Morning intentions */}
          <GlassCard>
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-4" style={{ color: 'var(--primary)' }}>
              Intentions du matin
            </p>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Affirmations du jour
                </label>
                <textarea
                  value={morningData.affirmations ?? ''}
                  onChange={e => setMorningData(d => ({ ...d, affirmations: e.target.value }))}
                  placeholder="Je suis capable de…"
                  rows={3}
                  className="form-input resize-none"
                />
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Objectifs prioritaires de la journée
                </label>
                <textarea
                  value={morningData.priority_goals ?? ''}
                  onChange={e => setMorningData(d => ({ ...d, priority_goals: e.target.value }))}
                  placeholder="Aujourd'hui je dois absolument…"
                  rows={3}
                  className="form-input resize-none"
                />
              </div>
            </div>
          </GlassCard>

          <div className="pb-24" />
        </div>
      )}

      {/* ── EVENING TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'evening' && (
        <div className="flex flex-col gap-4">
          {/* Habits bilan */}
          {habits.length > 0 && (
            <GlassCard>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--text-muted)' }}>
                  Habitudes du jour
                </p>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-lg"
                  style={{
                    background: completedHabits === habits.length && habits.length > 0 ? 'color-mix(in srgb, var(--teal) 20%, transparent)' : 'var(--surface-elevated)',
                    color: completedHabits === habits.length && habits.length > 0 ? 'var(--teal)' : 'var(--text-muted)',
                  }}
                >
                  {completedHabits}/{habits.length}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {habits.map(h => <HabitRow key={h.id} habit={h} onToggle={() => handleToggle(h)} />)}
              </div>
            </GlassCard>
          )}

          {/* Routines bilan */}
          {routineBlocks.length > 0 && (
            <GlassCard>
              <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
                Routines du jour
              </p>
              <div className="flex flex-col gap-3">
                {routineBlocks.map(block => {
                  const pct = getRoutineCompletionPct(block);
                  const color = block.routine.color ?? 'var(--primary)';
                  const hasSession = !!block.session;
                  const start = new Date(block.calendarEvent.start_at);
                  const timeStr = start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={block.calendarEvent.id} className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{block.routine.icon ?? '🔄'}</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium block truncate" style={{ color: 'var(--text-primary)' }}>
                            {block.routine.name}
                          </span>
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{timeStr}</span>
                        </div>
                        {hasSession ? (
                          <span className="text-sm font-bold flex-shrink-0" style={{ color: pct >= 100 ? 'var(--teal)' : color }}>
                            {pct}%
                          </span>
                        ) : (
                          <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>Non démarré</span>
                        )}
                      </div>
                      {hasSession && (
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--teal)' : color }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          )}

          {/* Calendar events */}
          {calendarEvents.length > 0 && (
            <GlassCard>
              <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
                Programme du jour
              </p>
              <div className="flex flex-col gap-2">
                {calendarEvents
                  .sort((a, b) => a.start_at.localeCompare(b.start_at))
                  .map(event => {
                    const start = new Date(event.start_at);
                    const end = new Date(event.end_at);
                    const durationMin = Math.round((end.getTime() - start.getTime()) / 60000);
                    const timeStr = start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div
                        key={event.id}
                        className="flex items-center gap-3 p-3 rounded-xl"
                        style={{ background: 'var(--surface-elevated)', borderLeft: `3px solid ${event.color}` }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{event.title}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {timeStr}{durationMin > 0 && ` · ${durationMin} min`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </GlassCard>
          )}

          {/* Morning priority goals reminder */}
          {morningData.priority_goals && (
            <GlassCard style={{ borderLeft: '3px solid var(--primary)' }}>
              <p className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--primary)' }}>
                Objectifs du matin
              </p>
              <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                {morningData.priority_goals}
              </p>
            </GlassCard>
          )}

          {/* Evening reflection */}
          <GlassCard>
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-4" style={{ color: 'var(--teal)' }}>
              Bilan de la journée
            </p>
            <div className="flex flex-col gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                  <CheckCircle2 size={14} style={{ color: 'var(--teal)' }} />
                  Ce qui a bien marché
                </label>
                <textarea
                  value={eveningData.wins ?? ''}
                  onChange={e => setEveningData(d => ({ ...d, wins: e.target.value }))}
                  placeholder="Victoires du jour…"
                  rows={3}
                  className="form-input resize-none"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                  <XCircle size={14} style={{ color: '#f97316' }} />
                  Ce qui n'a pas été fait
                </label>
                <textarea
                  value={eveningData.improvements ?? ''}
                  onChange={e => setEveningData(d => ({ ...d, improvements: e.target.value }))}
                  placeholder="À améliorer demain…"
                  rows={3}
                  className="form-input resize-none"
                />
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Réflexions libres
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Comment s'est passée ta journée ?"
                  rows={3}
                  className="form-input resize-none"
                />
              </div>
            </div>
          </GlassCard>

          {/* Soul metrics */}
          <GlassCard>
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-4" style={{ color: 'var(--soul)' }}>
              État intérieur
            </p>
            <div className="flex flex-col gap-4">
              <RatingPicker label="Gratitude" value={soul.gratitude_score} onChange={v => setSoul(s => ({ ...s, gratitude_score: v }))} color="var(--soul)" hint="1 = pas reconnaissant  ·  10 = très reconnaissant" />
              <RatingPicker label="Qualité de méditation" value={soul.meditation_quality} onChange={v => setSoul(s => ({ ...s, meditation_quality: v }))} color="var(--soul)" />
              <RatingPicker label="Niveau de stress" value={soul.stress_level} onChange={v => setSoul(s => ({ ...s, stress_level: v }))} color="#f97316" hint="1 = très calme  ·  10 = très stressé" />
            </div>
          </GlassCard>

          <div className="pb-24" />
        </div>
      )}

      {/* Sticky save button */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 z-40 md:sticky md:bottom-0"
        style={{
          paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
          paddingTop: '12px',
          background: 'linear-gradient(to top, var(--bg) 70%, transparent)',
        }}
      >
        <div className="max-w-2xl mx-auto">
          {activeTab === 'morning' ? (
            <button
              onClick={handleSaveMorning}
              disabled={morningSaving}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all"
              style={{
                background: morningSaved ? 'var(--teal)' : morningSaving ? 'var(--text-muted)' : 'var(--primary)',
                boxShadow: morningSaved ? 'none' : 'var(--shadow-glow)',
              }}
            >
              {morningSaved ? '✓ Matin enregistré !' : morningSaving ? 'Enregistrement…' : 'Sauvegarder le check-in du matin'}
            </button>
          ) : (
            <button
              onClick={handleSaveEvening}
              disabled={eveningSaving}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all"
              style={{
                background: eveningSaved ? 'var(--teal)' : eveningSaving ? 'var(--text-muted)' : 'var(--primary)',
                boxShadow: eveningSaved ? 'none' : 'var(--shadow-glow)',
              }}
            >
              {eveningSaved ? '✓ Soir enregistré !' : eveningSaving ? 'Enregistrement…' : 'Sauvegarder le bilan du soir'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
