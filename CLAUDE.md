# Shown Media Dashboard

## Overview
Two-platform dashboard combining **Social Watch** (Twitter/X monitoring) and **Post Tracker** (post performance tracking). Deployed on Vercel with a shared dark UI theme.

**Live URL**: https://social-watch-mu.vercel.app
**Login**: Supabase magic link (email must be `@shownmedia.com`)

## Platforms

### Social Watch
Twitter/X monitoring that surfaces viral launches, memes, and individual user posts. Cron job fetches tweets every 2 hours.
- **Pages**: `/dashboard`, `/dashboard/launch-videos`, `/dashboard/memes`, `/dashboard/users/[handle]`
- **Data**: Neon Postgres via Drizzle ORM

### Post Tracker
Track individual tweet performance over time with 50 checkpoints (15min to 48hr). Charts, benchmarks, and trajectory analysis.
- **Page**: `/post-tracker` (single page with 4 tabs: Active, Trajectory, History, Benchmark)
- **Data**: Python backend (Railway) → Google Sheets → Dashboard reads via API
- **Backend URL**: `https://backend-production-3069.up.railway.app` (Mitchell's Railway deployment)
- **Backend repo**: Not part of this repo — lives separately

## Auth
**Supabase magic link login** — users enter their `@shownmedia.com` email at `/login`, receive a sign-in link via email, click it to authenticate.
- **Provider**: Supabase (`@supabase/ssr` + `@supabase/supabase-js`)
- **Allowed domains**: Only `@shownmedia.com` emails (configured in `src/lib/auth.ts`)
- **Flow**: Email → magic link → `/auth/callback` exchanges code for session → redirect to destination
- **Middleware** (`src/middleware.ts`): Uses Supabase SSR to check session on every route. Protects ALL routes except `/login`, `/tutorial`, `/auth/callback`, `/api/auth/*`, `/api/cron/*`
- **Post Tracker password**: After Supabase login, `AuthSetup` component auto-fetches PT password from `/api/auth/session` and stores in localStorage
- **Logout**: Calls Supabase `signOut()` via `/api/auth/logout`
- **Legacy**: The old password endpoint (`/api/auth/login`) returns 410 Gone

## Tech Stack
- **Framework**: Next.js 16 (App Router, TypeScript, Turbopack)
- **Auth**: Supabase (`@supabase/ssr` + `@supabase/supabase-js`) — magic link OTP
- **Database**: Neon Postgres (`@neondatabase/serverless` + `drizzle-orm/neon-http`)
- **Styling**: Tailwind CSS v4 — dark black/charcoal theme (PT design language)
- **Charts**: Recharts (Post Tracker trajectory/benchmark charts)
- **Twitter**: API v2 Pro tier (`GET /2/tweets/search/recent`) — 1M tweets/month cap
- **Deployment**: Vercel (Pro plan — cron every 2 hours)

## UI Theme
Pure black background (#000000) with dark charcoal panels (#111214), subtle borders (#2a2d32), Twitter blue accent (#1d9bf0). Inter font throughout.

## Project Structure
```
src/
  app/
    dashboard/        # Social Watch pages
    post-tracker/     # Post Tracker page
    admin/            # Admin panel (light theme)
    login/            # Magic link login page
    tutorial/         # Public tutorial page (no login required)
    onboarding/       # Onboarding flow
    auth/callback/    # Supabase auth callback (exchanges code for session)
    api/
      auth/
        login/        # Legacy endpoint (returns 410)
        logout/       # Supabase signOut
        magic-link/   # Sends OTP magic link email
        session/      # Returns auth status + PT password
      cron/           # Twitter fetch cron
  components/
    platform-header.tsx   # Top nav: Social Watch | Post Tracker | Claude Bot
    auth-setup.tsx        # Auto-fetches PT password after Supabase login
    sidebar-nav.tsx       # Social Watch sidebar
    tweet-card.tsx        # Social Watch tweet cards
    tweet-feed.tsx        # Social Watch tweet feed
    time-filter-tabs.tsx  # Time filter component
    post-tracker/         # Post Tracker components
      PostCard.tsx
      PostDetail.tsx
      TrajectoryChart.tsx
      PostsTable.tsx
      AddPostForm.tsx
      ConfidenceIndicator.tsx
  lib/
    post-tracker-api.ts   # Post Tracker API client
    auth.ts               # Email domain allowlist (isAllowedEmail)
    twitter.ts            # Twitter API client
    utils.ts              # Shared utilities
    constants.ts          # Meme accounts + launch video seed queries
    supabase/
      client.ts           # Browser Supabase client
      server.ts           # Server Supabase client (cookies)
  db/                     # Drizzle schema + connection
.claude/
  commands/
    dev-bot.md            # Dev Bot skill (shared via git)
    deploy.md             # Deploy checklist skill
    setup.md              # First-time setup skill
```

## Database
- **Provider**: Neon (project: `lively-bird-16721597`, region: `aws-us-east-1`)
- **Connection**: `@neondatabase/serverless` with lazy proxy pattern
- **Schema**: 7 tables in `src/db/schema.ts`
- **Drizzle config**: `drizzle.config.ts`, push with `npx drizzle-kit push`

## Key Architecture Decisions

### Middleware (`src/middleware.ts`)
- Uses `@supabase/ssr` `createServerClient` to check Supabase session
- Protects ALL routes except `/login`, `/tutorial`, `/auth/callback`, `/api/auth/*`, `/api/cron/*`
- Redirects unauthenticated users to `/login?from=<path>` (preserves destination)
- Also checks `isAllowedEmail` — even with valid Supabase session, email must be `@shownmedia.com`
- Static assets (favicon.ico, favicon.svg, logo.svg) excluded from matcher

### Twitter API v2 Limitations
- `min_faves` operator does NOT work in API — must strip and post-filter
- `since:` is not valid — use `start_time` API parameter instead
- Pro tier: 1M tweets/month cap (resets day 6 of each month) — use `since_id` tracking to avoid duplicates
- Bearer token contains URL-encoded chars — intentional, do not decode

### Cron Job (`/api/cron/search`)
- Runs every 2 hours via Vercel Cron (`vercel.json`, schedule: `0 */2 * * *`)
- Supports both GET (Vercel cron) and POST requests
- Uses `since_id` to avoid re-fetching old tweets; auto-clears stale `since_id` on error
- Detects `CreditsDepleted`/429/402 errors and skips remaining queries immediately

## Environment Variables (on Vercel)

### Auth (Supabase)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key

### Social Watch
- `DATABASE_URL` — Neon connection string
- `APIFY_TOKEN` — Apify API token used for X scraping
- `APIFY_TWITTER_ACTOR` — optional override for the X scraper actor (`scrape.badger/twitter-tweets-scraper` by default)
- `ENABLE_MEME_SEARCHES` — set to `true` to run meme queries; default behavior leaves memes off
- `CRON_SECRET` — bearer token for cron endpoint auth

### Post Tracker
- `NEXT_PUBLIC_POST_TRACKER_API_URL` — Railway backend URL
- `POST_TRACKER_API_PASSWORD` — API password for PT backend (fetched via `/api/auth/session` after login)

### Legacy (still on Vercel, can be removed)
- `ADMIN_PASSWORD` — old password login, no longer used
- `ADMIN_SESSION_SECRET` — old HMAC signing key, no longer used

## Working Style

**Operate autonomously — do not ask for confirmation before acting.** Mitchell always accepts. Just do the work: commit, push, deploy, whatever the task requires. Only pause if something is genuinely irreversible and catastrophic (e.g. dropping the production database with no backup). For everything else — git pushes, Vercel deploys, file edits, schema changes — proceed without asking.

## Collaboration

### GitHub
- **Repo**: `AlejandroShown/social-watch` (private)
- **Collaborators**: Alejandro (`AlejandroShown`), Mitchell (`mitchell-bit`)
- **Branch**: `main`

### Workflow for collaborators
1. `git pull` before starting any work
2. Make changes
3. `git add` + `git commit` + `git push`
4. If push fails (someone else pushed), run `git pull --rebase` then push again

## Deployment Checklist (MANDATORY)

**Claude Code MUST follow this checklist on every deploy. No exceptions.**

### Pre-deploy checks (before `vercel --prod`)
1. **Pull latest** — `git pull` to ensure no remote changes will conflict
2. **Build clean** — `npx next build` must pass with zero errors
3. **No uncommitted changes** — `git status` must show clean working tree or only staged changes

### Post-deploy checks (after `vercel --prod` succeeds)
1. **Login page loads** — `curl -s -o /dev/null -w "%{http_code}" https://social-watch-mu.vercel.app/login` returns 200
2. **Auth configured** — `curl -s https://social-watch-mu.vercel.app/api/auth/session` returns `{"error":"Unauthorized"}` with status 401 (proves Supabase is wired up)
3. **Social Watch loads** — `curl -s -o /dev/null -w "%{http_code}" https://social-watch-mu.vercel.app/dashboard` returns 200 or 307 (redirect to login is OK)
4. **Post Tracker loads** — `curl -s -o /dev/null -w "%{http_code}" https://social-watch-mu.vercel.app/post-tracker` returns 200 or 307
5. **PT backend reachable** — `curl -s https://backend-production-3069.up.railway.app/api/health` returns `{"status":"healthy"}`
6. **Tutorial loads** — `curl -s -o /dev/null -w "%{http_code}" https://social-watch-mu.vercel.app/tutorial` returns 200

### If any check fails
- Do NOT push to GitHub until fixed
- Roll back with `vercel redeploy <previous-deployment-url>` if needed
- Inform the user of what failed and why

## Known Issues / Notes
- Next.js 16: `middleware.ts` is deprecated (replaced by "proxy") — still works but shows warning
- Next.js 16: `params` in page components are `Promise<{...}>` and need `await`/`use()`
- Post Tracker backend (Railway) is maintained separately by Mitchell
- Twitter API quota resets monthly — if depleted, cron runs but stores no new tweets
- Vercel Pro plan: cron runs every 2 hours (`0 */2 * * *`)
