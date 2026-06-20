import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { calcPoints } from '@/lib/points'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json()
  const { matchId, betType, stake, predictionResult, predictionScoreHome, predictionScoreAway, predictionScorer, predictionBool, predictionHalf, boostId, wildcardId } = body

  if (!matchId || !betType || !stake) return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  if (stake < 100 || stake > 2000) return NextResponse.json({ error: 'Mise entre 100 et 2000 pts' }, { status: 400 })

  const service = await createServiceClient()

  const discordId = authUser.user_metadata?.provider_id ?? authUser.user_metadata?.sub
  const { data: dbUser } = await service.from('users').select('*').eq('discord_id', discordId).single()
  if (!dbUser) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

  const available = dbUser.total_points - dbUser.frozen_points
  if (available < stake) return NextResponse.json({ error: `Solde insuffisant (${available} pts disponibles)` }, { status: 400 })

  const { data: match } = await service.from('matches').select('*').eq('id', matchId).single()
  if (!match) return NextResponse.json({ error: 'Match introuvable' }, { status: 404 })

  // Validate wildcard before the deadline check — "last_minute" bypasses bets_locked_at
  let wildcard: { id: string; type: string } | null = null
  if (wildcardId) {
    const { data: wc } = await service.from('user_wildcards').select('id, type, used, user_id').eq('id', wildcardId).single()
    if (!wc) return NextResponse.json({ error: 'Wildcard introuvable' }, { status: 400 })
    if (wc.user_id !== dbUser.id) return NextResponse.json({ error: 'Wildcard invalide' }, { status: 403 })
    if (wc.used) return NextResponse.json({ error: 'Wildcard déjà utilisée' }, { status: 400 })
    if (wc.type === 'insurance' && !(betType === 'result_combo' && predictionScoreHome != null && predictionScoreAway != null)) {
      return NextResponse.json({ error: 'La wildcard Assurance nécessite un pari sur un score exact' }, { status: 400 })
    }
    wildcard = wc
  }

  const isLastMinute = wildcard?.type === 'last_minute'
  const now          = Date.now()
  const tenthMinute  = new Date(match.kickoff_at).getTime() + 10 * 60 * 1000

  if (match.status === 'finished') return NextResponse.json({ error: 'Paris fermés pour ce match' }, { status: 400 })
  if (isLastMinute) {
    if (now >= tenthMinute) return NextResponse.json({ error: 'La wildcard Dernière Minute ne peut s\'utiliser qu\'avant la 10e minute.' }, { status: 400 })
  } else {
    if (match.status !== 'upcoming') return NextResponse.json({ error: 'Paris fermés pour ce match' }, { status: 400 })
    if (now >= new Date(match.bets_locked_at).getTime()) return NextResponse.json({ error: 'Paris fermés pour ce match' }, { status: 400 })
  }

  let oddsAtBetTime = 0
  let baseOdds: number | null = null

  if (betType === 'result_combo') {
    // Unified bet: result (required) + optional exact score + optional scorer
    if (!predictionResult) return NextResponse.json({ error: 'Résultat requis' }, { status: 400 })

    baseOdds = predictionResult === 'home' ? match.odds_home
      : predictionResult === 'draw' ? match.odds_draw
      : match.odds_away

    if (!baseOdds) return NextResponse.json({ error: 'Cote résultat non disponible' }, { status: 400 })

    oddsAtBetTime = baseOdds

    // Score bonus: use exact_score odds (already implies result direction)
    if (predictionScoreHome != null && predictionScoreAway != null) {
      const { data: exactOdds } = await service
        .from('odds_exact_score').select('odds')
        .eq('match_id', matchId)
        .eq('score_home', predictionScoreHome)
        .eq('score_away', predictionScoreAway)
        .single()
      if (exactOdds?.odds) oddsAtBetTime = exactOdds.odds
    }

    // Scorer bonus: multiplicative
    if (predictionScorer) {
      const { data: scorerOdds } = await service
        .from('odds_scorers').select('odds')
        .eq('match_id', matchId)
        .ilike('player_name', `%${predictionScorer}%`)
        .limit(1).single()
      if (scorerOdds?.odds) oddsAtBetTime = oddsAtBetTime * scorerOdds.odds
    }

  } else {
    // Legacy single-market bets
    const oddsMap: Record<string, number | null> = {
      result:     predictionResult === 'home' ? match.odds_home : predictionResult === 'away' ? match.odds_away : match.odds_draw,
      btts:       predictionBool ? match.odds_btts_yes : match.odds_btts_no,
      over_under: predictionBool ? match.odds_over25 : match.odds_under25,
      red_card:   predictionBool ? match.odds_red_card_yes : match.odds_red_card_no,
      best_half:  predictionHalf === 'home' ? match.odds_fh_win_home : predictionHalf === 'away' ? match.odds_fh_win_away : match.odds_fh_equal,
      extra_time: predictionBool ? match.odds_et_yes : match.odds_et_no,
      exact_score: null,
      scorer: null,
    }

    oddsAtBetTime = oddsMap[betType] ?? 0

    if (betType === 'exact_score') {
      const { data: exactOdds } = await service.from('odds_exact_score').select('odds').eq('match_id', matchId).eq('score_home', predictionScoreHome).eq('score_away', predictionScoreAway).single()
      oddsAtBetTime = exactOdds?.odds ?? 0
    }
    if (betType === 'scorer') {
      const { data: scorerOdds } = await service.from('odds_scorers').select('odds').eq('match_id', matchId).ilike('player_name', `%${predictionScorer}%`).limit(1).single()
      oddsAtBetTime = scorerOdds?.odds ?? 0
    }
  }

  if (!oddsAtBetTime) return NextResponse.json({ error: 'Cote non disponible' }, { status: 400 })

  // Validate and apply boost if provided
  let boostMultiplier = 1.0
  let boostUsed = false

  if (boostId) {
    const { data: boost } = await service.from('user_boosts').select('*').eq('id', boostId).single()
    if (!boost) return NextResponse.json({ error: 'Boost introuvable' }, { status: 400 })
    if (boost.user_id !== dbUser.id) return NextResponse.json({ error: 'Boost invalide' }, { status: 403 })
    if (boost.used) return NextResponse.json({ error: 'Boost déjà utilisé' }, { status: 400 })
    if (boost.phase !== match.phase) return NextResponse.json({ error: 'Ce boost ne s\'applique pas à cette phase' }, { status: 400 })
    if (boost.boost_type === 'x20_exact') {
      const hasScore = predictionScoreHome != null && predictionScoreAway != null
      if (betType !== 'result_combo' || !hasScore) {
        return NextResponse.json({ error: 'Le boost ×2.0 est réservé aux paris score exact' }, { status: 400 })
      }
    }
    boostMultiplier = boost.boost_type === 'x15' ? 1.5 : boost.boost_type === 'x3' ? 3.0 : 2.0
    boostUsed = true
  }

  const wildcardDouble = wildcard?.type === 'double'
  const pointsIfWon = calcPoints(oddsAtBetTime, stake, match.phase_multiplier, boostMultiplier, wildcardDouble)
  const basePointsIfWon = baseOdds ? calcPoints(baseOdds, stake, match.phase_multiplier, boostMultiplier, wildcardDouble) : null

  const { data: bet, error } = await service.from('bets').insert({
    user_id:               dbUser.id,
    match_id:              matchId,
    bet_type:              betType,
    prediction_result:     predictionResult,
    prediction_score_home: predictionScoreHome ?? null,
    prediction_score_away: predictionScoreAway ?? null,
    prediction_scorer:     predictionScorer ?? null,
    prediction_bool:       predictionBool ?? null,
    prediction_half:       predictionHalf ?? null,
    stake,
    odds_at_bet_time:      oddsAtBetTime,
    base_odds:             baseOdds,
    phase_multiplier:      match.phase_multiplier,
    boost_multiplier:      boostMultiplier,
    boost_used:            boostUsed,
    wildcard_used:         wildcard?.type ?? null,
  }).select().single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Tu as déjà un pari de ce type sur ce match' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: newAvgOdds } = await service
    .from('bets')
    .select('odds_at_bet_time')
    .eq('user_id', dbUser.id)
  const avgOdds = newAvgOdds?.length
    ? Math.round((newAvgOdds.reduce((s, b) => s + Number(b.odds_at_bet_time), 0) / newAvgOdds.length) * 100) / 100
    : oddsAtBetTime

  await service.from('users').update({
    frozen_points: dbUser.frozen_points + stake,
    avg_odds: avgOdds,
  }).eq('id', dbUser.id)

  if (boostId && boostUsed) {
    await service.from('user_boosts').update({ used: true }).eq('id', boostId)
  }

  if (wildcard) {
    await service.from('user_wildcards').update({
      used: true, used_on_bet_id: bet.id, used_at: new Date().toISOString(),
    }).eq('id', wildcard.id)
  }

  return NextResponse.json({ bet, pointsIfWon, basePointsIfWon })
}
