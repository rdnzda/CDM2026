import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_DISCORD_ID = '574503884987564044'
const VALID_PHASES = ['round_of_32', 'round_of_16', 'quarter', 'semi', 'final']

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const discordId = authUser.user_metadata?.provider_id ?? authUser.user_metadata?.sub
  if (discordId !== ADMIN_DISCORD_ID)
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { phase } = await req.json()
  if (!VALID_PHASES.includes(phase))
    return NextResponse.json({ error: 'Phase invalide' }, { status: 400 })

  const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey     = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const res = await fetch(`${supabaseUrl}/functions/v1/grant-phase-boosts`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ phase }),
  })

  const data = await res.json()
  if (!res.ok) return NextResponse.json(data, { status: res.status })
  return NextResponse.json(data)
}
