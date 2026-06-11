import { createClient } from '@/lib/supabase/server'
import { getFlagUrl } from '@/lib/flags'

const PHASE_LABEL: Record<string, string> = {
  group: 'Groupes', round_of_16: '8es', quarter: 'Quarts', semi: 'Demies', final: 'Finale',
}
const PHASE_COLOR: Record<string, { bg: string; text: string }> = {
  group:       { bg: 'rgba(74,98,128,.2)',   text: '#4A6280' },
  round_of_16: { bg: 'rgba(59,130,246,.12)', text: '#60A5FA' },
  quarter:     { bg: 'rgba(139,92,246,.12)', text: '#A78BFA' },
  semi:        { bg: 'rgba(249,115,22,.12)', text: '#FB923C' },
  final:       { bg: 'rgba(240,180,41,.12)', text: '#F0B429' },
}

function fmt(d: string) {
  return new Date(d).toLocaleString('fr-FR', {
    weekday: 'short', day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
  })
}

export default async function MatchsPage() {
  const supabase = await createClient()
  const { data: matches } = await supabase
    .from('matches').select('*')
    .in('status', ['upcoming', 'live', 'finished'])
    .order('kickoff_at', { ascending: true })

  const grouped = (matches ?? []).reduce<Record<string, typeof matches>>((acc, m) => {
    const d = new Date(m!.kickoff_at).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris',
    })
    if (!acc[d]) acc[d] = []
    acc[d]!.push(m)
    return acc
  }, {})

  return (
    <div className="space-y-10 animate-fade-up">
      <div className="flex items-baseline gap-4">
        <h1 className="font-display text-5xl" style={{ color: 'var(--text)', letterSpacing: '.05em' }}>MATCHS</h1>
        <span className="text-sm" style={{ color: 'var(--muted)' }}>{matches?.length ?? 0} rencontres</span>
      </div>

      {Object.keys(grouped).length === 0 && (
        <div className="rounded-2xl p-14 text-center" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--muted)' }}>Aucun match disponible pour le moment.</p>
        </div>
      )}

      {Object.entries(grouped).map(([date, dayMatches]) => (
        <div key={date} className="space-y-3">
          {/* Day header */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold tracking-[.12em] uppercase" style={{ color: 'var(--muted)' }}>{date}</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>

          {dayMatches!.map((match: any) => {
            const locked   = match.status !== 'upcoming' || new Date() >= new Date(match.bets_locked_at)
            const isLive   = match.status === 'live'
            const isDone   = match.status === 'finished'
            const phaseC   = PHASE_COLOR[match.phase] ?? PHASE_COLOR.group
            const hasOdds  = match.odds_home || match.odds_draw || match.odds_away

            return (
              <a
                key={match.id}
                href={`/matchs/${match.id}`}
                className="hover-bg-3 group relative flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl overflow-hidden"
                style={{
                  background: 'var(--bg-2)',
                  border: `1px solid ${isLive ? 'rgba(34,197,94,.3)' : 'var(--border)'}`,
                  transition: 'background .15s, border-color .15s',
                }}
              >
                {/* Left gold accent for non-locked */}
                {!locked && !isDone && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: '#F0B429' }} />
                )}

                {/* Time + LED */}
                <div className="shrink-0 text-center w-10 sm:w-14">
                  <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
                    {new Date(match.kickoff_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}
                  </p>
                  <div className="flex justify-center mt-1.5">
                    {isLive ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color: '#22C55E' }}>
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#22C55E' }} />LIVE
                      </span>
                    ) : isDone ? (
                      <span className="w-2 h-2 rounded-full" style={{ background: 'var(--border-2)' }} title="Match terminé" />
                    ) : !locked ? (
                      <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#22C55E' }} title="Paris ouverts" />
                    ) : (
                      <span className="w-2 h-2 rounded-full" style={{ background: '#EF4444' }} title="Paris fermés" />
                    )}
                  </div>
                </div>

                {/* Teams */}
                <div className="flex-1 min-w-0">

                  {/* ── Mobile: vertical stack ── */}
                  <div className="flex flex-col gap-1 sm:hidden">
                    <p className="font-semibold text-sm leading-tight flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
                      {getFlagUrl(match.home_team) && <img src={getFlagUrl(match.home_team)!} alt="" width={18} height={13} className="shrink-0 rounded-sm" />}
                      <span className="truncate">{match.home_team}</span>
                    </p>

                    <div className="flex items-center gap-2 pl-0.5">
                      {isDone && match.final_score_home !== null ? (
                        <span className="font-display text-lg leading-none" style={{ color: 'var(--text)' }}>
                          {match.final_score_home} – {match.final_score_away}
                        </span>
                      ) : hasOdds ? (
                        <div className="flex items-center gap-3">
                          {[
                            { l: '1', v: match.odds_home },
                            { l: 'X', v: match.odds_draw },
                            { l: '2', v: match.odds_away },
                          ].map(o => o.v && (
                            <div key={o.l} className="flex items-baseline gap-1">
                              <span className="text-[9px]" style={{ color: 'var(--muted)' }}>{o.l}</span>
                              <span className="font-mono text-xs font-semibold" style={{ color: '#F0B429' }}>×{Number(o.v).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="font-display text-sm" style={{ color: 'var(--border-2)' }}>VS</span>
                      )}
                    </div>

                    <p className="font-semibold text-sm leading-tight flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
                      {getFlagUrl(match.away_team) && <img src={getFlagUrl(match.away_team)!} alt="" width={18} height={13} className="shrink-0 rounded-sm" />}
                      <span className="truncate">{match.away_team}</span>
                    </p>
                  </div>

                  {/* ── Desktop: horizontal layout ── */}
                  <div className="hidden sm:flex items-center justify-between gap-6">
                    <p className="flex-1 font-semibold text-base leading-tight truncate flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
                      {getFlagUrl(match.home_team) && <img src={getFlagUrl(match.home_team)!} alt="" width={20} height={15} className="shrink-0 rounded-sm" />}
                      {match.home_team}
                    </p>

                    {isDone && match.final_score_home !== null ? (
                      <div className="shrink-0 flex items-center gap-2">
                        <span className="font-display text-2xl" style={{ color: 'var(--text)' }}>{match.final_score_home}</span>
                        <span className="font-display text-lg" style={{ color: 'var(--muted)' }}>–</span>
                        <span className="font-display text-2xl" style={{ color: 'var(--text)' }}>{match.final_score_away}</span>
                      </div>
                    ) : (
                      <div className="shrink-0 flex items-center gap-1">
                        {hasOdds ? [
                          { l: '1', v: match.odds_home },
                          { l: 'X', v: match.odds_draw },
                          { l: '2', v: match.odds_away },
                        ].map(o => o.v && (
                          <div key={o.l} className="text-center" style={{ minWidth: 44 }}>
                            <p className="font-mono text-xs font-semibold" style={{ color: '#F0B429' }}>×{Number(o.v).toFixed(2)}</p>
                            <p className="text-[9px] tracking-wide" style={{ color: 'var(--muted)' }}>{o.l}</p>
                          </div>
                        )) : (
                          <span className="font-display text-xl" style={{ color: 'var(--border-2)' }}>VS</span>
                        )}
                      </div>
                    )}

                    <p className="flex-1 font-semibold text-base leading-tight truncate flex items-center justify-end gap-1.5" style={{ color: 'var(--text)' }}>
                      {match.away_team}
                      {getFlagUrl(match.away_team) && <img src={getFlagUrl(match.away_team)!} alt="" width={20} height={15} className="shrink-0 rounded-sm" />}
                    </p>
                  </div>
                </div>

                {/* Phase badge */}
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ background: phaseC.bg, color: phaseC.text }}>
                    {PHASE_LABEL[match.phase] ?? match.phase}
                  </span>
                </div>
              </a>
            )
          })}
        </div>
      ))}
    </div>
  )
}
