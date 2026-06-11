import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const LOCK = new Date('2026-06-14T22:00:00Z') // June 14 midnight Paris (UTC+2)

export async function POST(request: NextRequest) {
  if (new Date() >= LOCK) return NextResponse.json({ error: 'Prédictions fermées.' }, { status: 403 })

  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json()
  const { firstTeam, secondTeam, thirdTeam, goldenBoot, goldenBall } = body as {
    firstTeam: string; secondTeam: string; thirdTeam: string
    goldenBoot: { playerName: string; team: string }
    goldenBall: { playerName: string; team: string }
  }

  if (!firstTeam || !secondTeam || !thirdTeam) return NextResponse.json({ error: 'Podium incomplet.' }, { status: 400 })
  if (firstTeam === secondTeam || firstTeam === thirdTeam || secondTeam === thirdTeam)
    return NextResponse.json({ error: 'Les 3 équipes doivent être différentes.' }, { status: 400 })
  if (!goldenBoot?.playerName || !goldenBoot?.team) return NextResponse.json({ error: 'Golden Boot incomplet.' }, { status: 400 })
  if (!goldenBall?.playerName || !goldenBall?.team) return NextResponse.json({ error: 'Golden Ball incomplet.' }, { status: 400 })

  const service = await createServiceClient()
  const discordId = authUser.user_metadata?.provider_id ?? authUser.user_metadata?.sub
  const { data: dbUser } = await service.from('users').select('id').eq('discord_id', discordId).single()
  if (!dbUser) return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 })

  const [podiumRes, bootRes, ballRes] = await Promise.all([
    service.from('tournament_predictions').upsert({
      user_id: dbUser.id, first_team: firstTeam, second_team: secondTeam, third_team: thirdTeam,
      odds_first: 1.0, odds_second: 1.0, odds_third: 1.0,
    }, { onConflict: 'user_id' }),
    service.from('award_predictions').upsert({
      user_id: dbUser.id, award_type: 'golden_boot',
      player_name: goldenBoot.playerName, team: goldenBoot.team, odds_at_time: 1.0,
    }, { onConflict: 'user_id,award_type' }),
    service.from('award_predictions').upsert({
      user_id: dbUser.id, award_type: 'golden_ball',
      player_name: goldenBall.playerName, team: goldenBall.team, odds_at_time: 1.0,
    }, { onConflict: 'user_id,award_type' }),
  ])

  const err = podiumRes.error ?? bootRes.error ?? ballRes.error
  if (err) return NextResponse.json({ error: err.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
