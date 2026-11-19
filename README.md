# CDM 2026 – World Cup prediction game

A prediction game for the 2026 FIFA World Cup, played with **virtual points only** (no real money): a Discord bot and a website share the same database, so players can bet on matches from either one.

Built mostly with AI-assisted development (Claude Code), as an experiment in shipping a full-stack app with an AI coding agent.

## Features

- Bets on matches, combos (2 to 10 legs) and 1v1 challenges between players
- Every player starts with 10,000 virtual points; stakes are frozen until the bet is resolved
- Points multiplied by the tournament phase, boosts and wildcards
- Pre-tournament predictions (winner, awards), daily challenges and achievements
- Four leaderboards: points, win rate, risk and duels
- Live scores and odds synced automatically from external APIs

## Architecture

| Part | Technology |
|---|---|
| Discord bot (`bot/`) | discord.js v14, Node.js, TypeScript; slash commands for bets, combos, challenges, leaderboards, profile |
| Website (`site/`) | Next.js 14 (App Router), Tailwind CSS, TypeScript |
| Back end (`supabase/`) | Supabase: PostgreSQL, Auth, Realtime, Edge Functions (Deno) |
| Data | API-Football (scores and stats), The Odds API (odds) |

- **Authentication**: Discord OAuth through Supabase Auth, shared by the bot and the site
- **Database security**: Row Level Security enabled on the core tables, with access policies; the bot uses a server-side service key
- **Scheduled jobs** (Edge Functions): `sync-matches`, `sync-odds`, `resolve-bets`, `daily-challenge`, `check-achievements`, `grant-phase-boosts`

## Getting started

Both `bot/.env` and `site/.env.local` need the Supabase, Discord and API keys (never commit these files). Then:

```bash
# bot
cd bot && npm install && npm run dev

# website
cd site && npm install && npm run dev
```

Database migrations live in `supabase/migrations/` (`supabase db push` to apply them).

## Project structure

```text
bot/src/commands/      slash commands (matchs, paris, combo, defi, classement, profil, tournoi, quotidien, boost, award, admin)
site/app/              pages (matches, combos, 1v1, bracket, groups, leaderboard, profile, daily, tournament, admin)
supabase/functions/    scheduled Edge Functions
supabase/migrations/   database schema and RLS policies
```
