'use client';

import { useLocale } from '@/lib/i18n';

export default function PlannerPage() {
  const { t } = useLocale();
  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>{t.nav_planner}</h1>
      <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="text-4xl mb-4">🤖</div>
        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t.planner_coming}</p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{t.planner_desc}</p>
      </div>
    </div>
  );
}
