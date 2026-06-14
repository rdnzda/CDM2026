ALTER TABLE users ADD COLUMN bet_win_streak INT NOT NULL DEFAULT 0;

DROP VIEW IF EXISTS leaderboard_points;
CREATE VIEW leaderboard_points AS
SELECT
  u.id, u.discord_id, u.username, u.avatar_url,
  u.total_points, u.total_bets, u.bets_won,
  CASE WHEN u.total_bets > 0
    THEN ROUND(u.bets_won * 100.0 / u.total_bets) ELSE 0
  END AS winrate,
  u.avg_odds, u.duels_won, u.duels_lost,
  u.bet_win_streak,
  RANK() OVER (ORDER BY u.total_points DESC) AS rank_points
FROM users u ORDER BY u.total_points DESC;
