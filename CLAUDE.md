# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev       # Start dev server on localhost:3000
npm run build     # Production build
npm run start     # Start production server
```

There is no lint or test script configured.

## Architecture

### Stack
- **Next.js 16.2.6** with React 19 — see AGENTS.md: this version has breaking changes vs training data. Read `node_modules/next/dist/docs/` before writing code.
- **Tailwind CSS v4** — CSS-first config. There is no `tailwind.config.js`; all configuration lives in `globals.css` via `@import "tailwindcss"` and `@theme inline {}`.
- **Supabase** (`@supabase/ssr`) for auth and database. Two clients: `lib/supabase/client.ts` (browser) and `lib/supabase/server.ts` (async Server Component, uses `cookies()`).
- **Framer Motion** — page/card animations. **FullCalendar** — calendar view. **Recharts** — analytics charts. **lucide-react** — all icons (no emoji icons in nav).
- **nanoid** — used for generating task IDs inside routine JSONB.

### Route Groups

**`app/(auth)/`** — unauthenticated pages (login, register). Layout centers content on screen.

**`app/(app)/`** — authenticated pages. Layout in `app/(app)/layout.tsx` checks Supabase auth server-side and redirects to `/login` if no session. Renders `<Sidebar>` (desktop) + `<BottomNav>` (mobile).

| Route | Purpose |
|---|---|
| `/dashboard` | Today's plan: routines for today + habit check-ins + goals summary |
| `/checkin` | Daily mood/energy/focus check-in |
| `/habits` | Habit list, create/edit/delete |
| `/habits/[id]` | Individual habit detail |
| `/routines` | Routine list (Sport / Data / Custom categories) |
| `/routines/new` | Create routine |
| `/routines/[id]` | Routine detail + Start Session CTA |
| `/routines/[id]/edit` | Edit routine |
| `/routines/[id]/session` | In-session checklist — live task tracking |
| `/goals` | Goals with linked habits and completion rates |
| `/body` | Body metrics + Apple Health sync (steps, sleep, HR, HRV, calories, weight) |
| `/mind` | Digital mind / focus tracking |
| `/soul` | Soul growth tracking |
| `/analytics` | Charts: streaks, weekly consistency, discipline score |
| `/planner` | AI-powered daily planner (OpenAI GPT-4o) |
| `/calendar` | Calendar with Google Calendar integration |
| `/settings` | Profile, notifications (anchor time picker), theme |

**API routes:**
- `app/api/parse-shift/route.ts` — POST, parses French VandB roster format. Uses GPT-4o if `OPENAI_API_KEY` set, otherwise regex fallback. Rate-limited 10 req/min/IP.
- `app/api/health/ingest/route.ts` — POST, receives Apple Health data from iOS Shortcuts (steps, sleep, HR, HRV, calories, body weight).
- `app/api/health/token/route.ts` — issues auth tokens for the iOS Shortcut health sync.
- `app/api/google-calendar/events/route.ts` — fetches Google Calendar events for the authenticated user.
- `app/api/auth/google/callback/route.ts` — Google OAuth callback.
- `app/api/planner/route.ts` — POST, generates AI daily plan.

**`middleware.ts`** — re-exports auth logic from `proxy.ts`. Redirects unauthenticated → `/login`, authenticated away from auth pages.

### Data Layer (`lib/`)

All Supabase queries use the **browser client** (`lib/supabase/client.ts`) and are called from Client Components.

| File | Purpose |
|---|---|
| `lib/types.ts` | All shared TypeScript types (see Types section below) |
| `lib/utils.ts` | `cn()` (clsx + tailwind-merge), `TODAY`, `dateStr(daysAgo)`, `toISODate()` |
| `lib/theme.tsx` | `ThemeProvider` + `useTheme()`. Persisted in `localStorage` as `app_theme`; applied via `data-theme` on `<html>` |
| `lib/i18n.tsx` | `useLocale()`, translation strings for en/fr/ar, `getGreeting()`, `LOCALE_DATE_TAG` |
| `lib/habits.ts` | Habit CRUD, `fetchHabitsWithStatus()`, `toggleHabit()`, streak calculation |
| `lib/routines.ts` | Routine CRUD + session management: `getTodaysRoutines()`, `upsertSession()`, `updateSessionTasks()`, `completeSession()` |
| `lib/calendar.ts` | Calendar event CRUD, Google Calendar fetch |
| `lib/analytics.ts` | `fetchWeeklyConsistency()`, `fetchDisciplineScore()`, `fetchDimensionScores()` |
| `lib/goals.ts` | Goal CRUD, `fetchGoals()` with linked habits and completion rates |
| `lib/health-readings.ts` | Apple Health data fetch and aggregation |
| `lib/push.ts` | Push notification permission helpers, `checkAndNotify()`, anchor-time dedup via localStorage |
| `lib/chart-theme.ts` | Recharts theme hook aligned with CSS design tokens |

### Types (`lib/types.ts`)

**Habit types:** `'simple' | 'workout' | 'reading' | 'study' | 'shift' | 'meditation' | 'prayer' | 'journaling' | 'body_metric'`

Each non-simple type has a `*Metadata` shape stored in `habits.metadata` JSONB. Type-specific subforms render inside `HabitModal → HabitForm → TypePicker`.

**Routine task types:** `'reps' | 'time' | 'bilateral' | 'resource'`
- `bilateral` tasks render two checkboxes (Right + Left) tracked as `taskId:right` / `taskId:left` in `completed_task_ids[]`.
- `resource` tasks render as external links — not trackable.

**Key types:**
- `Routine` — `{ id, user_id, name, category, icon?, color?, schedule_days: number[], tasks: RoutineTask[], created_at }`
- `RoutineTask` — `{ id, section?, name, type, sets?, reps?, duration_min?, note?, resources? }`
- `RoutineSession` — `{ id, user_id, routine_id, date, completed_task_ids: string[], completed_at? }`
- `RoutineWithSession` — `Routine & { todaySession?: RoutineSession }`
- `CalendarEvent` — includes `linked_habit_ids: string[]` and `google_event_id?`
- `Goal` / `GoalWithHabits` — goals with linked habits and aggregate completion rate

### Supabase Tables

| Table | Purpose |
|---|---|
| `habits` | Habit definitions |
| `habit_logs` | Per-day completion records |
| `calendar_events` | App-created events (manual + AI-parsed shifts) |
| `goals` | Goal definitions |
| `goal_habits` | Goal ↔ habit join table |
| `health_readings` | Apple Health data (steps, sleep, HR, HRV, calories, weight) |
| `routines` | Routine definitions with `tasks JSONB` and `schedule_days INTEGER[]` |
| `routine_sessions` | Per-day session completion with `completed_task_ids TEXT[]`. UNIQUE on `(user_id, routine_id, date)` |

All tables use Row Level Security — every query is scoped to `auth.uid() = user_id`.

### PWA

- `app/manifest.ts` — Next.js route that serves the Web App Manifest (makes app installable).
- `public/sw.js` — Hand-written service worker. Caches app shell; `_next/` assets always network-first. No `clients.claim()` to avoid disrupting open tabs.
- `components/pwa/ServiceWorkerRegistration.tsx` — registers SW on load.
- `components/pwa/NotificationCheck.tsx` — fires `checkAndNotify()` on every authenticated page to deliver anchor-time local notifications.

### Navigation

Sidebar (desktop) and BottomNav (mobile) both use **Lucide icons** — no emoji in nav items. Adding a new page requires updating both:
- `components/layout/Sidebar.tsx` — import the icon from `lucide-react`, add to `NAV_ITEMS` array with `{ href, Icon, label }`.
- `components/layout/BottomNav.tsx` — same pattern. Typed `NavItem` union: use `labelKey` for i18n keys or `staticLabel` for hardcoded strings.

### Styling

Design tokens live in `globals.css` as CSS custom properties: `--bg`, `--surface`, `--surface-elevated`, `--surface-hover`, `--primary`, `--primary-muted`, `--secondary`, `--text-primary`, `--text-secondary`, `--text-muted`, `--border`, `--teal`, `--error`, `--body`, `--mind`, `--soul`, `--shadow-glow`.

Use `var(--token)` for inline styles. Never hardcode colors. The `.glass` utility class applies glassmorphism. Dark mode is default; light mode overrides are defined in `globals.css`.

### Routines Feature (added 2026-06-02)

Routines are structured sessions (sport or data) scheduled by day-of-week. They appear on the dashboard under "Today's Routines" and support live in-session task tracking.

Key files: `lib/routines.ts`, `components/routines/` (5 components), `app/(app)/routines/` (5 pages).

Seed script: `scripts/seed-routines.ts` — populates initial routines for a user. Run with env vars set (see script header). The 9 default routines (4 sport + 5 data) are pre-seeded in the Supabase DB for the primary user.

### Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Optional:
- `OPENAI_API_KEY` — enables AI shift parsing (`/api/parse-shift`) and AI planner (`/api/planner`)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google Calendar OAuth
- `HEALTH_INGEST_SECRET` — auth token for iOS Shortcut health sync

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
