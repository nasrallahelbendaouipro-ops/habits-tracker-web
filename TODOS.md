# TODOs

## Phase 3: Full VAPID Push Stack

**Trigger:** Open the app on day 3 of the 14-day behavioral test. If you opened it 3 days
in a row without being reminded, proceed with Phase 3. If not, stop and diagnose why first.

**What to build:**
- `lib/push.ts`: extend with `subscribe()`, `unsubscribe()` using `PushManager` + VAPID public key
- `supabase/migrations/xxx_push_subscriptions.sql`: `UNIQUE (user_id, endpoint)` table + `notification_time TIME` column
- `supabase/functions/push-notify/index.ts`: Deno Edge Function, VAPID signing via `crypto.subtle`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (client env), `VAPID_PRIVATE_KEY` (server-only, never expose to client)
- Vercel Cron or `pg_cron` to trigger Edge Function at each user's `notification_time`
- Settings page: update notification toggle to call `subscribe()` when permission granted

**Key constraint:** VAPID signing in Deno Edge Function must use `crypto.subtle` — NOT the
`web-push` npm package (Node.js only, incompatible with Deno runtime). Fallback: `deno.land/x/web_push`.

Generate VAPID keys: `npx web-push generate-vapid-keys` (run locally, never commit private key).

**Reference:** Design docs in `~/.gstack/projects/nasrallahelbendaouipro-ops-habits-tracker-web/`
contain full schema and implementation specs for both the Phase 2 and Phase 3 stacks.
