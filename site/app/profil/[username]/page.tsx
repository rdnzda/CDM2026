import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Award, ClipboardList, Clock } from 'lucide-react'

const BET_TYPE_LABELS: Record<string, string> = {
  result: 'Résultat', exact_score: 'Score exact', scorer: 'Buteur',
  btts: 'BTTS', over_under: 'Over/Under', red_card: 'Carton rouge',
  best_half: 'Mi-temps', extra_time: 'Prolongations', result_combo: 'Résultat+',
}

export default async function ProfilPage({ params }: { params: { username: string } }) {
  const service = await createServiceClient()

  const { data: user } = await service
    .from('users')
    .select('*')
    .eq('username', params.username)
    .single()

  if (!user) notFound()

  const [
    { data: achievements },
    { data: pendingBets },
    { data: pendingCombos },
    { data: recentBets },
  ] = await Promise.all([
    service.from('user_achievements').select('*, achievements(*)').eq('user_id', user.id),
    service.from('bets')
      .select('*, matches(home_team, away_team, kickoff_at)')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10),
    service.from('combos')
      .select('*, combo_legs(*, matches(home_team, away_team))')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5),
    service.from('bets')
      .select('*, matches(home_team, away_team)')
      .eq('user_id', user.id)
      .in('status', ['won', 'lost', 'refunded'])
      .order('resolved_at', { ascending: false })
      .limit(8),
  ])

  const winrate = user.total_bets > 0 ? Math.round(user.bets_won * 100 / user.total_bets) : 0
  const hasPending = (pendingBets?.length ?? 0) + (pendingCombos?.length ?? 0) > 0

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">

      {/* Header */}
      <div className="rounded-2xl p-6 flex items-center gap-4" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
        {user.avatar_url
          ? <img src={user.avatar_url} alt="" className="w-16 h-16 rounded-full ring-2 ring-amber-500/20" />
          : <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold" style={{ background: 'var(--bg-3)' }}>{user.username[0].toUpperCase()}</div>
        }
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{user.username}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            Membre depuis {new Date(user.created_at).toLocaleDateString('fr-FR')} · {user.total_bets} paris
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Points',     value: user.total_points.toLocaleString('fr-FR'), color: '#F0B429' },
          { label: 'Winrate',    value: `${winrate}%`,                              color: '#22C55E' },
          { label: 'Duels gagnés', value: String(user.duels_won),                  color: '#3B82F6' },
          { label: 'Cote moy.',  value: user.avg_odds ? `×${Number(user.avg_odds).toFixed(2)}` : 'N/A', color: '#A855F7' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>{s.label}</p>
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Achievements */}
      {achievements && achievements.length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
          <h2 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <Award className="w-4 h-4 text-amber-400" />Succès ({achievements.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {achievements.map((ua: any) => (
              <span key={ua.id}
                title={`${ua.achievements.name} — ${ua.achievements.description}`}
                className="text-xs px-3 py-1.5 rounded-full cursor-help transition-colors hover-bg-3"
                style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                {ua.achievements.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Paris en cours */}
      <div className="rounded-2xl p-5" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
        <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <Clock className="w-4 h-4" style={{ color: 'var(--muted)' }} />
          Paris en cours
          {hasPending && (
            <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(240,180,41,.12)', color: '#F0B429' }}>
              {(pendingBets?.length ?? 0) + (pendingCombos?.length ?? 0)}
            </span>
          )}
        </h2>

        {hasPending ? (
          <div className="space-y-2">
            {pendingBets?.map((bet: any) => {
              const match = bet.matches as any
              return (
                <div key={bet.id} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: 'var(--bg-3)' }}>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: 'var(--text)' }}>
                      {match.home_team} vs {match.away_team}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                      {BET_TYPE_LABELS[bet.bet_type] ?? bet.bet_type}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="font-semibold text-sm" style={{ color: '#F0B429' }}>{bet.stake.toLocaleString('fr-FR')} pts</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>@ ×{Number(bet.odds_at_bet_time).toFixed(2)}</p>
                  </div>
                </div>
              )
            })}

            {pendingCombos?.map((combo: any) => {
              const legs = (combo.combo_legs ?? []) as any[]
              const matchNames = legs.map((l: any) => `${l.matches.home_team} vs ${l.matches.away_team}`).join(' · ')
              return (
                <div key={combo.id} className="rounded-xl px-4 py-3" style={{ background: 'var(--bg-3)' }}>
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-sm flex items-center gap-1.5">
                        <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(168,85,247,.2)', color: '#C084FC' }}>
                          COMBINÉ {legs.length}
                        </span>
                        <span className="truncate text-xs" style={{ color: 'var(--muted)' }}>{matchNames}</span>
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="font-semibold text-sm" style={{ color: '#F0B429' }}>{combo.stake.toLocaleString('fr-FR')} pts</p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>×{Number(combo.total_odds).toFixed(2)} → {combo.potential_win.toLocaleString('fr-FR')} pts</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-center py-4" style={{ color: 'var(--muted)' }}>Aucun pari en cours.</p>
        )}
      </div>

      {/* Historique */}
      {recentBets && recentBets.length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
          <h2 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <ClipboardList className="w-4 h-4" style={{ color: 'var(--muted)' }} />Historique
          </h2>
          <div className="space-y-2 text-sm">
            {recentBets.map((bet: any) => {
              const match = bet.matches as any
              const color = bet.status === 'won' ? '#22C55E' : bet.status === 'lost' ? '#EF4444' : 'var(--muted)'
              return (
                <div key={bet.id} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: 'var(--bg-3)' }}>
                  <div className="min-w-0">
                    <p className="truncate" style={{ color: 'var(--text)' }}>{match?.home_team} vs {match?.away_team}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>{BET_TYPE_LABELS[bet.bet_type] ?? bet.bet_type}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span style={{ color: '#F0B429' }} className="text-xs font-semibold">{bet.stake.toLocaleString('fr-FR')} pts</span>
                    <span className="text-xs font-bold" style={{ color }}>
                      {bet.status === 'won' ? `+${(bet.points_won ?? 0).toLocaleString('fr-FR')}` : bet.status === 'lost' ? `-${bet.stake.toLocaleString('fr-FR')}` : '↩'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
