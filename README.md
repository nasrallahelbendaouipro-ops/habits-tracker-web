# LifeOS

A habit tracker built around three dimensions — Body, Mind, Soul — with structured
routines, goal tracking, calendar planning (including Google Calendar sync), Apple
Health data ingestion, and an AI-assisted daily planner.

🔗 **Live:** <https://habits-tracker-web-gy38.vercel.app> (sign-in required — it
tracks personal data, so there is no public demo account)

See [CLAUDE.md](./CLAUDE.md) for the full architecture reference (route map, data
layer, Supabase schema, styling conventions) and [AGENTS.md](./AGENTS.md) for a note
on Next.js version-specific behavior in this repo.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

See [.env.example](./.env.example) for the full list. At minimum you need:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from your Supabase project settings
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase dashboard → Settings → API (required for `/api/health/ingest`)

Everything else (Google Calendar OAuth, OpenAI, Upstash rate limiting, Sentry) is
optional — each feature falls back to a degraded-but-working mode when its env vars
are unset (see CLAUDE.md's Environment Variables section for specifics).

### Database

Schema lives in `supabase/migrations/`. Apply changes via the Supabase MCP
`apply_migration` tool AND commit the same SQL as a file here in the same commit —
see CLAUDE.md's "Database migrations" section. `list_migrations` on the live project
should always match this folder 1:1.

**Backups:** check Supabase dashboard → Database → Backups and confirm your billing
tier includes the retention you need before real user data goes live — the free tier
has limited/no point-in-time recovery.

## Scripts

```bash
npm run dev        # dev server on :3000
npm run build      # production build (also type-checks)
npm run start       # start a production build
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
```

## CI

`.github/workflows/ci.yml` runs `lint` + `build` on every push/PR to `my-feature-branch`.
CI runs lint, type-check and build on every push (see `.github/workflows/ci.yml`).
Deploys are handled by Vercel's GitHub integration, not by CI (see Deployment below).

## Deployment

**Status: deployed on Vercel** at
<https://habits-tracker-web-gy38.vercel.app>, built from this repo's default
branch via Vercel's GitHub integration. Vercel provides CDN and static-asset
caching by default, with no extra configuration.

An AWS migration is planned as a later, separate project — don't add
AWS-specific config (Dockerfile, ECS/Amplify setup) until that migration
actually starts.

Environment variables are set in the Vercel dashboard from the list in
[.env.example](./.env.example), with production values — `SUPABASE_SERVICE_ROLE_KEY`
and `GOOGLE_REDIRECT_URI` in particular hold real production values there, not
local-dev ones. The Google Cloud OAuth app's authorized redirect URI points at
the production domain.

Still open: no uptime monitoring is wired up yet (e.g. UptimeRobot, Better
Uptime) against the live URL.
