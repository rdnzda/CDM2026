-- Fix leaderboard views: add avatar_url + bet_win_streak, lower thresholds

DROP VIEW IF EXISTS leaderboard_winrate;
DROP VIEW IF EXISTS leaderboard_risk;
DROP VIEW IF EXISTS leaderboard_duels;

CREATE VIEW leaderboard_winrate AS
SELECT
  id, username, avatar_url, bet_win_streak,
  ROUND((bets_won::numeric * 100.0) / total_bets::numeric) AS winrate,
  total_bets,
  RANK() OVER (ORDER BY ROUND((bets_won::numeric * 100.0) / total_bets::numeric) DESC) AS rank_winrate
FROM users
WHERE total_bets >= 3
ORDER BY 5 DESC;

CREATE VIEW leaderboard_risk AS
SELECT
  u.id, u.username, u.avatar_url, u.bet_win_streak,
  ROUND(AVG(b.odds_at_bet_time)::numeric, 2) AS avg_odds,
  COUNT(b.id) AS total_bets,
  RANK() OVER (ORDER BY ROUND(AVG(b.odds_at_bet_time)::numeric, 2) DESC) AS rank_risk
FROM users u
JOIN bets b ON b.user_id = u.id
GROUP BY u.id, u.username, u.avatar_url, u.bet_win_streak
HAVING COUNT(b.id) >= 3
ORDER BY avg_odds DESC;

CREATE VIEW leaderboard_duels AS
SELECT
  id, username, avatar_url, bet_win_streak,
  duels_won, duels_lost, duels_streak,
  RANK() OVER (ORDER BY duels_won DESC) AS rank_duels
FROM users
WHERE (duels_won + duels_lost) >= 1
ORDER BY duels_won DESC;
