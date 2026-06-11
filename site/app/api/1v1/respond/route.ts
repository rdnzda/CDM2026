import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { challengeId, action } = await request.json()
  if (!challengeId || !['accept', 'refuse'].includes(action))
    return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 })

  const service = await createServiceClient()
  const discordId = authUser.user_metadata?.provider_id ?? authUser.user_metadata?.sub
  const { data: me } = await service.from('users').select('*').eq('discord_id', discordId).single()
  if (!me) return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 })

  const { data: challenge } = await service
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .eq('opponent_id', me.id)
    .eq('status', 'pending')
    .single()

  if (!challenge) return NextResponse.json({ error: 'Défi introuvable ou déjà traité.' }, { status: 404 })
  if (new Date(challenge.expires_at) < new Date()) {
    await service.from('challenges').update({ status: 'expired' }).eq('id', challengeId)
    // Unfreeze challenger's stake on expiry
    const { data: challenger } = await service.from('users').select('frozen_points').eq('id', challenge.challenger_id).single()
    if (challenger) {
      await service.from('users')
        .update({ frozen_points: Math.max(0, challenger.frozen_points - challenge.stake) })
        .eq('id', challenge.challenger_id)
    }
    return NextResponse.json({ error: 'Ce défi a expiré.' }, { status: 400 })
  }

  if (action === 'refuse') {
    await service.from('challenges').update({ status: 'refused' }).eq('id', challengeId)
    const { data: challenger } = await service.from('users').select('frozen_points').eq('id', challenge.challenger_id).single()
    if (challenger) {
      await service.from('users')
        .update({ frozen_points: Math.max(0, challenger.frozen_points - challenge.stake) })
        .eq('id', challenge.challenger_id)
    }
    return NextResponse.json({ ok: true, action: 'refused' })
  }

  // Accept
  const available = me.total_points - me.frozen_points
  if (available < challenge.stake)
    return NextResponse.json({ error: `Solde insuffisant (${available} pts disponibles).` }, { status: 400 })

  await service.from('challenges').update({ status: 'accepted' }).eq('id', challengeId)
  await service.from('users').update({ frozen_points: me.frozen_points + challenge.stake }).eq('id', me.id)

  return NextResponse.json({ ok: true, action: 'accepted' })
}
