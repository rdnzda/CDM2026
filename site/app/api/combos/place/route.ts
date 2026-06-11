import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type Leg = {
  matchId: string
  betType: string
  predictionResult?: string
  predictionBool?: boolean
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json()
  const { legs, stake }: { legs: Leg[]; stake: number } = body

  if (!Array.isArray(legs) || legs.length < 2 || legs.length > 10)
    return NextResponse.json({ error: 'Le combiné doit avoir entre 2 et 10 sélections.' }, { status: 400 })
  if (stake < 100 || stake > 1000)
    return NextResponse.json({ error: 'Mise entre 100 et 1000 pts.' }, { status: 400 })

  const uniqueMatches = new Set(legs.map(l => l.matchId))
  if (uniqueMatches.size !== legs.length)
    return NextResponse.json({ error: 'Maximum 1 sélection par match.' }, { status: 400 })

  const service = await createServiceClient()
  const discordId = authUser.user_metadata?.provider_id ?? authUser.user_metadata?.sub
  const { data: dbUser } = await service.from('users').select('*').eq('discord_id', discordId).single()
  if (!dbUser) return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 })

  const available = dbUser.total_points - dbUser.frozen_points
  if (available < stake) return NextResponse.json({ error: `Solde insuffisant (${available} pts disponibles).` }, { status: 400 })

  // Fetch all matches and validate odds server-side
  const matchIds = legs.map(l => l.matchId)
  const { data: matches } = await service.from('matches').select('*').in('id', matchIds)

  const now = new Date()
  const resolvedLegs: {
    match_id: string; bet_type: string; prediction_result?: string
    prediction_bool?: boolean; odds_at_bet_time: number; phase_multiplier: number
  }[] = []

  for (const leg of legs) {
    const match = matches?.find(m => m.id === leg.matchId)
    if (!match) return NextResponse.json({ error: `Match introuvable.` }, { status: 404 })
    if (match.status !== 'upcoming') return NextResponse.json({ error: `${match.home_team} vs ${match.away_team} : paris fermés.` }, { status: 400 })
    if (now >= new Date(match.bets_locked_at)) return NextResponse.json({ error: `${match.home_team} vs ${match.away_team} : paris verrouillés.` }, { status: 400 })

    const oddsMap: Record<string, number | null> = {
      result_home: match.odds_home,
      result_draw: match.odds_draw,
      result_away: match.odds_away,
      btts_true:       match.odds_btts_yes,
      btts_false:      match.odds_btts_no,
      over_under_true: match.odds_over25,
      over_under_false: match.odds_under25,
    }

    let oddsKey = leg.betType
    if (leg.betType === 'result') oddsKey = `result_${leg.predictionResult}`
    else oddsKey = `${leg.betType}_${leg.predictionBool}`

    const odds = oddsMap[oddsKey]
    if (!odds) return NextResponse.json({ error: `Cote non disponible pour une sélection.` }, { status: 400 })

    resolvedLegs.push({
      match_id: leg.matchId,
      bet_type: leg.betType,
      prediction_result: leg.predictionResult,
      prediction_bool: leg.predictionBool,
      odds_at_bet_time: odds,
      phase_multiplier: match.phase_multiplier,
    })
  }

  const totalOdds = resolvedLegs.reduce((acc, l) => acc * l.odds_at_bet_time, 1)
  const potentialWin = Math.round(totalOdds * stake)

  const { data: combo, error: comboErr } = await service.from('combos').insert({
    user_id: dbUser.id, total_odds: totalOdds, stake,
    potential_win: potentialWin, legs_count: resolvedLegs.length,
  }).select().single()

  if (comboErr || !combo) return NextResponse.json({ error: 'Erreur lors de la création du combiné.' }, { status: 500 })

  const { error: legsErr } = await service.from('combo_legs').insert(
    resolvedLegs.map(l => ({ ...l, combo_id: combo.id }))
  )
  if (legsErr) return NextResponse.json({ error: 'Erreur lors de l\'enregistrement des sélections.' }, { status: 500 })

  await service.from('users').update({ frozen_points: dbUser.frozen_points + stake }).eq('id', dbUser.id)

  return NextResponse.json({ combo, totalOdds, potentialWin })
}
