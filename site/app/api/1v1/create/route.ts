import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { opponentId, stake } = await request.json()
  if (!opponentId || !stake) return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 })

  const service = await createServiceClient()
  const discordId = authUser.user_metadata?.provider_id ?? authUser.user_metadata?.sub
  const { data: me } = await service.from('users').select('*').eq('discord_id', discordId).single()
  if (!me) return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 })
  if (me.id === opponentId) return NextResponse.json({ error: 'Tu ne peux pas te défier toi-même.' }, { status: 400 })

  const available = me.total_points - me.frozen_points
  const maxStake  = Math.floor(available * 0.2)
  if (stake < 100) return NextResponse.json({ error: 'Mise minimum : 100 pts.' }, { status: 400 })
  if (stake > maxStake) return NextResponse.json({ error: `Mise max : ${maxStake} pts (20% du solde disponible).` }, { status: 400 })
  if (available < stake) return NextResponse.json({ error: `Solde insuffisant (${available} pts disponibles).` }, { status: 400 })

  const { data: opponent } = await service.from('users').select('id, username').eq('id', opponentId).single()
  if (!opponent) return NextResponse.json({ error: 'Adversaire introuvable.' }, { status: 404 })

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  const { data: challenge, error } = await service.from('challenges').insert({
    challenger_id: me.id,
    opponent_id:   opponent.id,
    stake,
    expires_at:    expiresAt,
  }).select().single()

  if (error || !challenge) return NextResponse.json({ error: 'Erreur lors de la création du défi.' }, { status: 500 })

  await service.from('users').update({ frozen_points: me.frozen_points + stake }).eq('id', me.id)

  return NextResponse.json({ challenge, opponentUsername: opponent.username })
}
