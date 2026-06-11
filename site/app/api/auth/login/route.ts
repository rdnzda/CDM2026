import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      scopes: 'identify',
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`,
    },
  })
  if (error || !data.url) return NextResponse.json({ error: 'Auth failed' }, { status: 500 })
  return NextResponse.redirect(data.url)
}
