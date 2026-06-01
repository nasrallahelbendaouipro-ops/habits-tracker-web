'use client';
import { useEffect } from 'react';
import { checkAndNotify } from '@/lib/push';

/** Runs the daily notification check on every authenticated page load. Renders nothing. */
export default function NotificationCheck() {
  useEffect(() => {
    checkAndNotify();
  }, []);
  return null;
}
