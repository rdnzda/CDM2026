import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getFlagUrl } from '@/lib/flags'
import MatchScoreForm from './MatchScoreForm'

const ADMIN_DISCORD_ID = '574503884987564044'

const STATUS_ORDER: Record<string, number> = { live: 0, finished: 1, upcoming: 2 }

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const discordId = authUser.user_metadata?.provider_id ?? authUser.user_metadata?.sub
  if (discordId !== ADMIN_DISCORD_ID) redirect('/')

  const service = await createServiceClient()
  const { data: matches } = await service
    .from('matches')
    .select('id, home_team, away_team, kickoff_at, status, phase, group_name, final_score_home, final_score_away, result, scorers')
    .order('kickoff_at', { ascending: true })

  const sorted = (matches ?? []).sort((a: any, b: any) => {
    const so = (STATUS_ORDER[a.status] ?? 2) - (STATUS_ORDER[b.status] ?? 2)
    if (so !== 0) return so
    return new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime()
  })

  // Group by day
  const grouped = sorted.reduce<Record<string, any[]>>((acc, m: any) => {
    const d = new Date(m.kickoff_at).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris',
    })
    if (!acc[d]) acc[d] = []
    acc[d].push(m)
    return acc
  }, {})

  const PHASE_LABEL: Record<string, string> = {
    group: 'Groupes', round_of_16: '8es', quarter: 'Quarts', semi: 'Demies', final: 'Finale',
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-up">
      <div className="flex items-baseline gap-4">
        <h1 className="font-display text-4xl" style={{ color: 'var(--text)', letterSpacing: '.05em' }}>ADMIN</h1>
        <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(239,68,68,.15)', color: '#EF4444' }}>SCORES & BUTEURS</span>
      </div>

      {Object.entries(grouped).map(([date, dayMatches]) => (
        <div key={date} className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>{date}</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>

          {dayMatches.map((match: any) => {
            const isLive   = match.status === 'live'
            const isDone   = match.status === 'finished'
            const hasScore = match.final_score_home !== null

            return (
              <div
                key={match.id}
                className="rounded-2xl p-4"
                style={{
                  background: 'var(--bg-2)',
                  border: `1px solid ${isLive ? 'rgba(34,197,94,.3)' : 'var(--border)'}`,
                }}
              >
                {/* Match header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getFlagUrl(match.home_team) && <img src={getFlagUrl(match.home_team)!} alt="" width={18} height={13} className="rounded-sm shrink-0" />}
                    <span className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>{match.home_team}</span>
                  </div>

                  <div className="shrink-0 text-center">
                    {hasScore ? (
                      <span className="font-display text-xl" style={{ color: isDone ? '#F0B429' : '#22C55E' }}>
                        {match.final_score_home} – {match.final_score_away}
                      </span>
                    ) : (
                      <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
                        {new Date(match.kickoff_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                    <span className="font-semibold text-sm truncate text-right" style={{ color: 'var(--text)' }}>{match.away_team}</span>
                    {getFlagUrl(match.away_team) && <img src={getFlagUrl(match.away_team)!} alt="" width={18} height={13} className="rounded-sm shrink-0" />}
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-3)', color: 'var(--muted)' }}>
                      {PHASE_LABEL[match.phase] ?? match.phase}{match.group_name ? ` ${match.group_name}` : ''}
                    </span>
                    {isLive && (
                      <span className="text-[9px] font-bold" style={{ color: '#22C55E' }}>● LIVE</span>
                    )}
                    {isDone && (
                      <span className="text-[9px] font-bold" style={{ color: 'var(--muted)' }}>● FIN</span>
                    )}
                  </div>
                </div>

                {/* Current scorers */}
                {match.scorers?.length > 0 && (
                  <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>
                    ⚽ {match.scorers.join(', ')}
                  </p>
                )}

                {/* Score entry form */}
                <MatchScoreForm match={match} />
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
