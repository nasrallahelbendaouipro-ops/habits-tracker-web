'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center"
      style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}
    >
      <div
        className="rounded-2xl px-6 py-8"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', maxWidth: 420 }}
      >
        <p style={{ color: 'var(--error)', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
          Something went wrong
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
          {error.message || 'An unexpected error occurred.'}
        </p>
        <button
          onClick={() => unstable_retry()}
          style={{
            background: 'var(--primary)',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
