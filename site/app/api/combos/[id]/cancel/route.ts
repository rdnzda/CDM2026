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

  const { data: combo } = await service
    .from('combos')
    .select('id, stake, status, combo_legs(matches(bets_locked_at))')
    .eq('id', params.id)
    .eq('user_id', dbUser.id)
    .single()

  if (!combo) return NextResponse.json({ error: 'Combiné introuvable' }, { status: 404 })
  if (combo.status !== 'pending') return NextResponse.json({ error: 'Ce combiné ne peut plus être annulé' }, { status: 400 })

  const legs = (combo.combo_legs as any[]) ?? []
  const anyLocked = legs.some((l: any) => new Date() >= new Date(l.matches.bets_locked_at))
  if (anyLocked) {
    return NextResponse.json({ error: 'Un ou plusieurs matchs sont déjà verrouillés' }, { status: 400 })
  }

  await service.from('combo_legs').delete().eq('combo_id', params.id)
  await service.from('combos').delete().eq('id', params.id)
  await service.from('users').update({
    frozen_points: Math.max(0, dbUser.frozen_points - combo.stake),
  }).eq('id', dbUser.id)

  return NextResponse.json({ ok: true })
}
