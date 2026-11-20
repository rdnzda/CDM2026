import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DuelManager from './DuelManager'

export default async function DuelPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/api/auth/login')

  const service = await createServiceClient()
  const discordId = authUser.user_metadata?.provider_id ?? authUser.user_metadata?.sub
  const { data: me } = await service.from('users').select('*').eq('discord_id', discordId).single()
  if (!me) redirect('/api/auth/login')

  const available = me.total_points - me.frozen_points

  const [{ data: allUsers }, { data: challenges }] = await Promise.all([
    service.from('users').select('id, username, avatar_url, total_points').order('total_points', { ascending: false }),
    service.from('challenges')
      .select('id, stake, status, expires_at, created_at, challenger:users!challenges_challenger_id_fkey(id, username, avatar_url), opponent:users!challenges_opponent_id_fkey(id, username, avatar_url)')
      .or(`challenger_id.eq.${me.id},opponent_id.eq.${me.id}`)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const incoming = (challenges ?? []).filter((c: any) => c.opponent?.id === me.id && c.status === 'pending')
  const outgoing = (challenges ?? []).filter((c: any) => c.challenger?.id === me.id)

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">

      {/* Page header */}
      <div>
        <h1
          className="font-display text-4xl mb-2"
          style={{ color: 'var(--text)', letterSpacing: '.06em' }}
        >
          DÉFIS 1V1
        </h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Défie un autre joueur — mise max 20% de ton solde.{' '}
          <span className="font-mono font-semibold" style={{ color: '#F0B429' }}>
            {available.toLocaleString('fr-FR')} pts
          </span>{' '}
          disponibles.
        </p>
      </div>

      <DuelManager
        me={{ id: me.id, total_points: me.total_points, frozen_points: me.frozen_points }}
        users={allUsers ?? []}
        incoming={incoming as any}
        outgoing={outgoing as any}
        availablePoints={available}
      />

    </div>
  )
}
