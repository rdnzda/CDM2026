import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)
const FD_KEY      = Deno.env.get('FOOTBALL_DATA_API_KEY')!
const BOT_WEBHOOK = Deno.env.get('BOT_RESOLVE_WEBHOOK') // optional webhook to notify bot

async function fetchMatchDetail(matchId: number) {
  const res = await fetch(`https://api.football-data.org/v4/matches/${matchId}`, {
    headers: { 'X-Auth-Token': FD_KEY },
  })
  return res.json()
}

function calcPoints(odds: number, stake: number, phaseMultiplier: number, boostMultiplier: number, wildcardDouble: boolean): number {
  return Math.round(odds * stake * phaseMultiplier * boostMultiplier * (wildcardDouble ? 2.0 : 1.0))
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

// Returns 'full' | 'partial' | 'lost' for result_combo bets
function resolveResultCombo(bet: any, match: any): 'full' | 'partial' | 'lost' {
  if (bet.prediction_result !== match.result) return 'lost'

  const hasScore  = bet.prediction_score_home != null
  const hasScorer = bet.prediction_scorer != null

  const scoreCorrect  = !hasScore  || (bet.prediction_score_home === match.final_score_home && bet.prediction_score_away === match.final_score_away)
  const scorerCorrect = !hasScorer || match.scorers?.some((s: string) => s.toLowerCase().includes((bet.prediction_scorer ?? '').toLowerCase()))

  return scoreCorrect && scorerCorrect ? 'full' : 'partial'
}

Deno.serve(async () => {
  try {
    // Find finished matches with pending bets
    const { data: finishedMatches } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'finished')

    if (!finishedMatches?.length) return new Response(JSON.stringify({ resolved: 0 }))

    let totalResolved = 0

    for (const match of finishedMatches) {
      // Fetch pending bets for this match
      const { data: pendingBets } = await supabase
        .from('bets')
        .select('*, users(*)')
        .eq('match_id', match.id)
        .eq('status', 'pending')

      if (!pendingBets?.length) continue

      // Fetch match detail if we don't have special results yet
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

        await supabase.from('matches').update({
          result_btts:      match.final_score_home > 0 && match.final_score_away > 0,
          result_over25:    (match.final_score_home + match.final_score_away) > 2.5,
          result_red_card:  redCards.length > 0,
          result_best_half: htHome + htAway > shHome + shAway ? 'home' : htHome + htAway < shHome + shAway ? 'away' : 'equal',
          scorers,
        }).eq('id', match.id)

        // Refresh match data
        const { data: updated } = await supabase.from('matches').select('*').eq('id', match.id).single()
        if (updated) Object.assign(match, updated)
      }

      for (const bet of pendingBets) {
        let status: string
        let pointsWon = 0

        if (bet.bet_type === 'result_combo') {
          const outcome = resolveResultCombo(bet, match)
          if (outcome === 'full') {
            status = 'won'
            pointsWon = calcPoints(bet.odds_at_bet_time, bet.stake, bet.phase_multiplier, bet.boost_multiplier || 1.0, bet.wildcard_used === 'double')
          } else if (outcome === 'partial' && bet.base_odds) {
            // Result correct but bonus(es) missed — pay out base odds only
            status = 'won'
            pointsWon = calcPoints(bet.base_odds, bet.stake, bet.phase_multiplier, bet.boost_multiplier || 1.0, bet.wildcard_used === 'double')
          } else {
            status = 'lost'
          }
        } else {
          const won = isBetWon(bet, match)
          status = won ? 'won' : 'lost'
          if (won) {
            pointsWon = calcPoints(bet.odds_at_bet_time, bet.stake, bet.phase_multiplier, bet.boost_multiplier || 1.0, bet.wildcard_used === 'double')
          }
        }

        // Insurance wildcard: refund if exact_score lost by 1 goal
        if (status === 'lost' && (
          bet.wildcard_used === 'insurance' &&
          bet.bet_type === 'exact_score' &&
          Math.abs((match.final_score_home - bet.prediction_score_home) + (match.final_score_away - bet.prediction_score_away)) === 1
        ) {
          status = 'refunded'
          pointsWon = bet.stake
        }

        // Update bet
        await supabase.from('bets').update({
          status,
          points_won:  pointsWon,
          resolved_at: new Date().toISOString(),
        }).eq('id', bet.id)

        // Update user points
        const pointsDelta = pointsWon - (status === 'lost' ? 0 : 0) // stake already frozen
        await supabase.from('users').update({
          total_points:  bet.users.total_points + pointsWon - bet.stake,
          frozen_points: Math.max(0, bet.users.frozen_points - bet.stake),
          bets_won:      status === 'won' ? bet.users.bets_won + 1 : bet.users.bets_won,
        }).eq('id', bet.user_id)

        totalResolved++
      }

      // Check combo legs for this match
      const { data: comboLegs } = await supabase
        .from('combo_legs')
        .select('*, combos(*)')
        .eq('match_id', match.id)
        .eq('status', 'pending')

      for (const leg of (comboLegs || [])) {
        const won = isBetWon(leg, match)
        await supabase.from('combo_legs').update({
          status:      won ? 'won' : 'lost',
          resolved_at: new Date().toISOString(),
        }).eq('id', leg.id)

        if (!won) {
          // Mark combo as lost
          await supabase.from('combos').update({ status: 'lost', resolved_at: new Date().toISOString() }).eq('id', leg.combo_id)
        }
      }
    }

    // Notify bot webhook if configured
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
