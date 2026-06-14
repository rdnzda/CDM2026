-- Add x3 special boost type to constraint
ALTER TABLE user_boosts DROP CONSTRAINT user_boosts_boost_type_check;
ALTER TABLE user_boosts ADD CONSTRAINT user_boosts_boost_type_check
  CHECK (boost_type = ANY (ARRAY['x15'::text, 'x20_exact'::text, 'x3'::text]));
