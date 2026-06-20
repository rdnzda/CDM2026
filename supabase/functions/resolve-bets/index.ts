import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)
const FD_KEY      = Deno.env.get('FOOTBALL_DATA_API_KEY')!
const BOT_WEBHOOK = Deno.env.get('BOT_RESOLVE_WEBHOOK')

async function fetchMatchDetail(matchId: number) {
  const res = await fetch(`https://api.football-data.org/v4/matches/${matchId}`, {
    headers: { 'X-Auth-Token': FD_KEY },
  })
  return res.json()
}

function getStreakMultiplier(streak: number): number {
  if (streak >= 10) return 1.5
  if (streak >= 7)  return 1.3
  if (streak >= 5)  return 1.2
  if (streak >= 3)  return 1.1
  return 1.0
}

// Malus top 3 — actif en phase de groupes à partir du 22/06/2026 (annoncé sur Discord)
const TOP3_MALUS_START = new Date('2026-06-22T00:00:00+02:00')
const TOP3_MALUS_BASE_PCT = [1.15, 1.10, 1.05] // rank 0 = 1er, 1 = 2e, 2 = 3e
const TOP3_MALUS_STREAK_STEP = 0.05 // +5 points par défaite consécutive dans le top 3

function getTop3MalusMultiplier(rank: number, top3LoseStreak: number): number {
  return TOP3_MALUS_BASE_PCT[rank] + TOP3_MALUS_STREAK_STEP * (top3LoseStreak - 1)
}

async function getTop3UserIds(): Promise<string[]> {
  const { data } = await supabase
    .from('users')
    .select('id')
    .order('total_points', { ascending: false })
    .limit(3)
  return (data ?? []).map((u: any) => u.id)
}

function isTop3MalusActive(match: any): boolean {
  return match.phase === 'group' && new Date() >= TOP3_MALUS_START
}

function calcPoints(odds: number, stake: number, phaseMultiplier: number, boostMultiplier: number, wildcardDouble: boolean, streakMultiplier = 1.0): number {
  return Math.round(odds * stake * phaseMultiplier * boostMultiplier * (wildcardDouble ? 2.0 : 1.0) * streakMultiplier)
}

function isBetWon(bet: any, match: any): boolean {
  switch (bet.bet_type) {
    case 'result':      return bet.prediction_result === match.result
    case 'exact_score': return bet.prediction_score_home === match.final_score_home && bet.prediction_score_away === match.final_score_away
    case 'scorer':      return match.scorers?.some((s: string) => s.toLowerCase().includes((bet.prediction_scorer ?? '').toLowerCase()))
    case 'btts':        return bet.prediction_bool === match.result_btts
    case 'over_under':  return bet.prediction_bool === match.result_over25
    case 'red_card':    return bet.prediction_bool === match.result_red_card
    case 'best_half':   return bet.prediction_half === match.result_best_half
    case 'extra_time':  return bet.prediction_bool === match.result_et
    default: return false
  }
}

function resolveResultCombo(bet: any, match: any): 'full' | 'partial' | 'lost' {
  if (bet.prediction_result !== match.result) return 'lost'
  const hasScore  = bet.prediction_score_home != null
  const hasScorer = bet.prediction_scorer != null
  const scoreCorrect  = !hasScore || (bet.prediction_score_home === match.final_score_home && bet.prediction_score_away === match.final_score_away)
  const scorerCorrect = !hasScorer || match.scorers?.some((s: string) => s.toLowerCase().includes((bet.prediction_scorer ?? '').toLowerCase()))
  // Score prédit mais faux → perte totale (pas de fallback gratuit sur le résultat)
  if (hasScore && !scoreCorrect) return 'lost'
  // Résultat correct, score correct ou absent, buteur faux → fallback base_odds
  return scorerCorrect ? 'full' : 'partial'
}

Deno.serve(async () => {
  try {
    const { data: finishedMatches } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'finished')

    if (!finishedMatches?.length) return new Response(JSON.stringify({ resolved: 0 }))

    let totalResolved = 0

    for (const match of finishedMatches) {
      const { data: pendingBets } = await supabase
        .from('bets')
        .select('*, users(*)')
        .eq('match_id', match.id)
        .eq('status', 'pending')

      const { data: pendingComboLegs } = await supabase
        .from('combo_legs')
        .select('*, combos(id, user_id, stake, potential_win, status)')
        .eq('match_id', match.id)
        .eq('status', 'pending')

      const hasPendingWork = (pendingBets?.length ?? 0) > 0 || (pendingComboLegs?.length ?? 0) > 0
      if (!hasPendingWork) continue

      // Guard: never resolve bets if score not yet available (free-tier API lag)
      if (match.final_score_home == null) continue

      // Ensure match special results are populated
      if (match.result_btts == null && match.footballdata_match_id) {
        const detail   = await fetchMatchDetail(match.footballdata_match_id)
        const goals    = detail.goals || []
        const bookings = detail.bookings || []
        const htHome   = detail.score?.halfTime?.home ?? 0
        const htAway   = detail.score?.halfTime?.away ?? 0
        const shHome   = (match.final_score_home ?? 0) - htHome
        const shAway   = (match.final_score_away ?? 0) - htAway
        const redCards = bookings.filter((b: any) => b.card === 'RED_CARD' || b.card === 'YELLOW_RED_CARD')
        const scorers  = goals.filter((g: any) => g.type !== 'OWN').map((g: any) => g.scorer?.name).filter(Boolean)

        // FIX: result_et from score.duration (REGULAR | EXTRA_TIME | PENALTY_SHOOTOUT)
        const resultEt = ['EXTRA_TIME', 'PENALTY_SHOOTOUT'].includes(detail.score?.duration ?? '')

        await supabase.from('matches').update({
          result_btts:      match.final_score_home > 0 && match.final_score_away > 0,
          result_over25:    (match.final_score_home + match.final_score_away) > 2.5,
          result_red_card:  redCards.length > 0,
          result_best_half: htHome + htAway > shHome + shAway ? 'home' : htHome + htAway < shHome + shAway ? 'away' : 'equal',
          result_et:        resultEt,
          scorers,
        }).eq('id', match.id)

        const { data: updated } = await supabase.from('matches').select('*').eq('id', match.id).single()
        if (updated) Object.assign(match, updated)
      }

      // ── Resolve simple bets ──
      for (const bet of (pendingBets ?? [])) {
        // Always fetch fresh user state to avoid overwrite bug when same user has multiple bets on same match
        const { data: freshUser } = await supabase
          .from('users').select('total_points, frozen_points, bets_won, total_bets, bet_win_streak, top3_lose_streak')
          .eq('id', bet.user_id).single()
        if (!freshUser) continue

        const streakMult = getStreakMultiplier(freshUser.bet_win_streak)
        let status: string
        let pointsWon = 0

        if (bet.bet_type === 'result_combo') {
          const outcome = resolveResultCombo(bet, match)
          if (outcome === 'full') {
            status = 'won'
            pointsWon = calcPoints(bet.odds_at_bet_time, bet.stake, bet.phase_multiplier, bet.boost_multiplier || 1.0, bet.wildcard_used === 'double', streakMult)
          } else if (outcome === 'partial' && bet.base_odds) {
            status = 'won'
            pointsWon = calcPoints(bet.base_odds, bet.stake, bet.phase_multiplier, bet.boost_multiplier || 1.0, bet.wildcard_used === 'double', streakMult)
          } else {
            status = 'lost'
          }
        } else {
          const won = isBetWon(bet, match)
          status = won ? 'won' : 'lost'
          if (won) {
            pointsWon = calcPoints(bet.odds_at_bet_time, bet.stake, bet.phase_multiplier, bet.boost_multiplier || 1.0, bet.wildcard_used === 'double', streakMult)
          }
        }

        // FIX: insurance wildcard — use |diff_home| + |diff_away| not |(diff_home + diff_away)|
        if (
          status === 'lost' &&
          bet.wildcard_used === 'insurance' &&
          bet.bet_type === 'exact_score' &&
          Math.abs(match.final_score_home - bet.prediction_score_home) +
          Math.abs(match.final_score_away - bet.prediction_score_away) === 1
        ) {
          status = 'refunded'
          pointsWon = bet.stake
        }

        // Malus top 3 : une défaite en phase de groupes (à partir du 22/06) coûte 105-115% de la mise
        // selon le rang, et davantage si la défaite s'enchaîne en restant dans le top 3
        let effectiveStake = bet.stake
        let top3LoseStreak  = freshUser.top3_lose_streak
        if (status === 'won') {
          top3LoseStreak = 0
        } else if (status === 'lost') {
          const top3Ids = isTop3MalusActive(match) ? await getTop3UserIds() : []
          const rank = top3Ids.indexOf(bet.user_id)
          if (rank !== -1) {
            top3LoseStreak = freshUser.top3_lose_streak + 1
            effectiveStake = Math.round(bet.stake * getTop3MalusMultiplier(rank, top3LoseStreak))
          } else {
            top3LoseStreak = 0
          }
        }

        await supabase.from('bets').update({
          status,
          points_won:  pointsWon,
          resolved_at: new Date().toISOString(),
        }).eq('id', bet.id)

        await supabase.from('users').update({
          total_points:     freshUser.total_points + pointsWon - effectiveStake,
          frozen_points:    Math.max(0, freshUser.frozen_points - bet.stake),
          bets_won:         status === 'won' ? freshUser.bets_won + 1 : freshUser.bets_won,
          total_bets:       freshUser.total_bets + 1,
          bet_win_streak:   status === 'won' ? freshUser.bet_win_streak + 1 : 0,
          top3_lose_streak: top3LoseStreak,
        }).eq('id', bet.user_id)

        totalResolved++
      }

      // ── Resolve combo legs ──
      for (const leg of (pendingComboLegs ?? [])) {
        const combo = leg.combos as any
        if (!combo || combo.status !== 'pending') continue

        const won = isBetWon(leg, match)
        await supabase.from('combo_legs').update({
          status:      won ? 'won' : 'lost',
          resolved_at: new Date().toISOString(),
        }).eq('id', leg.id)

        if (!won) {
          // Leg lost → combo lost immediately
          if (combo.status === 'pending') {
            await supabase.from('combos').update({
              status:      'lost',
              resolved_at: new Date().toISOString(),
            }).eq('id', leg.combo_id)

            // FIX: unfreeze stake + decrement total_points + increment total_bets
            const { data: user } = await supabase
              .from('users')
              .select('total_points, frozen_points, total_bets, top3_lose_streak')
              .eq('id', combo.user_id)
              .single()

            if (user) {
              let effectiveStake = combo.stake
              let top3LoseStreak  = 0
              const top3Ids = isTop3MalusActive(match) ? await getTop3UserIds() : []
              const rank = top3Ids.indexOf(combo.user_id)
              if (rank !== -1) {
                top3LoseStreak = user.top3_lose_streak + 1
                effectiveStake = Math.round(combo.stake * getTop3MalusMultiplier(rank, top3LoseStreak))
              }

              await supabase.from('users').update({
                total_points:     user.total_points - effectiveStake,
                frozen_points:    Math.max(0, user.frozen_points - combo.stake),
                total_bets:       user.total_bets + 1,
                bet_win_streak:   0,
                top3_lose_streak: top3LoseStreak,
              }).eq('id', combo.user_id)
            }
            totalResolved++
          }
        } else {
          // Leg won → check if ALL legs of this combo are now won
          const { data: allLegs } = await supabase
            .from('combo_legs')
            .select('id, status')
            .eq('combo_id', leg.combo_id)

          // Re-fetch combo to check its current status (may have been updated by another leg in same run)
          const { data: freshCombo } = await supabase
            .from('combos')
            .select('status, stake, potential_win, user_id')
            .eq('id', leg.combo_id)
            .single()

          if (!freshCombo || freshCombo.status !== 'pending') continue

          const allWon = allLegs?.every(l => l.status === 'won')

          if (allWon) {
            // FIX: pay out the combo win
            const { data: user } = await supabase
              .from('users')
              .select('total_points, frozen_points, bets_won, total_bets, bet_win_streak')
              .eq('id', freshCombo.user_id)
              .single()

            if (user) {
              const comboStreakMult = getStreakMultiplier(user.bet_win_streak)
              const actualPayout = Math.round(freshCombo.potential_win * comboStreakMult)

              await supabase.from('combos').update({
                status:      'won',
                resolved_at: new Date().toISOString(),
                points_won:  actualPayout,
              }).eq('id', leg.combo_id)

              await supabase.from('users').update({
                total_points:     user.total_points + actualPayout - freshCombo.stake,
                frozen_points:    Math.max(0, user.frozen_points - freshCombo.stake),
                bets_won:         user.bets_won + 1,
                total_bets:       user.total_bets + 1,
                bet_win_streak:   user.bet_win_streak + 1,
                top3_lose_streak: 0,
              }).eq('id', freshCombo.user_id)

              totalResolved++
            }
          }
        }
      }
    }

    // ── Cleanup expired challenges (unfreeze challenger's stake) ──
    const { data: expiredChallenges } = await supabase
      .from('challenges')
      .select('id, challenger_id, stake')
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString())

    for (const ch of expiredChallenges ?? []) {
      await supabase.from('challenges').update({ status: 'expired' }).eq('id', ch.id)
      const { data: challenger } = await supabase
        .from('users').select('frozen_points').eq('id', ch.challenger_id).single()
      if (challenger) {
        await supabase.from('users')
          .update({ frozen_points: Math.max(0, challenger.frozen_points - ch.stake) })
          .eq('id', ch.challenger_id)
      }
    }

    if (BOT_WEBHOOK && totalResolved > 0) {
      await fetch(BOT_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: totalResolved }),
      }).catch(() => {})
    }

    return new Response(JSON.stringify({ resolved: totalResolved }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
