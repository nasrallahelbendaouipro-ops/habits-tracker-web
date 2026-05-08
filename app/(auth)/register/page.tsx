'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setSuccess(true);
  }

  if (success) {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}
      >
        <div className="text-4xl mb-4">🎉</div>
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Account created!</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Check your email for a confirmation link, then sign in.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-3 rounded-xl font-semibold text-sm text-white"
          style={{ background: 'var(--primary)' }}
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-8"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}
    >
      <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
        Create account
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
        {[
          { label: 'Email', type: 'email', value: email, onChange: setEmail, placeholder: 'you@example.com' },
          { label: 'Password', type: 'password', value: password, onChange: setPassword, placeholder: '6+ characters' },
          { label: 'Confirm password', type: 'password', value: confirm, onChange: setConfirm, placeholder: '••••••••' },
        ].map(({ label, type, value, onChange, placeholder }) => (
          <div key={label}>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              {label}
            </label>
            <input
              type={type}
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder={placeholder}
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
        ))}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all mt-2"
          style={{
            background: loading ? 'var(--text-muted)' : 'var(--primary)',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="text-center text-sm mt-6" style={{ color: 'var(--text-secondary)' }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
