-- Conversion des points : phase de groupes (milliers) → phase éliminatoire (centaines)
-- Diviser par 100 tous les soldes et mises encore en attente

UPDATE users SET
  total_points  = GREATEST(0, ROUND(total_points  / 100.0)),
  frozen_points = GREATEST(0, ROUND(frozen_points / 100.0));

-- Mises des paris simples encore en attente (group phase)
UPDATE bets SET
  stake = GREATEST(0, ROUND(stake / 100.0))
WHERE status = 'pending';

-- Mises des combinés en attente
UPDATE combos SET
  stake         = GREATEST(0, ROUND(stake / 100.0)),
  potential_win = GREATEST(0, ROUND(potential_win / 100.0))
WHERE status = 'pending';
