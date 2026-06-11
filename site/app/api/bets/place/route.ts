import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { calcPoints } from '@/lib/points'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json()
  const { matchId, betType, stake, predictionResult, predictionScoreHome, predictionScoreAway, predictionScorer, predictionBool, predictionHalf } = body

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
  if (match.status !== 'upcoming') return NextResponse.json({ error: 'Paris fermés pour ce match' }, { status: 400 })
  if (new Date() >= new Date(match.bets_locked_at)) return NextResponse.json({ error: 'Paris fermés pour ce match' }, { status: 400 })

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

  const pointsIfWon = calcPoints(oddsAtBetTime, stake, match.phase_multiplier, 1.0, false)
  const basePointsIfWon = baseOdds ? calcPoints(baseOdds, stake, match.phase_multiplier, 1.0, false) : null

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
    boost_multiplier:      1.0,
  }).select().single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Tu as déjà un pari de ce type sur ce match' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await service.from('users').update({ frozen_points: dbUser.frozen_points + stake }).eq('id', dbUser.id)

  return NextResponse.json({ bet, pointsIfWon, basePointsIfWon })
}
