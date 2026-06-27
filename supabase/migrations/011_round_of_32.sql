-- CDM 2026 has 48 teams: first knockout round is a Round of 32
-- Add round_of_32 phase to matches and user_boosts

ALTER TABLE matches
  DROP CONSTRAINT IF EXISTS matches_phase_check,
  ADD CONSTRAINT matches_phase_check
    CHECK (phase IN ('group','round_of_32','round_of_16','quarter','semi','final'));

ALTER TABLE user_boosts
  DROP CONSTRAINT IF EXISTS user_boosts_phase_check,
  ADD CONSTRAINT user_boosts_phase_check
    CHECK (phase IN ('group','round_of_32','round_of_16','quarter','semi','final'));
