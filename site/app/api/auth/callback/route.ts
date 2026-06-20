import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.redirect(new URL('/', request.url))

  const supabase = await createClient()
  const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !session) return NextResponse.redirect(new URL('/?error=auth', request.url))

  const meta      = session.user.user_metadata
  const discordId = meta.provider_id ?? meta.sub
  const username  = meta.full_name ?? meta.name ?? 'Unknown'
  const avatarUrl = meta.avatar_url ?? null

  // Upsert user
  const serviceClient = await createServiceClient()
  const { data: existingUser } = await serviceClient
    .from('users')
    .select('id')
    .eq('discord_id', discordId)
    .single()

  if (!existingUser) {
    const { data: newUser } = await serviceClient
      .from('users')
      .insert({ discord_id: discordId, username, avatar_url: avatarUrl })
      .select()
      .single()

    if (newUser) {
      // Seed wildcards (3 de chaque type, aligné sur le boost de phase de groupes)
      await serviceClient.from('user_wildcards').insert([
        { user_id: newUser.id, type: 'double' },
        { user_id: newUser.id, type: 'double' },
        { user_id: newUser.id, type: 'double' },
        { user_id: newUser.id, type: 'insurance' },
        { user_id: newUser.id, type: 'insurance' },
        { user_id: newUser.id, type: 'insurance' },
        { user_id: newUser.id, type: 'last_minute' },
        { user_id: newUser.id, type: 'last_minute' },
        { user_id: newUser.id, type: 'last_minute' },
      ])
      // Seed boosts for group phase (3x ×1.5 + 1x ×2.0)
      await serviceClient.from('user_boosts').insert([
        { user_id: newUser.id, boost_type: 'x15',      phase: 'group' },
        { user_id: newUser.id, boost_type: 'x15',      phase: 'group' },
        { user_id: newUser.id, boost_type: 'x15',      phase: 'group' },
        { user_id: newUser.id, boost_type: 'x20_exact', phase: 'group' },
      ])
    }
  } else {
    // Update avatar/username if changed
    await serviceClient
      .from('users')
      .update({ username, avatar_url: avatarUrl })
      .eq('discord_id', discordId)
  }

  return NextResponse.redirect(new URL('/dashboard', request.url))
}
