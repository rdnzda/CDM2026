import { supabase } from './supabase'
import { calcPoints } from './points'
import { checkBalance, checkBetDeadline } from '../utils/validators'

interface PlaceBetOptions {
  userId: string
  matchId: string
  betType: string
  stake: number
  predictionResult?: string
  predictionScoreHome?: number
  predictionScoreAway?: number
  predictionScorer?: string
  predictionBool?: boolean
  predictionHalf?: string
  boostId?: string
  wildcardId?: string
}

export async function placeBet(user: any, match: any, opts: PlaceBetOptions) {
  // Validate deadline
  const isLastMinute = false // TODO: check if last_minute wildcard used
  const deadlineError = checkBetDeadline(match, isLastMinute)
  if (deadlineError) return { error: deadlineError }

  // Validate balance
  const maxStake = opts.betType === 'result' ? 2000 : 2000
  if (opts.stake > maxStake) return { error: `Mise maximum : ${maxStake} pts` }
  const balanceError = checkBalance(user, opts.stake)
  if (balanceError) return { error: balanceError }

  // Determine odds from match
  const oddsMap: Record<string, number | null> = {
    result:     opts.predictionResult === 'home' ? match.odds_home : opts.predictionResult === 'away' ? match.odds_away : match.odds_draw,
    btts:       opts.predictionBool ? match.odds_btts_yes : match.odds_btts_no,
    over_under: opts.predictionBool ? match.odds_over25 : match.odds_under25,
    red_card:   opts.predictionBool ? match.odds_red_card_yes : match.odds_red_card_no,
    best_half:  opts.predictionHalf === 'home' ? match.odds_fh_win_home : opts.predictionHalf === 'away' ? match.odds_fh_win_away : match.odds_fh_equal,
    extra_time: opts.predictionBool ? match.odds_et_yes : match.odds_et_no,
    exact_score: null, // fetched from odds_exact_score table
    scorer: null,      // fetched from odds_scorers table
  }

  let oddsAtBetTime = oddsMap[opts.betType] ?? 0

  if (opts.betType === 'exact_score') {
    const { data: exactOdds } = await supabase
      .from('odds_exact_score')
      .select('odds')
      .eq('match_id', opts.matchId)
      .eq('score_home', opts.predictionScoreHome!)
      .eq('score_away', opts.predictionScoreAway!)
      .single()
    oddsAtBetTime = exactOdds?.odds ?? 0
  }

  if (opts.betType === 'scorer') {
    const { data: scorerOdds } = await supabase
      .from('odds_scorers')
      .select('odds')
      .eq('match_id', opts.matchId)
      .ilike('player_name', `%${opts.predictionScorer}%`)
      .limit(1)
      .single()
    oddsAtBetTime = scorerOdds?.odds ?? 0
  }

  if (!oddsAtBetTime) return { error: 'Cote non disponible pour cette prédiction.' }

  // Handle boost
  let boostMultiplier = 1.0
  if (opts.boostId) {
    const { data: boost } = await supabase
      .from('user_boosts')
      .select('*')
      .eq('id', opts.boostId)
      .eq('user_id', user.id)
      .eq('used', false)
      .single()
    if (!boost) return { error: 'Boost introuvable ou déjà utilisé.' }
    if (boost.boost_type === 'x20_exact' && opts.betType !== 'exact_score')
      return { error: 'Le boost ×2.0 est réservé aux scores exacts.' }
    boostMultiplier = boost.boost_type === 'x20_exact' ? 2.0 : 1.5
  }

  const pointsIfWon = calcPoints(oddsAtBetTime, opts.stake, match.phase_multiplier, boostMultiplier, false)

  const { data: bet, error } = await supabase.from('bets').insert({
    user_id:              user.id,
    match_id:             opts.matchId,
    bet_type:             opts.betType,
    prediction_result:    opts.predictionResult,
    prediction_score_home: opts.predictionScoreHome,
    prediction_score_away: opts.predictionScoreAway,
    prediction_scorer:    opts.predictionScorer,
    prediction_bool:      opts.predictionBool,
    prediction_half:      opts.predictionHalf,
    stake:                opts.stake,
    odds_at_bet_time:     oddsAtBetTime,
    phase_multiplier:     match.phase_multiplier,
    boost_used:           !!opts.boostId,
    boost_multiplier:     boostMultiplier,
  }).select().single()

  if (error) {
    if (error.code === '23505') return { error: 'Tu as déjà un pari de ce type sur ce match.' }
    return { error: error.message }
  }

  // Freeze stake + mark boost as used
  await supabase.from('users').update({
    frozen_points: user.frozen_points + opts.stake,
  }).eq('id', user.id)

  if (opts.boostId && bet) {
    await supabase.from('user_boosts').update({
      used: true, used_on_bet_id: bet.id, used_at: new Date().toISOString(),
    }).eq('id', opts.boostId)
  }

  return { bet, pointsIfWon }
}
