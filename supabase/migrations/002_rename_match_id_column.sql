-- Rename column to match football-data.org (replacing API-Football)
ALTER TABLE matches RENAME COLUMN apifootball_fixture_id TO footballdata_match_id;
