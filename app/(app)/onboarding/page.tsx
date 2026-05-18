'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { createHabit, DIMENSION_ICONS } from '@/lib/habits';
import type { HabitDimension, HabitFormValues } from '@/lib/types';
import HabitForm from '@/components/habits/HabitForm';

const DIMENSION_DESC: Record<HabitDimension, string> = {
  body: 'Workouts, nutrition, sleep, physical metrics',
  mind: 'Reading, studying, learning, deep work',
  soul: 'Meditation, journaling, gratitude, prayer',
};

const DIMENSION_COLOR: Record<HabitDimension, string> = {
  body: 'var(--body)',
  mind: 'var(--mind)',
  soul: 'var(--soul)',
};

const SLIDE = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -40 },
  transition: { type: 'spring' as const, stiffness: 340, damping: 28 },
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [dimension, setDimension] = useState<HabitDimension | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  async function ensureUser() {
    if (userId) return userId;
    const { data } = await createClient().auth.getUser();
    const id = data.user?.id ?? null;
    setUserId(id);
    return id;
  }

  async function handleHabitSubmit(values: HabitFormValues) {
    const uid = await ensureUser();
    if (!uid) return;
    await createHabit({ ...values, user_id: uid });
    setStep(3);
  }

  function finish() {
    localStorage.setItem('onboarding_complete', '1');
    router.push('/dashboard');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 animate-fade-in" style={{ background: 'var(--bg)' }}>
      {/* Progress dots */}
      <div className="flex gap-2 mb-10">
        {([1, 2, 3] as const).map(s => (
          <div
            key={s}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: step === s ? 24 : 8,
              background: step >= s ? 'var(--primary)' : 'var(--border)',
            }}
          />
        ))}
      </div>

      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          {/* ── Step 1: Choose dimension ── */}
          {step === 1 && (
            <motion.div key="step1" {...SLIDE}>
              <h1 className="text-3xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>
                Welcome 👋
              </h1>
              <p className="text-base mb-8" style={{ color: 'var(--text-secondary)' }}>
                Where do you want to start your journey? Pick the dimension that matters most to you right now.
              </p>
              <div className="flex flex-col gap-3">
                {(['body', 'mind', 'soul'] as HabitDimension[]).map(dim => {
                  const active = dimension === dim;
                  const color = DIMENSION_COLOR[dim];
                  return (
                    <button
                      key={dim}
                      onClick={() => setDimension(dim)}
                      className="flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all"
                      style={{
                        background: active ? `color-mix(in srgb, ${color} 12%, var(--surface))` : 'var(--surface)',
                        border: `2px solid ${active ? color : 'var(--border)'}`,
                      }}
                    >
                      <span className="text-3xl">{DIMENSION_ICONS[dim]}</span>
                      <div>
                        <p className="font-bold text-base capitalize" style={{ color: active ? color : 'var(--text-primary)' }}>
                          {dim}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{DIMENSION_DESC[dim]}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => dimension && setStep(2)}
                disabled={!dimension}
                className="mt-8 w-full py-3.5 rounded-2xl font-bold text-white text-sm transition-all"
                style={{ background: dimension ? 'var(--primary)' : 'var(--border)', cursor: dimension ? 'pointer' : 'not-allowed' }}
              >
                Continue →
              </button>
            </motion.div>
          )}

          {/* ── Step 2: Create first habit ── */}
          {step === 2 && dimension && (
            <motion.div key="step2" {...SLIDE}>
              <h1 className="text-2xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>
                {DIMENSION_ICONS[dimension]} Create your first habit
              </h1>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                Start small. One habit is enough to build momentum.
              </p>
              <HabitForm
                initial={{ dimension, type: dimension === 'body' ? 'workout' : dimension === 'mind' ? 'reading' : 'meditation' }}
                onSubmit={handleHabitSubmit}
                submitLabel="Create habit →"
              />
              <button
                onClick={() => setStep(1)}
                className="mt-3 w-full py-2 text-sm font-medium rounded-xl transition-all"
                style={{ color: 'var(--text-muted)', background: 'transparent' }}
              >
                ← Back
              </button>
            </motion.div>
          )}

          {/* ── Step 3: All set ── */}
          {step === 3 && (
            <motion.div key="step3" {...SLIDE} className="text-center">
              <div className="text-7xl mb-6">🎯</div>
              <h1 className="text-3xl font-black mb-3" style={{ color: 'var(--text-primary)' }}>
                You&apos;re ready!
              </h1>
              <p className="text-base mb-8" style={{ color: 'var(--text-secondary)' }}>
                Your first habit is set. Track it daily, build your streak, and watch your Discipline Score grow.
              </p>
              <button
                onClick={finish}
                className="px-8 py-4 rounded-2xl font-bold text-white text-base transition-all"
                style={{ background: 'var(--primary)', boxShadow: 'var(--shadow-glow)' }}
              >
                Go to Dashboard →
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
