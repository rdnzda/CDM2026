-- Persist match-results announcement state so bot restarts don't re-post every finished match
ALTER TABLE matches ADD COLUMN results_announced BOOLEAN NOT NULL DEFAULT FALSE;
