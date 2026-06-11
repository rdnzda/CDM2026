CREATE TABLE daily_claims (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  claim_date DATE NOT NULL,
  points     INT  NOT NULL DEFAULT 200,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, claim_date)
);

CREATE INDEX ON daily_claims(user_id, claim_date);
