# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**CDM 2026** is a full-stack sports betting/prediction app for the 2026 FIFA World Cup, with:
- A **Discord bot** (`/bot`) for slash-command-based betting
- A **Next.js website** (`/site`) for a web interface
- **Supabase** (`/supabase`) as the shared backend (PostgreSQL + Auth + Realtime + Edge Functions)

Both interfaces share the same Supabase database and use Discord OAuth for unified auth. The full spec lives in `prompt_claude_code_cdm2026.md`.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Discord Bot | discord.js v14, Node.js, TypeScript |
| Web App | Next.js 14 (App Router), Tailwind CSS, TypeScript |
| Database | Supabase (PostgreSQL + Realtime + Auth) |
| Scores/Stats | API-Football (v3.football.api-sports.io) |
| Betting Odds | The Odds API (500 req/month free tier) |
| Cron Jobs | Supabase Edge Functions (Deno) |
| Hosting | Bot → Railway, Site → Vercel |

---

## Commands

### Bot (`/bot`)
```bash
npm install          # Install dependencies
npm run dev          # Development (ts-node-dev watch)
npm run build        # Compile TypeScript → dist/
npm start            # Run compiled bot
npm run lint         # ESLint
npm run type-check   # TypeScript check (no emit)
```

### Site (`/site`)
```bash
npm install          # Install dependencies
npm run dev          # Dev server on http://localhost:3000
npm run build        # Production build
npm start            # Serve production build
npm run lint         # ESLint (Next.js rules)
npm run type-check   # TypeScript check (no emit)
```

### Supabase
```bash
supabase start                    # Start local Supabase stack
supabase db push                  # Apply migrations to remote
supabase db reset                 # Reset local DB and re-apply migrations
supabase functions deploy <name>  # Deploy a single Edge Function
supabase functions serve          # Serve Edge Functions locally
```

---

## Environment Variables

Both `bot/.env` and `site/.env.local` need these (see `prompt_claude_code_cdm2026.md` for full list):

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

DISCORD_BOT_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_GUILD_ID=
DISCORD_RESULTS_CHANNEL_ID=
DISCORD_GENERAL_CHANNEL_ID=

API_FOOTBALL_KEY=            # dashboard.api-football.com (100 req/jour gratuit)
API_FOOTBALL_LEAGUE_ID=1     # 1 = FIFA World Cup
API_FOOTBALL_SEASON=2026

ODDS_API_KEY=
ODDS_SPORT=soccer_fifa_world_cup
```

---

## Architecture

### Shared Database Schema

The single Supabase PostgreSQL instance is the source of truth for both the bot and the site. Key tables:

- `users` — Discord-linked accounts, starts at 10,000 points each
- `matches` — match data from SofaScore + odds from The Odds API, has `bets_locked_at` deadline
- `bets` — individual bets (unique per user+match+type)
- `combos` + `combo_legs` — parlays (2–10 legs, max 1 leg per match)
- `challenges` + `challenge_bets` — 1v1 head-to-head duels
- `odds_exact_score`, `odds_scorers` — per-match odds rows
- `boosts`, `wildcards` — per-user consumable bonuses
- `tournament_predictions`, `award_predictions` — pre-tournament picks
- `daily_challenges` + `daily_challenge_entries` — daily quests
- `achievements` + `user_achievements` — badge system

Four leaderboard views: `v_leaderboard_points`, `v_leaderboard_winrate`, `v_leaderboard_risk`, `v_leaderboard_duels`.

### Points Formula

```
points = Math.round(odds × stake × phase_multiplier × boost_multiplier × wildcard_multiplier)
```

- **Phase multipliers**: group=1.0, round_of_16=1.5, quarter=2.0, semi=2.5, final=3.0
- **Boost**: 1.5x (x15 boost) or 2.0x (exact score boost) — 3 boosts per phase + 1 exact score boost
- **Wildcard double**: 2.0x; wildcard insurance: refund on 1-goal loss; wildcard last_minute: bet until 10th min

### External API Strategy

- **API-Football** (v3.football.api-sports.io): live scores, events, scorers, stats. 100 req/jour gratuit. Fetched by Edge Functions; mapped to DB par `apifootball_fixture_id`. Wrapper : `site/lib/apifootball.ts`.
- **The Odds API**: betting odds. 500 req/month limit — synced every 6h for general, every 2h when a match is within 24h. Events matched to SofaScore by team name + date (no shared ID).

### Cron Jobs (Supabase Edge Functions)

| Function | Schedule | Purpose |
|----------|----------|---------|
| `sync-matches` | Every 6h | Pull upcoming matches + odds |
| `sync-odds` | Every 2h (near match), 24h (other) | Refresh odds |
| `resolve-bets` | Every 5 min | Score bets after matches finish |
| `daily-challenge` | 10:00 AM Europe/Paris | Generate daily challenge |
| `check-achievements` | DB trigger on INSERT/UPDATE bets/combos/challenges | Unlock achievements |

### Auth Flow

Discord OAuth handled by Supabase Auth. The site's `/api/auth/callback/route.ts` exchanges the OAuth code, extracts `discord_id`, `username`, `avatar` from `session.user.user_metadata`, and upserts the user row. First login also seeds 3 wildcards + phase-group boosts.

### Bot vs Site Separation

- The **bot** uses a Supabase service-role client (bypasses RLS) via `bot/src/services/supabase.ts`
- The **site** uses browser client (`lib/supabase/client.ts`) for user-facing calls and a server client (`lib/supabase/server.ts`) for API routes, both via `@supabase/ssr`
- Points calculation logic in `site/lib/points.ts` should be kept in sync with the same logic in `bot/src/services/points.ts`

---

## Key Business Rules

- Minimum bet: 100 pts; max simple bet: 2,000 pts; max combo stake: 1,000 pts; max 1v1: 20% of balance
- Bets lock at `bets_locked_at` (kickoff − buffer); wildcard `last_minute` overrides until the 10th minute
- Combo: 2–10 legs, max 1 leg per match, all legs must win for payout
- 1v1 challenge: challenger proposes, opponent has 1 hour to accept
- `frozen_points` tracks staked points not yet resolved — available balance = `total_points − frozen_points`
