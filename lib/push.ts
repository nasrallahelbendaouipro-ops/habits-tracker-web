/**
 * lib/push.ts — Phase 2 client-side notification helpers.
 *
 * Phase 2: localStorage-based anchor-time notification (fires on app open only).
 * Phase 3 (after day-3 gate): will extend with subscribe()/unsubscribe() + VAPID.
 *
 * localStorage keys:
 *   anchor_time         — "HH:MM" (local time), default "08:00"
 *   notifications_enabled — "true" when user has granted permission
 *   last_notified_date  — "YYYY-MM-DD", dedup: one notification per day
 */

export function getPermissionState(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'default';
  return Notification.permission;
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  return Notification.requestPermission();
}

/**
 * Parses a stored anchor time string.
 * Returns { h, m } in local time. Falls back to 08:00 on any parse failure.
 */
function parseAnchorTime(value: string | null): { h: number; m: number } {
  if (!value || !/^\d{1,2}:\d{2}$/.test(value)) return { h: 8, m: 0 };
  const [h, m] = value.split(':').map(Number);
  if (isNaN(h) || isNaN(m) || h > 23 || m > 59) return { h: 8, m: 0 };
  return { h, m };
}

/**
 * Called on every authenticated app open via <NotificationCheck />.
 * Shows at most one notification per calendar day after the stored anchor time.
 *
 * Fires only when the app is open — this is intentional for Phase 2.
 * Phase 3 VAPID push will fire proactively from the server.
 */
export function checkAndNotify(): void {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  if (localStorage.getItem('last_notified_date') === today) return; // already notified today

  const { h, m } = parseAnchorTime(localStorage.getItem('anchor_time'));
  const now = new Date();
  const anchor = new Date();
  anchor.setHours(h, m, 0, 0);

  if (now >= anchor) {
    new Notification('LifeOS — Time to check in', {
      body: 'Log your habits for today.',
      icon: '/icon-192.png',
    });
    localStorage.setItem('last_notified_date', today);
  }
}
