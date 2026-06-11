import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json()
  const { dailyChallengeId, predictionScoreHome, predictionScoreAway, predictionScorer } = body

  if (!dailyChallengeId) return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 })

  const service = await createServiceClient()
  const discordId = authUser.user_metadata?.provider_id ?? authUser.user_metadata?.sub
  const { data: dbUser } = await service.from('users').select('id').eq('discord_id', discordId).single()
  if (!dbUser) return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 })

  // Verify challenge exists and is open
  const { data: daily } = await service
    .from('daily_challenges')
    .select('id, status, challenge_type')
    .eq('id', dailyChallengeId)
    .single()

  if (!daily || daily.status !== 'open')
    return NextResponse.json({ error: 'Ce défi n\'est plus disponible.' }, { status: 400 })

  const { error } = await service.from('daily_challenge_entries').insert({
    daily_challenge_id:    dailyChallengeId,
    user_id:               dbUser.id,
    prediction_score_home: predictionScoreHome ?? null,
    prediction_score_away: predictionScoreAway ?? null,
    prediction_scorer:     predictionScorer ?? null,
  })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Tu as déjà participé au défi du jour.' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
