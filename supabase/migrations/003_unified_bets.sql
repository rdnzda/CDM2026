-- Add base_odds column for partial payout on result_combo bets
ALTER TABLE bets ADD COLUMN IF NOT EXISTS base_odds DECIMAL(6,2);

-- Extend bet_type to include result_combo
ALTER TABLE bets DROP CONSTRAINT IF EXISTS bets_bet_type_check;
ALTER TABLE bets ADD CONSTRAINT bets_bet_type_check CHECK (bet_type IN (
  'result', 'exact_score', 'scorer',
  'btts', 'over_under', 'red_card', 'best_half', 'extra_time',
  'result_combo'
));
