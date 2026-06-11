# Prompt Claude Code — Bot Discord + Site CDM 2026

---

## Contexte du projet

Tu vas m'aider à construire une application complète de pronostics sportifs pour la Coupe du Monde 2026 (début le 11 juin 2026). Le projet se compose de :

1. **Un bot Discord** (discord.js v14)
2. **Un site web** (Next.js 14 + Tailwind CSS)
3. **Une base de données** (Supabase)
4. **Deux APIs externes** : SofaScore (scores/stats) + The Odds API (cotes bookmakers)

Les deux interfaces (bot + site) partagent la même base Supabase. Un utilisateur peut parier depuis Discord ou depuis le site avec le même compte (auth Discord OAuth).

---

## Stack technique

```
Bot Discord      : discord.js v14, Node.js, TypeScript
Site             : Next.js 14 (App Router), Tailwind CSS, TypeScript
Base de données  : Supabase (PostgreSQL + Realtime + Auth)
API scores/stats : SofaScore via RapidAPI
API cotes        : The Odds API (the-odds-api.com) — 500 req/mois free tier
Cron jobs        : Supabase Edge Functions
Hébergement      : Bot → Railway / Site → Vercel
```

---

## Variables d'environnement nécessaires

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Discord
DISCORD_BOT_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_GUILD_ID=
DISCORD_RESULTS_CHANNEL_ID=     # canal où le bot poste les résultats
DISCORD_GENERAL_CHANNEL_ID=     # canal #général pour les défis quotidiens

# SofaScore (RapidAPI) — scores, stats, buteurs, incidents
RAPIDAPI_KEY=
RAPIDAPI_HOST=sofascore.p.rapidapi.com

# SofaScore — IDs tournoi CDM 2026
SOFASCORE_TOURNAMENT_ID=16      # FIFA World Cup sur SofaScore
SOFASCORE_SEASON_ID=            # à récupérer au premier lancement via /tournaments/16/seasons

# The Odds API — cotes bookmakers (gratuit 500 req/mois)
# S'inscrire sur https://the-odds-api.com
ODDS_API_KEY=
ODDS_SPORT=soccer_fifa_world_cup
```

---

## Structure du projet à créer

```
cdm2026/
├── bot/                          # Bot Discord
│   ├── src/
│   │   ├── index.ts              # Entry point bot
│   │   ├── commands/             # Slash commands
│   │   │   ├── paris.ts          # /paris résultat|score|buteur|spécial
│   │   │   ├── combo.ts          # /combo créer|ajouter|confirmer|liste
│   │   │   ├── defi.ts           # /defi @user|accepter|refuser|liste
│   │   │   ├── tournoi.ts        # /tournoi predire|voir|classement
│   │   │   ├── award.ts          # /award golden-boot|golden-ball
│   │   │   ├── classement.ts     # /classement
│   │   │   ├── profil.ts         # /profil @user
│   │   │   ├── matchs.ts         # /matchs (prochains matchs)
│   │   │   ├── boost.ts          # /boost utiliser
│   │   │   └── quotidien.ts      # /quotidien (défi du jour)
│   │   ├── services/
│   │   │   ├── supabase.ts       # Client Supabase service role
│   │   │   ├── bets.ts           # Logique paris
│   │   │   ├── combos.ts         # Logique combinés
│   │   │   ├── challenges.ts     # Logique 1v1
│   │   │   ├── points.ts         # Calcul des points
│   │   │   ├── achievements.ts   # Vérification succès
│   │   │   └── notifications.ts  # DM et messages canal
│   │   └── utils/
│   │       ├── embeds.ts         # Templates Discord embeds
│   │       ├── validators.ts     # Validations (solde, deadline, etc.)
│   │       └── formatters.ts     # Formatage texte
│   ├── package.json
│   └── tsconfig.json
│
├── site/                         # Site Next.js
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Landing / classement public
│   │   ├── classement/
│   │   │   └── page.tsx          # Classement global (4 onglets)
│   │   ├── matchs/
│   │   │   ├── page.tsx          # Liste des matchs
│   │   │   └── [matchId]/
│   │   │       └── page.tsx      # Page de pari d'un match
│   │   ├── dashboard/
│   │   │   └── page.tsx          # Mes paris, solde, succès
│   │   ├── combos/
│   │   │   └── page.tsx          # Mes combinés
│   │   ├── 1v1/
│   │   │   └── page.tsx          # Défis en cours
│   │   ├── tournoi/
│   │   │   └── page.tsx          # Prédictions podium + awards
│   │   ├── quotidien/
│   │   │   └── page.tsx          # Défi du jour
│   │   ├── profil/
│   │   │   └── [username]/
│   │   │       └── page.tsx      # Profil public
│   │   └── api/
│   │       ├── auth/
│   │       │   └── callback/
│   │       │       └── route.ts  # Callback Discord OAuth
│   │       └── bets/
│   │           ├── place/
│   │           │   └── route.ts  # POST — poser un pari
│   │           ├── combo/
│   │           │   └── route.ts  # POST — créer un combiné
│   │           ├── challenge/
│   │           │   └── route.ts  # POST — créer/accepter un défi
│   │           └── tournament/
│   │               └── route.ts  # POST — prédictions tournoi/awards
│   ├── components/
│   │   ├── BetCard.tsx           # Carte de pari (1X2, spéciaux, etc.)
│   │   ├── ComboBuilder.tsx      # Constructeur de combiné
│   │   ├── Leaderboard.tsx       # Tableau classement
│   │   ├── MatchCard.tsx         # Carte match avec cotes
│   │   ├── ProfileCard.tsx       # Profil joueur
│   │   ├── AchievementBadge.tsx  # Badge succès
│   │   └── LiveScore.tsx         # Score en temps réel (Supabase Realtime)
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts         # Client browser (@supabase/ssr)
│   │   │   └── server.ts         # Client server-side (@supabase/ssr)
│   │   ├── points.ts             # Calcul points (partagé bot + site)
│   │   ├── sofascore.ts          # Wrapper SofaScore API
│   │   └── odds.ts               # Wrapper The Odds API
│   └── package.json
│
└── supabase/
    ├── migrations/
    │   └── 001_initial_schema.sql  # Le schéma DB complet (fourni plus bas)
    └── functions/
        ├── sync-matches/           # Cron : sync matchs depuis SofaScore
        │   └── index.ts
        ├── sync-odds/              # Cron : sync cotes depuis The Odds API
        │   └── index.ts
        ├── resolve-bets/           # Cron : calcul points après chaque match
        │   └── index.ts
        ├── daily-challenge/        # Cron : génère le défi du jour
        │   └── index.ts
        └── check-achievements/     # Trigger : vérifie succès après chaque action
            └── index.ts
```

---

## Schéma DB complet (à appliquer dans supabase/migrations/001_initial_schema.sql)

```sql
-- USERS
CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id        TEXT UNIQUE NOT NULL,
  username          TEXT NOT NULL,
  avatar_url        TEXT,
  total_points      INT NOT NULL DEFAULT 10000,
  frozen_points     INT NOT NULL DEFAULT 0,
  total_bets        INT NOT NULL DEFAULT 0,
  bets_won          INT NOT NULL DEFAULT 0,
  total_combos      INT NOT NULL DEFAULT 0,
  combos_won        INT NOT NULL DEFAULT 0,
  avg_odds          DECIMAL(6,2) DEFAULT 0,
  duels_won         INT NOT NULL DEFAULT 0,
  duels_lost        INT NOT NULL DEFAULT 0,
  duels_streak      INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- MATCHES
CREATE TABLE matches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team         TEXT NOT NULL,
  away_team         TEXT NOT NULL,
  home_team_id      INT,                          -- id SofaScore
  away_team_id      INT,                          -- id SofaScore
  phase             TEXT NOT NULL CHECK (phase IN ('group','round_of_16','quarter','semi','final')),
  phase_multiplier  DECIMAL(4,2) NOT NULL DEFAULT 1.0,
  group_name        TEXT,
  kickoff_at        TIMESTAMPTZ NOT NULL,
  bets_locked_at    TIMESTAMPTZ NOT NULL,
  final_score_home  INT,
  final_score_away  INT,
  result            TEXT CHECK (result IN ('home','draw','away')),
  scorers           TEXT[],
  status            TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','live','finished')),
  -- Cotes 1X2 (depuis The Odds API)
  odds_home         DECIMAL(6,2),
  odds_draw         DECIMAL(6,2),
  odds_away         DECIMAL(6,2),
  -- Cotes spéciaux (depuis The Odds API)
  odds_btts_yes     DECIMAL(6,2),
  odds_btts_no      DECIMAL(6,2),
  odds_over25       DECIMAL(6,2),
  odds_under25      DECIMAL(6,2),
  odds_red_card_yes DECIMAL(6,2),
  odds_red_card_no  DECIMAL(6,2),
  odds_fh_win_home  DECIMAL(6,2),
  odds_fh_win_away  DECIMAL(6,2),
  odds_fh_equal     DECIMAL(6,2),
  odds_et_yes       DECIMAL(6,2),
  odds_et_no        DECIMAL(6,2),
  -- Résultats spéciaux (remplis depuis SofaScore incidents)
  result_btts       BOOLEAN,
  result_over25     BOOLEAN,
  result_red_card   BOOLEAN,
  result_best_half  TEXT CHECK (result_best_half IN ('home','away','equal')),
  result_et         BOOLEAN,
  -- IDs externes
  sofascore_event_id  INT UNIQUE,               -- id SofaScore
  odds_api_event_id   TEXT,                     -- id The Odds API
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ODDS SCORE EXACT (depuis The Odds API market=scores)
CREATE TABLE odds_exact_score (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id   UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  score_home INT NOT NULL,
  score_away INT NOT NULL,
  odds       DECIMAL(6,2) NOT NULL,
  UNIQUE(match_id, score_home, score_away)
);

-- ODDS BUTEURS (depuis SofaScore top players + The Odds API market=player_goal_scorer)
CREATE TABLE odds_scorers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id    UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  player_id   INT,                              -- id SofaScore
  team        TEXT NOT NULL,
  odds        DECIMAL(6,2) NOT NULL,
  UNIQUE(match_id, player_id)
);

-- PARIS SIMPLES
CREATE TABLE bets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id),
  match_id              UUID NOT NULL REFERENCES matches(id),
  bet_type              TEXT NOT NULL CHECK (bet_type IN (
                          'result','exact_score','scorer',
                          'btts','over_under','red_card','best_half','extra_time'
                        )),
  prediction_result     TEXT CHECK (prediction_result IN ('home','draw','away')),
  prediction_score_home INT,
  prediction_score_away INT,
  prediction_scorer     TEXT,
  prediction_bool       BOOLEAN,
  prediction_half       TEXT CHECK (prediction_half IN ('home','away','equal')),
  stake                 INT NOT NULL DEFAULT 100,
  odds_at_bet_time      DECIMAL(6,2) NOT NULL,
  phase_multiplier      DECIMAL(4,2) NOT NULL,
  boost_used            BOOLEAN NOT NULL DEFAULT FALSE,
  boost_multiplier      DECIMAL(4,2) DEFAULT 1.0,
  wildcard_used         TEXT CHECK (wildcard_used IN ('double','insurance','last_minute')),
  points_won            INT DEFAULT 0,
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','won','lost','refunded')),
  UNIQUE(user_id, match_id, bet_type),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  resolved_at           TIMESTAMPTZ
);

-- COMBINÉS
CREATE TABLE combos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  total_odds    DECIMAL(10,2) NOT NULL,
  stake         INT NOT NULL DEFAULT 100,
  potential_win INT NOT NULL,
  points_won    INT DEFAULT 0,
  legs_count    INT NOT NULL,
  legs_won      INT NOT NULL DEFAULT 0,
  boost_used    BOOLEAN NOT NULL DEFAULT FALSE,
  wildcard_used TEXT CHECK (wildcard_used IN ('double','insurance')),
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','won','lost','refunded')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ
);

CREATE TABLE combo_legs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id              UUID NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
  match_id              UUID NOT NULL REFERENCES matches(id),
  bet_type              TEXT NOT NULL,
  prediction_result     TEXT,
  prediction_score_home INT,
  prediction_score_away INT,
  prediction_scorer     TEXT,
  prediction_bool       BOOLEAN,
  prediction_half       TEXT,
  odds_at_bet_time      DECIMAL(6,2) NOT NULL,
  phase_multiplier      DECIMAL(4,2) NOT NULL,
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','won','lost')),
  UNIQUE(combo_id, match_id),
  resolved_at           TIMESTAMPTZ
);

-- DÉFIS 1V1
CREATE TABLE challenges (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id     UUID NOT NULL REFERENCES users(id),
  opponent_id       UUID NOT NULL REFERENCES users(id),
  match_id          UUID REFERENCES matches(id),
  stake             INT NOT NULL,
  challenger_points INT NOT NULL DEFAULT 0,
  opponent_points   INT NOT NULL DEFAULT 0,
  winner_id         UUID REFERENCES users(id),
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','accepted','refused','finished','expired')),
  expires_at        TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  finished_at       TIMESTAMPTZ
);

CREATE TABLE challenge_bets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  bet_id       UUID NOT NULL REFERENCES bets(id),
  user_id      UUID NOT NULL REFERENCES users(id),
  UNIQUE(challenge_id, user_id)
);

-- PRÉDICTIONS TOURNOI
CREATE TABLE tournament_predictions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) UNIQUE,
  first_team  TEXT NOT NULL,
  second_team TEXT NOT NULL,
  third_team  TEXT NOT NULL,
  odds_first  DECIMAL(6,2) NOT NULL,
  odds_second DECIMAL(6,2) NOT NULL,
  odds_third  DECIMAL(6,2) NOT NULL,
  points_won  INT DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','calculated')),
  locked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- GOLDEN BOOT & GOLDEN BALL
CREATE TABLE award_predictions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id),
  award_type   TEXT NOT NULL CHECK (award_type IN ('golden_boot','golden_ball')),
  player_name  TEXT NOT NULL,
  player_id    INT,                              -- id SofaScore
  team         TEXT NOT NULL,
  odds_at_time DECIMAL(6,2) NOT NULL,
  points_won   INT DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','won','lost')),
  UNIQUE(user_id, award_type),
  locked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- BOOSTS
CREATE TABLE user_boosts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id),
  boost_type       TEXT NOT NULL CHECK (boost_type IN ('x15','x20_exact')),
  phase            TEXT NOT NULL,
  used             BOOLEAN NOT NULL DEFAULT FALSE,
  used_on_bet_id   UUID REFERENCES bets(id),
  used_on_combo_id UUID REFERENCES combos(id),
  used_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- WILD CARDS
CREATE TABLE user_wildcards (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id),
  type             TEXT NOT NULL CHECK (type IN ('double','insurance','last_minute')),
  used             BOOLEAN NOT NULL DEFAULT FALSE,
  used_on_bet_id   UUID REFERENCES bets(id),
  used_on_combo_id UUID REFERENCES combos(id),
  used_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- DÉFIS QUOTIDIENS
CREATE TABLE daily_challenges (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id       UUID NOT NULL REFERENCES matches(id),
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('exact_score','scorer','combo_3')),
  reward_first   INT NOT NULL DEFAULT 1000,
  reward_second  INT NOT NULL DEFAULT 500,
  reward_third   INT NOT NULL DEFAULT 250,
  reward_correct INT NOT NULL DEFAULT 100,
  challenge_date DATE NOT NULL UNIQUE,
  status         TEXT NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open','closed','resolved')),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE daily_challenge_entries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_challenge_id  UUID NOT NULL REFERENCES daily_challenges(id),
  user_id             UUID NOT NULL REFERENCES users(id),
  bet_id              UUID REFERENCES bets(id),
  prediction_score_home INT,
  prediction_score_away INT,
  prediction_scorer   TEXT,
  points_won          INT DEFAULT 0,
  rank                INT,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','won','lost')),
  UNIQUE(daily_challenge_id, user_id),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- SUCCÈS
CREATE TABLE achievements (
  code        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  icon        TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN (
                'performance','risk','fun','tournament','duel','combo','daily'
              )),
  rarity      TEXT NOT NULL CHECK (rarity IN ('common','rare','legendary'))
);

CREATE TABLE user_achievements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id),
  achievement_code TEXT NOT NULL REFERENCES achievements(code),
  context          TEXT,
  unlocked_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_code)
);

-- VUES CLASSEMENTS
CREATE VIEW leaderboard_points AS
SELECT
  u.id, u.discord_id, u.username, u.avatar_url,
  u.total_points, u.total_bets, u.bets_won,
  CASE WHEN u.total_bets > 0
    THEN ROUND(u.bets_won * 100.0 / u.total_bets) ELSE 0
  END AS winrate,
  u.avg_odds, u.duels_won, u.duels_lost,
  RANK() OVER (ORDER BY u.total_points DESC) AS rank_points
FROM users u ORDER BY u.total_points DESC;

CREATE VIEW leaderboard_winrate AS
SELECT u.id, u.username,
  ROUND(u.bets_won * 100.0 / u.total_bets) AS winrate, u.total_bets,
  RANK() OVER (ORDER BY ROUND(u.bets_won * 100.0 / u.total_bets) DESC) AS rank_winrate
FROM users u WHERE u.total_bets >= 10 ORDER BY winrate DESC;

CREATE VIEW leaderboard_risk AS
SELECT u.id, u.username, u.avg_odds, u.total_bets,
  RANK() OVER (ORDER BY u.avg_odds DESC) AS rank_risk
FROM users u WHERE u.total_bets >= 5 ORDER BY u.avg_odds DESC;

CREATE VIEW leaderboard_duels AS
SELECT u.id, u.username, u.duels_won, u.duels_lost, u.duels_streak,
  RANK() OVER (ORDER BY u.duels_won DESC) AS rank_duels
FROM users u WHERE (u.duels_won + u.duels_lost) >= 1 ORDER BY u.duels_won DESC;

-- INDEX
CREATE INDEX idx_bets_user          ON bets(user_id);
CREATE INDEX idx_bets_match         ON bets(match_id);
CREATE INDEX idx_bets_status        ON bets(status);
CREATE INDEX idx_combo_legs_combo   ON combo_legs(combo_id);
CREATE INDEX idx_combo_legs_match   ON combo_legs(match_id);
CREATE INDEX idx_challenges_users   ON challenges(challenger_id, opponent_id);
CREATE INDEX idx_matches_status     ON matches(status);
CREATE INDEX idx_matches_kickoff    ON matches(kickoff_at);
CREATE INDEX idx_user_achievements  ON user_achievements(user_id);
CREATE INDEX idx_matches_sofascore  ON matches(sofascore_event_id);
CREATE INDEX idx_matches_oddsapi    ON matches(odds_api_event_id);

-- RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE award_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "classements_publics" ON users FOR SELECT USING (true);
CREATE POLICY "paris_propres" ON bets FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "combos_propres" ON combos FOR SELECT USING (auth.uid()::text = user_id::text);
```

---

## Règles métier à respecter absolument

### Points & Économie
```
- Chaque joueur démarre avec 10 000 pts
- Mise min : 100 pts — Mise max pari simple : 2 000 pts
- Mise max combiné : 1 000 pts
- Mise max 1v1 : 20% du solde disponible (total_points - frozen_points)
- Les points gelés (frozen_points) sont déduits du solde disponible
- La cote est toujours snapshotée côté serveur au moment du pari, jamais depuis le client
```

### Multiplicateurs de phase
```
group        → ×1.0
round_of_16  → ×1.5
quarter      → ×2.0
semi         → ×2.5
final        → ×3.0
```

### Formule de calcul des points
```
points = Math.round(odds × stake × phase_multiplier × boost_multiplier × wildcard_double)

wildcard_double  = 2.0 si wildcard 'double' utilisée, sinon 1.0
boost_multiplier = 1.5 (x15) ou 2.0 (x20_exact — score exact uniquement)
```

### Boosts
```
- 3 boosts ×1.5 par phase (group, round_of_16, quarter, semi, final)
- 1 boost ×2.0 score exact pour tout le tournoi
- Non cumulables entre eux
- Utilisable sur paris simples ET combinés
```

### Wild Cards (3 par tournoi)
```
- 'double'      : ×2 sur les gains finaux
- 'insurance'   : remboursement de la mise si perdu de 1 but (exact_score uniquement)
- 'last_minute' : permet de parier jusqu'à la 10ème minute du match
```

### Deadlines
```
- Paris bloqués dès kickoff_at (ou 10ème minute si wildcard last_minute)
- Prédictions tournoi/awards bloquées au 1er match (11 juin 2026)
- Défi 1v1 : l'opponent a 1h pour accepter
```

### Combinés
```
- Min 2 sélections, max 10
- Pas 2 sélections sur le même match
- Cotes multipliées entre elles
- 1 seul lost = tout le combiné perdu
- Résolution : attendre que tous les matchs du combo soient finished
```

### Prédictions tournoi — calcul points
```javascript
const BASE = 1000
// 1er choix correct
points += Math.round(odds_first * BASE * 3)
// 2ème choix correct
points += Math.round(odds_second * BASE * 2)
// 3ème choix correct
points += Math.round(odds_third * BASE * 1)
```

### Golden Boot / Golden Ball
```
BASE_AWARD = 2000
points = Math.round(odds_at_time * BASE_AWARD) si correct
```

### Défis quotidiens — classement
```
1er correct  → +1 000 pts
2ème correct → +500 pts
3ème correct → +250 pts
Autres corrects → +100 pts
Faux → 0 pt
```

---

## Intégration APIs — Architecture hybride

### Principe de séparation des responsabilités

```
SofaScore API   →  scores live, buteurs, incidents, stats, top joueurs (Golden Boot/Ball)
The Odds API    →  cotes 1X2, BTTS, over/under, scores exacts, buteurs
```

---

### Wrapper SofaScore (lib/sofascore.ts)

```typescript
const BASE_URL = 'https://sofascore.p.rapidapi.com'
const HEADERS = {
  'X-RapidAPI-Key':  process.env.RAPIDAPI_KEY!,
  'X-RapidAPI-Host': 'sofascore.p.rapidapi.com',
}

const fetchSofascore = (path: string) =>
  fetch(`${BASE_URL}${path}`, { headers: HEADERS }).then(r => r.json())

export const sofascore = {
  // Récupérer le seasonId actuel du tournoi CDM
  // GET /api/v1/unique-tournament/{tournamentId}/seasons
  getSeasons: (tournamentId: number) =>
    fetchSofascore(`/api/v1/unique-tournament/${tournamentId}/seasons`),

  // Prochains matchs CDM (page = 0, 1, 2...)
  // GET /api/v1/unique-tournament/{id}/season/{seasonId}/events/next/{page}
  getUpcomingMatches: (tournamentId: number, seasonId: number, page = 0) =>
    fetchSofascore(`/api/v1/unique-tournament/${tournamentId}/season/${seasonId}/events/next/${page}`),

  // Matchs passés
  getLastMatches: (tournamentId: number, seasonId: number, page = 0) =>
    fetchSofascore(`/api/v1/unique-tournament/${tournamentId}/season/${seasonId}/events/last/${page}`),

  // Détail + score live d'un match
  // GET /api/v1/event/{eventId}
  getMatch: (eventId: number) =>
    fetchSofascore(`/api/v1/event/${eventId}`),

  // Buteurs + incidents (buts, cartons, remplacements)
  // GET /api/v1/event/{eventId}/incidents
  getIncidents: (eventId: number) =>
    fetchSofascore(`/api/v1/event/${eventId}/incidents`),

  // Statistiques du match (possession, tirs, etc.)
  // GET /api/v1/event/{eventId}/statistics
  getMatchStats: (eventId: number) =>
    fetchSofascore(`/api/v1/event/${eventId}/statistics`),

  // Top buteurs du tournoi → Golden Boot
  // GET /api/v1/unique-tournament/{id}/season/{seasonId}/top-players/goals
  getTopScorers: (tournamentId: number, seasonId: number) =>
    fetchSofascore(`/api/v1/unique-tournament/${tournamentId}/season/${seasonId}/top-players/goals`),

  // Meilleurs joueurs par rating → Golden Ball
  // GET /api/v1/unique-tournament/{id}/season/{seasonId}/top-players/rating
  getTopRatedPlayers: (tournamentId: number, seasonId: number) =>
    fetchSofascore(`/api/v1/unique-tournament/${tournamentId}/season/${seasonId}/top-players/rating`),

  // Joueurs d'une équipe (pour autocomplétion buteur dans Discord)
  // GET /api/v1/team/{teamId}/players
  getTeamPlayers: (teamId: number) =>
    fetchSofascore(`/api/v1/team/${teamId}/players`),
}

// Mapping SofaScore event → format DB
export function mapSofascoreEvent(event: any) {
  const statusType = event.status?.type
  return {
    sofascore_event_id: event.id,
    home_team:          event.homeTeam?.name,
    away_team:          event.awayTeam?.name,
    home_team_id:       event.homeTeam?.id,
    away_team_id:       event.awayTeam?.id,
    kickoff_at:         new Date(event.startTimestamp * 1000).toISOString(),
    bets_locked_at:     new Date(event.startTimestamp * 1000).toISOString(),
    status:             statusType === 'finished'   ? 'finished'
                      : statusType === 'inprogress' ? 'live'
                      : 'upcoming',
    final_score_home:   event.homeScore?.current ?? null,
    final_score_away:   event.awayScore?.current ?? null,
    result:             event.homeScore?.current != null
                          ? getResult(event.homeScore.current, event.awayScore.current)
                          : null,
  }
}

// Mapping incidents → buteurs
export function extractScorers(incidents: any[]): string[] {
  return incidents
    .filter(i => i.incidentType === 'goal' && i.incidentClass !== 'ownGoal')
    .map(i => i.player?.name)
    .filter(Boolean)
}

// Mapping incidents → résultats spéciaux
export function extractSpecialResults(incidents: any[], homeScore: number, awayScore: number) {
  const goals = incidents.filter(i => i.incidentType === 'goal')
  const redCards = incidents.filter(i => i.incidentType === 'card' && i.incidentClass === 'red')
  const htHomeScore = incidents.filter(i => i.incidentType === 'goal' && i.time <= 45 && i.isHome).length
  const htAwayScore = incidents.filter(i => i.incidentType === 'goal' && i.time <= 45 && !i.isHome).length
  const shHomeScore = goals.filter(i => i.time > 45 && i.isHome).length
  const shAwayScore = goals.filter(i => i.time > 45 && !i.isHome).length

  return {
    result_btts:      homeScore > 0 && awayScore > 0,
    result_over25:    (homeScore + awayScore) > 2.5,
    result_red_card:  redCards.length > 0,
    result_best_half: htHomeScore + htAwayScore > shHomeScore + shAwayScore ? 'home'
                    : htHomeScore + htAwayScore < shHomeScore + shAwayScore ? 'away'
                    : 'equal',
  }
}

function getResult(home: number, away: number): 'home' | 'draw' | 'away' {
  if (home > away) return 'home'
  if (home < away) return 'away'
  return 'draw'
}
```

---

### Wrapper The Odds API (lib/odds.ts)

```typescript
const ODDS_BASE = 'https://api.the-odds-api.com/v4'
const API_KEY   = process.env.ODDS_API_KEY!
const SPORT     = process.env.ODDS_SPORT || 'soccer_fifa_world_cup'

// Marchés disponibles pour la CDM
// h2h         → 1X2
// btts        → les deux équipes marquent
// totals      → over/under 2.5
// alternate_spreads → scores exacts (si dispo)
// player_goal_scorer → buteurs (si dispo)

export const oddsApi = {
  // Tous les matchs à venir avec cotes 1X2 + spéciaux
  getUpcomingOdds: () =>
    fetch(`${ODDS_BASE}/sports/${SPORT}/odds?apiKey=${API_KEY}&regions=eu&markets=h2h,btts,totals&oddsFormat=decimal`)
      .then(r => r.json()),

  // Cotes d'un match spécifique par son id The Odds API
  getMatchOdds: (eventId: string, markets = 'h2h,btts,totals') =>
    fetch(`${ODDS_BASE}/sports/${SPORT}/events/${eventId}/odds?apiKey=${API_KEY}&regions=eu&markets=${markets}&oddsFormat=decimal`)
      .then(r => r.json()),

  // Scores exacts (marché 'scores' — vérifier disponibilité CDM)
  getExactScoreOdds: (eventId: string) =>
    fetch(`${ODDS_BASE}/sports/${SPORT}/events/${eventId}/odds?apiKey=${API_KEY}&regions=eu&markets=alternate_totals,scores&oddsFormat=decimal`)
      .then(r => r.json()),

  // Buteurs (marché 'player_goal_scorer' — vérifier disponibilité CDM)
  getScorerOdds: (eventId: string) =>
    fetch(`${ODDS_BASE}/sports/${SPORT}/events/${eventId}/odds?apiKey=${API_KEY}&regions=eu&markets=player_goal_scorer&oddsFormat=decimal`)
      .then(r => r.json()),
}

// Mapping The Odds API → format DB
export function mapOddsToMatch(oddsEvent: any) {
  const bookmaker = oddsEvent.bookmakers?.[0]  // prendre le 1er bookmaker dispo

  if (!bookmaker) return {}

  const h2h    = bookmaker.markets?.find((m: any) => m.key === 'h2h')
  const btts   = bookmaker.markets?.find((m: any) => m.key === 'btts')
  const totals = bookmaker.markets?.find((m: any) => m.key === 'totals')

  const homeOdds = h2h?.outcomes?.find((o: any) => o.name === oddsEvent.home_team)?.price
  const awayOdds = h2h?.outcomes?.find((o: any) => o.name === oddsEvent.away_team)?.price
  const drawOdds = h2h?.outcomes?.find((o: any) => o.name === 'Draw')?.price

  const bttsYes = btts?.outcomes?.find((o: any) => o.name === 'Yes')?.price
  const bttsNo  = btts?.outcomes?.find((o: any) => o.name === 'No')?.price

  const over25  = totals?.outcomes?.find((o: any) => o.name === 'Over' && o.point === 2.5)?.price
  const under25 = totals?.outcomes?.find((o: any) => o.name === 'Under' && o.point === 2.5)?.price

  return {
    odds_api_event_id: oddsEvent.id,
    odds_home:         homeOdds  ?? null,
    odds_draw:         drawOdds  ?? null,
    odds_away:         awayOdds  ?? null,
    odds_btts_yes:     bttsYes   ?? null,
    odds_btts_no:      bttsNo    ?? null,
    odds_over25:       over25    ?? null,
    odds_under25:      under25   ?? null,
  }
}

// Matching entre un event SofaScore et un event The Odds API
// (par équipes + date approximative car pas d'id commun)
export function matchEvents(sofascoreEvent: any, oddsEvents: any[]): any | null {
  const kickoff = new Date(sofascoreEvent.startTimestamp * 1000)

  return oddsEvents.find(e => {
    const oddsDate = new Date(e.commence_time)
    const sameDay  = Math.abs(kickoff.getTime() - oddsDate.getTime()) < 24 * 3600 * 1000
    const homeMatch = e.home_team.toLowerCase().includes(sofascoreEvent.homeTeam?.name?.toLowerCase()?.split(' ')[0])
                   || sofascoreEvent.homeTeam?.name?.toLowerCase().includes(e.home_team.toLowerCase().split(' ')[0])
    return sameDay && homeMatch
  }) ?? null
}
```

---

### Cron jobs Supabase Edge Functions

```
sync-matches    → toutes les 6h
                  1. Fetch SofaScore upcoming events (CDM)
                  2. Fetch The Odds API upcoming odds
                  3. Match les events par équipe + date
                  4. Upsert dans matches (sofascore_event_id + odds_api_event_id)
                  5. Upsert odds_exact_score et odds_scorers si disponibles

sync-odds       → toutes les 2h (avant matchs) / toutes les 24h (général)
                  1. Fetch The Odds API pour les matchs upcoming
                  2. Update uniquement les colonnes odds_* dans matches
                  ⚠️ Économiser les requêtes — 500/mois max

resolve-bets    → toutes les 5min
                  1. Chercher les matchs avec status='finished' et des bets pending
                  2. Fetch SofaScore incidents pour buteurs + résultats spéciaux
                  3. Calculer et distribuer les points
                  4. Notifier le bot Discord via webhook

daily-challenge → chaque jour à 10h (Europe/Paris)
                  1. Trouver le match du soir
                  2. Créer l'entrée daily_challenges
                  3. Notifier Discord #général

check-achievements → trigger PostgreSQL après INSERT/UPDATE sur bets, combos, challenges
                     Vérifie toutes les conditions de succès pour l'user concerné
```

---

## Commandes Discord à implémenter

```
/paris résultat [match] [home|draw|away] [mise]
/paris score    [match] [score_home] [score_away] [mise]
/paris buteur   [match] [joueur] [mise]
/paris spécial  [match] [type] [prédiction] [mise]

/combo créer
/combo ajouter   [match] [type] [prédiction]
/combo confirmer [mise]
/combo annuler
/combo liste
/combo historique

/defi @user [match] [mise]
/defi accepter [id]
/defi refuser  [id]
/defi liste
/defi historique

/tournoi predire [1er] [2eme] [3eme]
/tournoi voir    [@user]
/tournoi classement

/award golden-boot [joueur]
/award golden-ball [joueur]
/award voir        [@user]

/boost utiliser   [pari_id]
/wildcard utiliser [type] [pari_id]

/quotidien              → voir défi du jour
/quotidien participer   → soumettre sa réponse

/classement             → top 10 global (points)
/classement winrate     → top winrate
/classement audace      → top cote moyenne
/classement 1v1         → top duels

/profil [@user]
/matchs                 → prochains matchs disponibles
/mesparisencours        → mes paris pending
```

---

## Auth Discord OAuth (site Next.js)

```typescript
// Utiliser @supabase/ssr pour Next.js App Router
// lib/supabase/client.ts → createBrowserClient
// lib/supabase/server.ts → createServerClient

// app/api/auth/callback/route.ts
// 1. Échanger le code OAuth Discord contre une session Supabase
// 2. Récupérer discord_id + username + avatar depuis session.user.user_metadata
// 3. Upsert dans la table users
// 4. Si nouvel user : attribuer 3 wildcards + boosts phase 'group'
// 5. Rediriger vers /dashboard

// Connexion Discord OAuth
await supabase.auth.signInWithOAuth({
  provider: 'discord',
  options: {
    scopes: 'identify',
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`
  }
})
```

---

## Notifications Discord automatiques

```
Le bot écoute un webhook Supabase ou un channel Realtime pour déclencher :

- Fin d'un match     → message dans #résultats avec score + points distribués
- Défi 1v1 reçu     → DM à l'opponent avec /defi accepter [id]
- Succès débloqué   → DM au joueur concerné
- Défi quotidien    → message dans #général chaque matin
- Paris depuis site → message dans #paris (optionnel, configurable)
```

---

## Priorité d'implémentation

```
Étape 1 — Foundation
  ✅ Setup Supabase + appliquer le schéma DB
  ✅ Setup bot Discord (entry point + deploy des slash commands)
  ✅ Auth Discord OAuth sur le site (Next.js + @supabase/ssr)
  ✅ Création automatique du user à la 1ère connexion + attribution wildcards/boosts

Étape 2 — Sync APIs
  ✅ lib/sofascore.ts + lib/odds.ts
  ✅ Cron sync-matches (SofaScore + The Odds API → Supabase)
  ✅ Récupérer le SOFASCORE_SEASON_ID CDM 2026 au premier lancement

Étape 3 — Paris de base
  ✅ Commande /paris résultat (bot)
  ✅ API route POST /api/bets/place (site)
  ✅ Page /matchs et /paris/[matchId] (site)

Étape 4 — Résolution automatique
  ✅ Cron resolve-bets (SofaScore incidents → calcul points)
  ✅ Notifications résultats dans #résultats Discord

Étape 5 — Features avancées
  ✅ Combinés (bot + site)
  ✅ Défis 1v1 (bot + site)
  ✅ Prédictions tournoi + awards (bot + site)
  ✅ Boosts + wild cards

Étape 6 — Gamification
  ✅ Défis quotidiens
  ✅ Système de succès (trigger PostgreSQL)
  ✅ Classement global (4 dimensions)
  ✅ Page /profil

Étape 7 — Polish
  ✅ Supabase Realtime sur le classement et les scores live
  ✅ Countdown avant fermeture des paris
  ✅ Historique des paris sur le site
  ✅ Cron sync-odds (refresh cotes avant chaque match)
```

---

## Notes importantes

- **Toujours utiliser la `service_role` key dans le bot** — jamais l'anon key
- **Jamais calculer les points côté client** — toujours via API Route Next.js ou Edge Function
- **Snapshot la cote au moment du pari** — stocker `odds_at_bet_time`, jamais recalculer après
- **Vérifier la deadline avant chaque pari** — `Date.now() > new Date(match.kickoff_at).getTime()`
- **Vérifier le solde disponible** — `total_points - frozen_points >= stake`
- **Un seul pari par type par match par user** — contrainte UNIQUE en DB
- **Les matchs CDM 2026 commencent le 11 juin 2026** — date de lock des prédictions tournoi/awards
- **The Odds API : 500 req/mois** — ne pas appeler à chaque visite, toujours passer par la DB
- **SofaScore : 100 req/mois sur le free tier RapidAPI** — mettre en cache aggressivement, ne fetch que le nécessaire
- **Matching SofaScore ↔ The Odds API** — pas d'id commun, matcher par nom d'équipe + date (voir `matchEvents()`)
- **Au premier lancement** : appeler `sofascore.getSeasons(16)` pour récupérer le `SOFASCORE_SEASON_ID` CDM 2026 et le stocker en `.env`

---

Commence par l'**Étape 1** : setup Supabase, appliquer le schéma DB, initialiser le bot Discord et le projet Next.js avec l'auth Discord OAuth.
