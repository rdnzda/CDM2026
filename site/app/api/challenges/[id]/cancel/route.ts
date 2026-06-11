import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const service = await createServiceClient()
  const discordId = authUser.user_metadata?.provider_id ?? authUser.user_metadata?.sub
  const { data: me } = await service.from('users').select('id, frozen_points').eq('discord_id', discordId).single()
  if (!me) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

  const { data: challenge } = await service
    .from('challenges')
    .select('id, stake, challenger_id')
    .eq('id', params.id)
    .eq('challenger_id', me.id)
    .eq('status', 'pending')
    .single()

  if (!challenge) return NextResponse.json({ error: 'Défi introuvable ou déjà traité' }, { status: 404 })

  await service.from('challenges').delete().eq('id', params.id)
  await service.from('users').update({
    frozen_points: Math.max(0, me.frozen_points - challenge.stake),
  }).eq('id', me.id)

  return NextResponse.json({ ok: true })
}
