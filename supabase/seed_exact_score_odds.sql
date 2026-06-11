-- seed_exact_score_odds.sql — Cotes scores exacts CDM 2026
-- Insère les scorelines les plus probables pour chaque match.
-- Idempotent : UNIQUE(match_id, score_home, score_away) + WHERE NOT EXISTS.
-- Exécuter dans : Supabase Dashboard → SQL Editor

WITH score_odds (score_home, score_away, odds) AS (VALUES

  -- ── Nuls ──────────────────────────────────────────────────────────────
  (0, 0,  6.50),
  (1, 1,  5.00),
  (2, 2, 14.00),
  (3, 3, 35.00),

  -- ── Victoire domicile (1 but) ─────────────────────────────────────────
  (1, 0,  7.00),
  (2, 1,  8.00),
  (3, 2, 20.00),
  (4, 3, 60.00),

  -- ── Victoire domicile (écart 2) ───────────────────────────────────────
  (2, 0,  9.00),
  (3, 1, 16.00),
  (4, 2, 34.00),

  -- ── Victoire domicile (écart 3+) ─────────────────────────────────────
  (3, 0, 15.00),
  (4, 0, 25.00),
  (4, 1, 30.00),
  (5, 0, 45.00),
  (5, 1, 55.00),
  (5, 2, 70.00),

  -- ── Victoire extérieur (1 but) ────────────────────────────────────────
  (0, 1,  8.00),
  (1, 2,  9.50),
  (2, 3, 22.00),
  (3, 4, 65.00),

  -- ── Victoire extérieur (écart 2) ─────────────────────────────────────
  (0, 2, 11.00),
  (1, 3, 19.00),
  (2, 4, 37.00),

  -- ── Victoire extérieur (écart 3+) ────────────────────────────────────
  (0, 3, 18.00),
  (0, 4, 29.00),
  (1, 4, 35.00),
  (0, 5, 50.00),
  (1, 5, 60.00),
  (2, 5, 75.00)

)
INSERT INTO odds_exact_score (match_id, score_home, score_away, odds)
SELECT m.id, so.score_home, so.score_away, so.odds
FROM matches m
CROSS JOIN score_odds so
WHERE NOT EXISTS (
  SELECT 1 FROM odds_exact_score oes
  WHERE oes.match_id = m.id
  AND oes.score_home = so.score_home
  AND oes.score_away = so.score_away
);
