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
- **Framer Motion**, **FullCalendar**, **Recharts**, **lucide-react**.

### Route Groups
- `app/(auth)/` — unauthenticated pages (login, register). Layout centers content on screen.
- `app/(app)/` — authenticated pages (dashboard, habits, calendar, analytics, planner, settings). Layout in `app/(app)/layout.tsx` checks Supabase auth server-side and redirects to `/login` if no session. Renders `<Sidebar>` + `<BottomNav>`.
- `app/api/parse-shift/route.ts` — POST endpoint that parses work shift text. Uses OpenAI GPT-4o if `OPENAI_API_KEY` is set, otherwise falls back to a regex-based parser that handles French roster format (VandB-style) and generic inline formats.
- `middleware.ts` — Next.js middleware entry point; re-exports auth logic from `proxy.ts`. Redirects unauthenticated users to `/login` and authenticated users away from auth pages. Rate limiting for `/api/parse-shift` (10 req/min per IP) is handled inside that route.

### Data Layer (`lib/`)
All Supabase queries in `lib/habits.ts`, `lib/calendar.ts`, and `lib/analytics.ts` use the **browser client** (`lib/supabase/client.ts`) and are called from Client Components.

- `lib/types.ts` — all shared TypeScript types. `HabitType` is `'simple' | 'workout' | 'reading' | 'study' | 'shift'`; each non-simple type has a corresponding `*Metadata` shape stored in `habits.metadata`.
- `lib/utils.ts` — `cn()` (clsx + tailwind-merge), date helpers (`TODAY`, `dateStr(daysAgo)`, `toISODate`).
- `lib/theme.tsx` — `ThemeProvider` + `useTheme()`. Theme persisted in `localStorage` as `app_theme`; applied via `data-theme` attribute on `<html>`.

### Styling
Design tokens live in `globals.css` as CSS custom properties (`--bg`, `--surface`, `--primary`, `--text-primary`, etc.). Use `var(--token)` for inline styles or CSS. The `.glass` utility class applies glassmorphism. Both dark (default) and light overrides are defined; do not hardcode colors.

### Habit Types
Each habit has a `type` field. `'simple'` has no metadata. The other types render type-specific subforms (`WorkoutForm`, `ReadingForm`, `StudyForm`, `ShiftForm`) inside `HabitModal` → `HabitForm` → `TypePicker`.

### Environment Variables
Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Optional:
- `OPENAI_API_KEY` — enables AI-powered shift parsing in `/api/parse-shift`

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
