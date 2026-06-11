import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const service = await createServiceClient()
  const discordId = authUser.user_metadata?.provider_id ?? authUser.user_metadata?.sub
  const { data: dbUser } = await service.from('users').select('id, frozen_points').eq('discord_id', discordId).single()
  if (!dbUser) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

  const { data: bet } = await service
    .from('bets')
    .select('id, stake, status, matches(bets_locked_at)')
    .eq('id', params.id)
    .eq('user_id', dbUser.id)
    .single()

  if (!bet) return NextResponse.json({ error: 'Pari introuvable' }, { status: 404 })
  if (bet.status !== 'pending') return NextResponse.json({ error: 'Ce pari ne peut plus être annulé' }, { status: 400 })

  const match = bet.matches as any
  if (new Date() >= new Date(match.bets_locked_at)) {
    return NextResponse.json({ error: 'Les paris sont verrouillés pour ce match' }, { status: 400 })
  }

  await service.from('bets').delete().eq('id', params.id)
  await service.from('users').update({
    frozen_points: Math.max(0, dbUser.frozen_points - bet.stake),
  }).eq('id', dbUser.id)

  return NextResponse.json({ ok: true })
}
