# LifeOS

A habit tracker built around three dimensions — Body, Mind, Soul — with structured
routines, goal tracking, calendar planning (including Google Calendar sync), Apple
Health data ingestion, and an AI-assisted daily planner.

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
Build-only — no deploy step is wired in yet (see Deployment below).

## Deployment

**Status: not yet deployed.** Target is Vercel first (zero-config, matches this
Next.js setup already), with an AWS migration planned as a later, separate project —
don't add AWS-specific config (Dockerfile, ECS/Amplify setup) until that migration
actually starts.

To deploy:
1. Connect this GitHub repo to a new Vercel project.
2. Set all env vars from `.env.example` in the Vercel dashboard (production values —
   `SUPABASE_SERVICE_ROLE_KEY` and `GOOGLE_REDIRECT_URI` especially need real values,
   not local-dev ones).
3. Update the Google Cloud OAuth app's authorized redirect URI to match the
   production domain.
4. Set up free uptime monitoring (e.g. UptimeRobot, Better Uptime) against the live
   URL once deployed — there's nothing to monitor before that.

Vercel provides CDN/static-asset caching by default with zero extra configuration.
