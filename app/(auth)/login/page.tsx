'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    router.replace('/dashboard');
  }

  return (
    <div
      className="rounded-2xl p-8"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}
    >
      <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
        Sign in
      </h2>

      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm mb-4"
          style={{ background: 'rgba(255,107,107,0.12)', border: '1px solid rgba(255,107,107,0.3)', color: 'var(--error)' }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
            style={{
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
            style={{
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all mt-2"
          style={{
            background: loading ? 'var(--text-muted)' : 'var(--primary)',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="text-center text-sm mt-6" style={{ color: 'var(--text-secondary)' }}>
        Don&apos;t have an account?{' '}
        <Link href="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>
          Create one
        </Link>
      </p>
    </div>
  );
}
