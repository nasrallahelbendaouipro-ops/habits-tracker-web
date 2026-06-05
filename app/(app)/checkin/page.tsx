'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchHabitsWithStatus, toggleHabit, DIMENSION_ICONS } from '@/lib/habits';
import { fetchCheckin, upsertCheckin, type BodyMetrics, type MindMetrics, type SoulMetrics } from '@/lib/checkin';
import { TODAY } from '@/lib/utils';
import type { HabitWithStreak } from '@/lib/types';
import GlassCard from '@/components/ui/GlassCard';

const DIM_COLOR = { body: 'var(--body)', mind: 'var(--mind)', soul: 'var(--soul)' };

// ─── Rating Picker (1–10 integer scales) ──────────────────────────────────────

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
              className="flex-1 h-8 rounded-lg text-xs font-bold transition-all"
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

// ─── Metric Input (continuous decimal values) ─────────────────────────────────

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
          className="w-20 px-2 py-1.5 rounded-lg text-sm text-right outline-none transition-all"
          style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
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
    <div
      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
      style={{ background: habit.completedToday ? dimColor + '12' : 'var(--surface-elevated)', border: `1px solid ${habit.completedToday ? dimColor + '40' : 'var(--border)'}` }}
      onClick={onToggle}
    >
      <span className="text-lg">{habit.icon}</span>
      <span className="flex-1 text-sm font-medium" style={{ color: habit.completedToday ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: habit.completedToday ? 'line-through' : 'none' }}>
        {habit.name}
      </span>
      {habit.streak > 0 && <span className="text-[10px]" style={{ color: 'var(--secondary)' }}>🔥{habit.streak}d</span>}
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
        style={{ background: habit.completedToday ? dimColor : 'transparent', border: `2px solid ${habit.completedToday ? dimColor : 'var(--border)'}` }}
      >
        {habit.completedToday && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" className="animate-check-draw">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </div>
  );
}

// ─── Score Ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score, color, label }: { score: number; color: string; label: string }) {
  const r = 28, c = 2 * Math.PI * r;
  const dash = (score / 10) * c;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
          <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={`${dash} ${c}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.7s' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-bold" style={{ color }}>{score}</span>
        </div>
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color }}>{label}</span>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CheckInPage() {
  const [userId, setUserId]   = useState<string | null>(null);
  const [habits, setHabits]   = useState<HabitWithStreak[]>([]);
  const [saved, setSaved]     = useState(false);
  const [saving, setSaving]   = useState(false);

  const [body, setBody] = useState<BodyMetrics>({});
  const [mind, setMind] = useState<MindMetrics>({});
  const [soul, setSoul] = useState<SoulMetrics>({});
  const [notes, setNotes] = useState('');

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => { if (data.user) setUserId(data.user.id); });
  }, []);

  const load = useCallback(async () => {
    if (!userId) return;
    const [habitsData, checkin] = await Promise.all([
      fetchHabitsWithStatus(userId, TODAY),
      fetchCheckin(userId, TODAY),
    ]);
    setHabits(habitsData);
    if (checkin) {
      setBody(checkin.body_metrics ?? {});
      setMind(checkin.mind_metrics ?? {});
      setSoul(checkin.soul_metrics ?? {});
      setNotes(checkin.notes ?? '');
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

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await upsertCheckin(userId, TODAY, body, mind, soul, notes || undefined);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const bodyHabits  = habits.filter(h => h.dimension === 'body');
  const mindHabits  = habits.filter(h => h.dimension === 'mind');
  const soulHabits  = habits.filter(h => h.dimension === 'soul');

  const bodyDone  = bodyHabits.filter(h => h.completedToday).length;
  const mindDone  = mindHabits.filter(h => h.completedToday).length;
  const soulDone  = soulHabits.filter(h => h.completedToday).length;

  const dimScore = (done: number, total: number) => total === 0 ? 0 : Math.round((done / total) * 10);

  const now = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Today's Check-In</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{now}</p>
      </div>

      {/* Dimension overview rings */}
      <GlassCard className="mb-5">
        <div className="flex items-center justify-around">
          <ScoreRing score={dimScore(bodyDone, bodyHabits.length)} color="var(--body)" label="Body" />
          <ScoreRing score={dimScore(mindDone, mindHabits.length)} color="var(--mind)" label="Mind" />
          <ScoreRing score={dimScore(soulDone, soulHabits.length)} color="var(--soul)" label="Soul" />
        </div>
      </GlassCard>

      {/* BODY section */}
      <GlassCard className="mb-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">{DIMENSION_ICONS.body}</span>
          <h2 className="font-bold text-sm uppercase tracking-widest" style={{ color: 'var(--body)' }}>Body</h2>
          <span className="ml-auto text-xs font-semibold" style={{ color: 'var(--body)' }}>{bodyDone}/{bodyHabits.length} habits</span>
        </div>
        {bodyHabits.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            {bodyHabits.map(h => <HabitRow key={h.id} habit={h} onToggle={() => handleToggle(h)} />)}
          </div>
        )}
        <div className="flex flex-col gap-4" style={{ borderTop: bodyHabits.length > 0 ? '1px solid var(--border)' : 'none', paddingTop: bodyHabits.length > 0 ? '16px' : 0 }}>
          <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--body)' }}>Body Metrics</p>
          <MetricInput label="Weight" value={body.weight} onChange={v => setBody(b => ({ ...b, weight: v }))} unit="kg" min={20} max={300} step={0.1} />
          <MetricInput label="Sleep" value={body.sleep_hours} onChange={v => setBody(b => ({ ...b, sleep_hours: v }))} unit="hrs" min={0} max={24} step={0.5} />
          <RatingPicker label="Mood" value={body.mood} onChange={v => setBody(b => ({ ...b, mood: v }))} color="var(--body)" hint="1 = very low  ·  10 = excellent" />
        </div>
      </GlassCard>

      {/* MIND section */}
      <GlassCard className="mb-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">{DIMENSION_ICONS.mind}</span>
          <h2 className="font-bold text-sm uppercase tracking-widest" style={{ color: 'var(--mind)' }}>Mind</h2>
          <span className="ml-auto text-xs font-semibold" style={{ color: 'var(--mind)' }}>{mindDone}/{mindHabits.length} habits</span>
        </div>
        {mindHabits.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            {mindHabits.map(h => <HabitRow key={h.id} habit={h} onToggle={() => handleToggle(h)} />)}
          </div>
        )}
        <div className="flex flex-col gap-4" style={{ borderTop: mindHabits.length > 0 ? '1px solid var(--border)' : 'none', paddingTop: mindHabits.length > 0 ? '16px' : 0 }}>
          <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--mind)' }}>How do you feel mentally?</p>
          <RatingPicker label="Energy" value={mind.energy} onChange={v => setMind(m => ({ ...m, energy: v }))} color="var(--mind)" hint="1 = exhausted  ·  10 = fully energised" />
          <RatingPicker label="Focus" value={mind.focus} onChange={v => setMind(m => ({ ...m, focus: v }))} color="var(--mind)" hint="1 = scattered  ·  10 = laser focused" />
          <RatingPicker label="Motivation" value={mind.motivation} onChange={v => setMind(m => ({ ...m, motivation: v }))} color="var(--mind)" hint="1 = no drive  ·  10 = highly motivated" />
        </div>
      </GlassCard>

      {/* SOUL section */}
      <GlassCard className="mb-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">{DIMENSION_ICONS.soul}</span>
          <h2 className="font-bold text-sm uppercase tracking-widest" style={{ color: 'var(--soul)' }}>Soul</h2>
          <span className="ml-auto text-xs font-semibold" style={{ color: 'var(--soul)' }}>{soulDone}/{soulHabits.length} habits</span>
        </div>
        {soulHabits.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            {soulHabits.map(h => <HabitRow key={h.id} habit={h} onToggle={() => handleToggle(h)} />)}
          </div>
        )}
        <div className="flex flex-col gap-4" style={{ borderTop: soulHabits.length > 0 ? '1px solid var(--border)' : 'none', paddingTop: soulHabits.length > 0 ? '16px' : 0 }}>
          <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--soul)' }}>Inner Metrics</p>
          <RatingPicker label="Gratitude" value={soul.gratitude_score} onChange={v => setSoul(s => ({ ...s, gratitude_score: v }))} color="var(--soul)" hint="1 = not grateful  ·  10 = deeply grateful" />
          <RatingPicker label="Meditation quality" value={soul.meditation_quality} onChange={v => setSoul(s => ({ ...s, meditation_quality: v }))} color="var(--soul)" />
          <RatingPicker label="Stress level" value={soul.stress_level} onChange={v => setSoul(s => ({ ...s, stress_level: v }))} color="#f97316" hint="1 = very calm  ·  10 = very stressed" />
        </div>
      </GlassCard>

      {/* Notes */}
      <GlassCard className="mb-24">
        <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
          Daily notes <span style={{ color: 'var(--text-disabled)' }}>(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="How was your day? Any thoughts or reflections…"
          rows={3}
          className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none transition-all"
          style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
        />
      </GlassCard>

      {/* Sticky save button */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 pb-safe z-40 md:sticky md:bottom-0"
        style={{
          paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
          paddingTop: '12px',
          background: 'linear-gradient(to top, var(--bg) 70%, transparent)',
        }}
      >
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all"
            style={{
              background: saved ? 'var(--success)' : saving ? 'var(--text-muted)' : 'var(--primary)',
              boxShadow: saved ? 'none' : 'var(--shadow-glow)',
            }}
          >
            {saved ? '✓ Check-in saved!' : saving ? 'Saving…' : "Save Today's Check-In"}
          </button>
        </div>
      </div>
    </div>
  );
}
