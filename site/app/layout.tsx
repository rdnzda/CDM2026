import type { Metadata } from 'next'
import './globals.css'
import { createClient } from '@/lib/supabase/server'
import NavClient from './NavClient'

export const metadata: Metadata = {
  title: 'CDM 2026 — Pronostics',
  description: 'Application de pronostics pour la Coupe du Monde 2026',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let dbUser: { username: string; avatar_url: string | null; total_points: number } | null = null
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('username, avatar_url, total_points')
        .eq('discord_id', user.user_metadata?.provider_id ?? user.user_metadata?.sub)
        .single()
      dbUser = data
    }
  } catch {
    // env vars not set or network error — render nav without user
  }

  return (
    <html lang="fr">
      <body className="min-h-screen bg-slate-900 text-slate-100">
        <NavClient user={dbUser} />
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  )
}
