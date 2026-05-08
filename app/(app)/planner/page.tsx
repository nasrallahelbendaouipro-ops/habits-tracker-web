export default function PlannerPage() {
  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>AI Planner</h1>
      <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="text-4xl mb-4">🤖</div>
        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Coming in Phase 7</p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>AI smart scheduling — requires OpenAI API key</p>
      </div>
    </div>
  );
}
