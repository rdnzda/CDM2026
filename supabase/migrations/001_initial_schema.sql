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
  home_team_id      INT,
  away_team_id      INT,
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
  odds_home         DECIMAL(6,2),
  odds_draw         DECIMAL(6,2),
  odds_away         DECIMAL(6,2),
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
  result_btts       BOOLEAN,
  result_over25     BOOLEAN,
  result_red_card   BOOLEAN,
  result_best_half  TEXT CHECK (result_best_half IN ('home','away','equal')),
  result_et         BOOLEAN,
  footballdata_match_id  INT UNIQUE,
  odds_api_event_id   TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ODDS SCORE EXACT
CREATE TABLE odds_exact_score (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id   UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  score_home INT NOT NULL,
  score_away INT NOT NULL,
  odds       DECIMAL(6,2) NOT NULL,
  UNIQUE(match_id, score_home, score_away)
);

-- ODDS BUTEURS
CREATE TABLE odds_scorers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id    UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  player_id   INT,
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
  player_id    INT,
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
CREATE INDEX idx_matches_sofascore  ON matches(footballdata_match_id);
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

-- TRIGGER updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ACHIEVEMENTS DATA
INSERT INTO achievements (code, name, description, icon, category, rarity) VALUES
  ('first_bet',        'Premier pari',          'Poser ton premier pari',                              '🎯', 'performance', 'common'),
  ('first_win',        'Première victoire',      'Gagner ton premier pari',                             '🏆', 'performance', 'common'),
  ('10_bets',          'Parieur assidu',         'Poser 10 paris',                                      '📊', 'performance', 'common'),
  ('50_bets',          'Parieur chevronné',      'Poser 50 paris',                                      '🔥', 'performance', 'rare'),
  ('5_win_streak',     'En feu',                 'Gagner 5 paris de suite',                             '🚀', 'performance', 'rare'),
  ('exact_score_win',  'Devin',                  'Prédire un score exact',                              '🔮', 'risk',        'rare'),
  ('3_exact_scores',   'Oracle',                 'Prédire 3 scores exacts',                             '🌟', 'risk',        'legendary'),
  ('high_odds_win',    'Audacieux',              'Gagner un pari à cote > 5.0',                         '💎', 'risk',        'rare'),
  ('combo_3_win',      'Combo maître',           'Gagner un combiné de 3+ sélections',                  '🎰', 'combo',       'rare'),
  ('combo_5_win',      'Combo légendaire',       'Gagner un combiné de 5+ sélections',                  '👑', 'combo',       'legendary'),
  ('first_duel',       'Duelliste',              'Participer à un duel 1v1',                            '⚔️', 'duel',        'common'),
  ('5_duels_won',      'Champion des duels',     'Gagner 5 duels 1v1',                                  '🥊', 'duel',        'rare'),
  ('duel_streak_3',    'Inarrêtable',            'Gagner 3 duels de suite',                             '💪', 'duel',        'rare'),
  ('daily_first',      'Lève-tôt',               'Participer au défi quotidien',                        '☀️', 'daily',       'common'),
  ('daily_winner',     'Champion du jour',       'Gagner un défi quotidien',                            '🌈', 'daily',       'rare'),
  ('tournament_top3',  'Prophète',               'Prédire correctement le top 3 du tournoi',            '🏅', 'tournament',  'legendary'),
  ('golden_boot_hit',  'Chasseur de buts',       'Prédire le meilleur buteur',                          '⚽', 'tournament',  'legendary'),
  ('double_wildcard',  'All-in',                 'Utiliser la wildcard double',                         '🃏', 'fun',         'common'),
  ('insurance_saved',  'Filet de sécurité',      'Être sauvé par la wildcard assurance',                '🛡️', 'fun',         'rare'),
  ('20k_points',       'Millionnaire',           'Atteindre 20 000 points',                             '💰', 'performance', 'rare'),
  ('50k_points',       'Maître du jeu',          'Atteindre 50 000 points',                             '🎖️', 'performance', 'legendary');
