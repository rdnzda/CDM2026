import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function todayParis(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' })
}

function dailyPoints(): number {
  const d = new Date()
  if (d >= new Date('2026-07-18')) return 500  // Final
  if (d >= new Date('2026-07-14')) return 300  // Demi-finales
  if (d >= new Date('2026-07-08')) return 250  // Quarts
  if (d >= new Date('2026-07-02')) return 200  // Huitièmes
  return 150                                   // Phase de groupes
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const service = await createServiceClient()
  const discordId = authUser.user_metadata?.provider_id ?? authUser.user_metadata?.sub

  const { data: dbUser } = await service
    .from('users')
    .select('id, total_points')
    .eq('discord_id', discordId)
    .single()
  if (!dbUser) return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 })

  const today = todayParis()
  const pts = dailyPoints()

  const { error } = await service.from('daily_claims').insert({
    user_id:    dbUser.id,
    claim_date: today,
    points:     pts,
  })

  if (error) {
    if (error.code === '23505')
      return NextResponse.json({ error: 'Déjà récupéré aujourd\'hui.' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await service
    .from('users')
    .update({ total_points: dbUser.total_points + pts })
    .eq('id', dbUser.id)

  return NextResponse.json({ ok: true, points: pts })
}
