# Lab Board

Internal initiatives board. The tech team posts ideas, investigations, and side projects; anyone in the company subscribes or joins to participate.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript + Tailwind
- Drizzle ORM + Postgres (Supabase or Neon)
- Auth.js (NextAuth v5) email magic links via Resend
- Vercel for hosting

## Roles

- `member` — anyone with an allowed email domain. Can browse, subscribe, comment.
- `tech` — auto-assigned to emails listed in `TECH_TEAM_EMAILS`. Can also create initiatives.
- `admin` — manual upgrade in DB. Can edit/delete any initiative.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Provision Postgres**
   - Easiest: create a free Supabase or Neon project, copy the pooled connection string.

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   ```
   Fill in:
   - `DATABASE_URL` — your Postgres connection string
   - `AUTH_SECRET` — `openssl rand -base64 32`
   - `RESEND_API_KEY` — from resend.com (verify your sender domain)
   - `EMAIL_FROM` — e.g. `Lab Board <noreply@yourcompany.com>`
   - `ALLOWED_EMAIL_DOMAIN` — e.g. `yourcompany.com` (locks signup to your org)
   - `TECH_TEAM_EMAILS` — comma-separated list of tech-team emails (auto-elevated on first signin)

4. **Push the schema**
   ```bash
   npm run db:push
   ```

5. **(Optional) seed sample data**
   ```bash
   npm run db:seed
   ```

6. **Run dev**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Create a Vercel project from the repo.
3. Add the env vars from step 3 above to the Vercel project.
4. Set `AUTH_URL` to your production URL (e.g. `https://labboard.yourcompany.com`).
5. Deploy. Run `npm run db:push` against the production DB once.

## Architecture notes

- **Auth.** Magic link via Resend. Sign-in is gated by `ALLOWED_EMAIL_DOMAIN` so only your org can register. On first sign-in, users in `TECH_TEAM_EMAILS` are auto-promoted to `tech`.
- **Authorization.** Page-level guards via `auth()` plus action-level checks (`requireUser`, `requireTech`). Middleware redirects unauthenticated requests to `/signin`.
- **Notifications.** New `open` initiatives email all users (excluding the author). Updates email all subscribers. Tune in `src/actions/initiatives.ts` and `src/actions/updates.ts`.
- **Search.** Defer until needed. Postgres FTS is the next step; swap in Meilisearch only if usage demands it.

## Roadmap

- Slack notifications (incoming webhook) → bot for `/initiatives` slash command
- Outcomes / demo-day showcase view
- "Interest" signal before commitment (lightweight upvote)
- Tag/topic subscriptions
- Light analytics dashboard for leadership
