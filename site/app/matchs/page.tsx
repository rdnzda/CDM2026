import { createClient } from '@/lib/supabase/server'
import { getFlagUrl } from '@/lib/flags'
import LiveRefresh from '@/components/LiveRefresh'

const PHASE_LABEL: Record<string, string> = {
  group: 'Groupes', round_of_32: '32es', round_of_16: '8es', quarter: 'Quarts', semi: 'Demies', final: 'Finale',
}
const PHASE_COLOR: Record<string, { bg: string; text: string }> = {
  group:        { bg: 'rgba(74,98,128,.2)',   text: '#4A6280' },
  round_of_32:  { bg: 'rgba(14,165,233,.12)', text: '#38BDF8' },
  round_of_16:  { bg: 'rgba(59,130,246,.12)', text: '#60A5FA' },
  quarter:      { bg: 'rgba(139,92,246,.12)', text: '#A78BFA' },
  semi:         { bg: 'rgba(249,115,22,.12)', text: '#FB923C' },
  final:        { bg: 'rgba(240,180,41,.12)', text: '#F0B429' },
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

  const allMatches     = matches ?? []
  const now            = new Date()
  const in3h           = new Date(now.getTime() + 3 * 60 * 60 * 1000)

  const liveMatches    = allMatches.filter((m: any) => m.status === 'live')
  const soonMatches    = allMatches.filter((m: any) => {
    if (m.status !== 'upcoming') return false
    const k = new Date(m.kickoff_at)
    return k > now && k <= in3h
  })
  const hasLiveMatches = liveMatches.length > 0
  const pinnedIds      = new Set([...liveMatches, ...soonMatches].map((m: any) => m.id))
  const rest           = allMatches.filter((m: any) => !pinnedIds.has(m.id))

  const grouped = rest.reduce<Record<string, typeof matches>>((acc, m) => {
    const d = new Date(m!.kickoff_at).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris',
    })
    if (!acc[d]) acc[d] = []
    acc[d]!.push(m)
    return acc
  }, {})

  return (
    <div className="space-y-10 animate-fade-up">
      {hasLiveMatches && <LiveRefresh intervalMs={30000} />}
      <div className="flex items-baseline gap-4">
        <h1 className="font-display text-5xl" style={{ color: 'var(--text)', letterSpacing: '.05em' }}>MATCHS</h1>
        <span className="text-sm" style={{ color: 'var(--muted)' }}>{matches?.length ?? 0} rencontres</span>
      </div>

      {/* Matchs LIVE en tête */}
      {hasLiveMatches && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-[.12em] uppercase" style={{ color: '#22C55E' }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#22C55E' }} />
              En direct
            </span>
            <div className="flex-1 h-px" style={{ background: 'rgba(34,197,94,.2)' }} />
          </div>
          {liveMatches.map((match: any) => {
            const phaseC  = PHASE_COLOR[match.phase] ?? PHASE_COLOR.group
            const hasOdds = match.odds_home || match.odds_draw || match.odds_away
            return (
              <a
                key={match.id}
                href={`/matchs/${match.id}`}
                className="hover-bg-3 group relative flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl overflow-hidden"
                style={{
                  background: 'var(--bg-2)',
                  border: '1px solid rgba(34,197,94,.3)',
                  transition: 'background .15s, border-color .15s',
                }}
              >
                <div className="shrink-0 text-center w-10 sm:w-14">
                  <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
                    {new Date(match.kickoff_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col gap-1 sm:hidden">
                    <p className="font-semibold text-sm leading-tight flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
                      {getFlagUrl(match.home_team) && <img src={getFlagUrl(match.home_team)!} alt="" width={18} height={13} className="shrink-0 rounded-sm" />}
                      <span className="truncate">{match.home_team}</span>
                    </p>
                    <span className="font-display text-lg leading-none flex items-center gap-1.5" style={{ color: '#22C55E' }}>
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: '#22C55E' }} />
                      {match.final_score_home} – {match.final_score_away}
                    </span>
                    <p className="font-semibold text-sm leading-tight flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
                      {getFlagUrl(match.away_team) && <img src={getFlagUrl(match.away_team)!} alt="" width={18} height={13} className="shrink-0 rounded-sm" />}
                      <span className="truncate">{match.away_team}</span>
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center justify-between gap-6">
                    <p className="flex-1 font-semibold text-base leading-tight truncate flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
                      {getFlagUrl(match.home_team) && <img src={getFlagUrl(match.home_team)!} alt="" width={20} height={15} className="shrink-0 rounded-sm" />}
                      {match.home_team}
                    </p>
                    <div className="shrink-0 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ background: '#22C55E' }} />
                      <span className="font-display text-2xl" style={{ color: '#22C55E' }}>{match.final_score_home}</span>
                      <span className="font-display text-lg" style={{ color: 'var(--muted)' }}>–</span>
                      <span className="font-display text-2xl" style={{ color: '#22C55E' }}>{match.final_score_away}</span>
                    </div>
                    <p className="flex-1 font-semibold text-base leading-tight truncate flex items-center justify-end gap-1.5" style={{ color: 'var(--text)' }}>
                      {match.away_team}
                      {getFlagUrl(match.away_team) && <img src={getFlagUrl(match.away_team)!} alt="" width={20} height={15} className="shrink-0 rounded-sm" />}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ background: phaseC.bg, color: phaseC.text }}>
                    {PHASE_LABEL[match.phase] ?? match.phase}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,.12)', color: '#22C55E' }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: '#22C55E' }} />LIVE
                  </span>
                </div>
              </a>
            )
          })}
        </div>
      )}

      {/* Matchs à venir dans les 3h */}
      {soonMatches.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-[.12em] uppercase" style={{ color: '#F0B429' }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#F0B429' }} />
              À venir
            </span>
            <div className="flex-1 h-px" style={{ background: 'rgba(240,180,41,.2)' }} />
          </div>
          {soonMatches.map((match: any) => {
            const phaseC  = PHASE_COLOR[match.phase] ?? PHASE_COLOR.group
            const hasOdds = match.odds_home || match.odds_draw || match.odds_away
            const locked  = new Date() >= new Date(match.bets_locked_at)
            return (
              <a
                key={match.id}
                href={`/matchs/${match.id}`}
                className="hover-bg-3 group relative flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl overflow-hidden"
                style={{
                  background: 'var(--bg-2)',
                  border: '1px solid rgba(240,180,41,.25)',
                  transition: 'background .15s, border-color .15s',
                }}
              >
                {!locked && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: '#F0B429' }} />
                )}
                <div className="shrink-0 text-center w-10 sm:w-14">
                  <p className="font-mono text-xs font-semibold" style={{ color: '#F0B429' }}>
                    {new Date(match.kickoff_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col gap-1 sm:hidden">
                    <p className="font-semibold text-sm leading-tight flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
                      {getFlagUrl(match.home_team) && <img src={getFlagUrl(match.home_team)!} alt="" width={18} height={13} className="shrink-0 rounded-sm" />}
                      <span className="truncate">{match.home_team}</span>
                    </p>
                    <div className="flex items-center gap-2 pl-0.5">
                      {hasOdds ? (
                        <div className="flex items-center gap-3">
                          {[{ l: '1', v: match.odds_home }, { l: 'X', v: match.odds_draw }, { l: '2', v: match.odds_away }].map(o => o.v && (
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
                  <div className="hidden sm:flex items-center justify-between gap-6">
                    <p className="flex-1 font-semibold text-base leading-tight truncate flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
                      {getFlagUrl(match.home_team) && <img src={getFlagUrl(match.home_team)!} alt="" width={20} height={15} className="shrink-0 rounded-sm" />}
                      {match.home_team}
                    </p>
                    <div className="shrink-0 flex items-center gap-1">
                      {hasOdds ? [{ l: '1', v: match.odds_home }, { l: 'X', v: match.odds_draw }, { l: '2', v: match.odds_away }].map(o => o.v && (
                        <div key={o.l} className="text-center" style={{ minWidth: 44 }}>
                          <p className="font-mono text-xs font-semibold" style={{ color: '#F0B429' }}>×{Number(o.v).toFixed(2)}</p>
                          <p className="text-[9px] tracking-wide" style={{ color: 'var(--muted)' }}>{o.l}</p>
                        </div>
                      )) : (
                        <span className="font-display text-xl" style={{ color: 'var(--border-2)' }}>VS</span>
                      )}
                    </div>
                    <p className="flex-1 font-semibold text-base leading-tight truncate flex items-center justify-end gap-1.5" style={{ color: 'var(--text)' }}>
                      {match.away_team}
                      {getFlagUrl(match.away_team) && <img src={getFlagUrl(match.away_team)!} alt="" width={20} height={15} className="shrink-0 rounded-sm" />}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ background: phaseC.bg, color: phaseC.text }}>
                    {PHASE_LABEL[match.phase] ?? match.phase}
                  </span>
                  {!locked ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(240,180,41,.12)', color: '#F0B429' }}>
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: '#F0B429' }} />OUVERT
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,.1)', color: '#EF4444' }}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#EF4444' }} />FERMÉ
                    </span>
                  )}
                </div>
              </a>
            )
          })}
        </div>
      )}

      {Object.keys(grouped).length === 0 && !hasLiveMatches && soonMatches.length === 0 && (
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

                {/* Time */}
                <div className="shrink-0 text-center w-10 sm:w-14">
                  <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
                    {new Date(match.kickoff_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}
                  </p>
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
                      {(isDone || isLive) && match.final_score_home !== null ? (
                        <span className="font-display text-lg leading-none flex items-center gap-1.5" style={{ color: isLive ? '#22C55E' : 'var(--text)' }}>
                          {isLive && <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: '#22C55E' }} />}
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

                    {(isDone || isLive) && match.final_score_home !== null ? (
                      <div className="shrink-0 flex items-center gap-2">
                        {isLive && <span className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ background: '#22C55E' }} />}
                        <span className="font-display text-2xl" style={{ color: isLive ? '#22C55E' : 'var(--text)' }}>{match.final_score_home}</span>
                        <span className="font-display text-lg" style={{ color: 'var(--muted)' }}>–</span>
                        <span className="font-display text-2xl" style={{ color: isLive ? '#22C55E' : 'var(--text)' }}>{match.final_score_away}</span>
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

                {/* Phase badge + LED */}
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ background: phaseC.bg, color: phaseC.text }}>
                    {PHASE_LABEL[match.phase] ?? match.phase}
                  </span>
                  {isLive ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,.12)', color: '#22C55E' }}>
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: '#22C55E' }} />LIVE
                    </span>
                  ) : isDone ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(100,116,139,.1)', color: 'var(--muted)' }}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--border-2)' }} />FIN
                    </span>
                  ) : !locked ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,.12)', color: '#22C55E' }}>
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: '#22C55E' }} />OUVERT
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,.1)', color: '#EF4444' }}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#EF4444' }} />FERMÉ
                    </span>
                  )}
                </div>
              </a>
            )
          })}
        </div>
      ))}
    </div>
  )
}
