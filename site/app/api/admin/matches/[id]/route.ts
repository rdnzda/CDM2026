import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_DISCORD_ID = '574503884987564044'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const discordId = authUser.user_metadata?.provider_id ?? authUser.user_metadata?.sub
  if (discordId !== ADMIN_DISCORD_ID)
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { scoreHome, scoreAway, scorers } = await req.json()
  if (scoreHome == null || scoreAway == null || scoreHome < 0 || scoreAway < 0)
    return NextResponse.json({ error: 'Score invalide' }, { status: 400 })

  const h = Number(scoreHome)
  const a = Number(scoreAway)
  const result = h > a ? 'home' : h < a ? 'away' : 'draw'
  const scorerList: string[] = (scorers ?? '')
    .split(',').map((s: string) => s.trim()).filter(Boolean)

  const service = await createServiceClient()
  const { error } = await service.from('matches').update({
    final_score_home: h,
    final_score_away: a,
    result,
    status:           'finished',
    result_btts:      h > 0 && a > 0,
    result_over25:    h + a > 2.5,
    scorers:          scorerList.length > 0 ? scorerList : null,
  }).eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Trigger resolve-bets
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!
  await fetch(`${supabaseUrl}/functions/v1/resolve-bets`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}
