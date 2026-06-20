-- Tracks consecutive losses while ranked in the top 3, used by the group-phase top-3 malus
ALTER TABLE users ADD COLUMN top3_lose_streak INT NOT NULL DEFAULT 0;
