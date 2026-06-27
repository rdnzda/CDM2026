import { createClient } from '@/lib/supabase/server'
import { getFlagUrl } from '@/lib/flags'
import LiveRefresh from '@/components/LiveRefresh'

const PHASES = ['round_of_32', 'round_of_16', 'quarter', 'semi', 'final'] as const
type Phase = typeof PHASES[number]

const PHASE_CONFIG: Record<Phase, { label: string; short: string; mult: string; color: string; bg: string }> = {
  round_of_32: { label: '32es de finale', short: '32es', mult: '×1.25', color: '#38BDF8', bg: 'rgba(14,165,233,.12)' },
  round_of_16: { label: '8es de finale',  short: '8es',  mult: '×1.5',  color: '#60A5FA', bg: 'rgba(59,130,246,.12)' },
  quarter:     { label: 'Quarts',         short: 'QF',   mult: '×2.0',  color: '#A78BFA', bg: 'rgba(139,92,246,.12)' },
  semi:        { label: 'Demi-finales',   short: 'SF',   mult: '×2.5',  color: '#FB923C', bg: 'rgba(249,115,22,.12)' },
  final:       { label: 'Finale',         short: 'F',    mult: '×3.0',  color: '#F0B429', bg: 'rgba(240,180,41,.12)' },
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', {
    weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'Europe/Paris',
  })
}
function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
  })
}

type Match = {
  id: string
  home_team: string
  away_team: string
  kickoff_at: string
  status: string
  phase: string
  final_score_home: number | null
  final_score_away: number | null
  result: string | null
  odds_home: number | null
  odds_draw: number | null
  odds_away: number | null
}

function MatchCard({ match, phaseColor }: { match: Match; phaseColor: string }) {
  const isDone = match.status === 'finished'
  const isLive = match.status === 'live'
  const hasScore = match.final_score_home !== null

  const homeWon = isDone && match.result === 'home'
  const awayWon = isDone && match.result === 'away'

  return (
    <a
      href={`/matchs/${match.id}`}
      className="group block rounded-xl overflow-hidden transition-all hover-bg-3"
      style={{
        background: 'var(--bg-2)',
        border: `1px solid ${isLive ? 'rgba(34,197,94,.3)' : 'var(--border)'}`,
      }}
    >
      {/* Date strip */}
      <div className="px-3 py-1.5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-[10px] font-mono" style={{ color: 'var(--muted)' }}>
          {fmtDate(match.kickoff_at)} · {fmtTime(match.kickoff_at)}
        </span>
        {isLive && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold" style={{ color: '#22C55E' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#22C55E' }} />
            LIVE
          </span>
        )}
        {isDone && (
          <span className="text-[10px] font-semibold" style={{ color: 'var(--muted)' }}>FIN</span>
        )}
      </div>

      {/* Teams */}
      <div className="p-3 space-y-2">
        {/* Home */}
        <div className="flex items-center gap-2">
          {getFlagUrl(match.home_team) && (
            <img src={getFlagUrl(match.home_team)!} alt="" width={18} height={13} className="rounded-sm shrink-0" />
          )}
          <span
            className="flex-1 text-sm font-semibold truncate"
            style={{ color: homeWon ? 'var(--text)' : isDone ? 'var(--muted)' : 'var(--text)', fontWeight: homeWon ? 700 : 500 }}
          >
            {match.home_team}
          </span>
          {hasScore && (
            <span
              className="font-display text-lg leading-none shrink-0"
              style={{ color: homeWon ? phaseColor : isLive ? '#22C55E' : 'var(--text)' }}
            >
              {match.final_score_home}
            </span>
          )}
        </div>

        {/* Separator */}
        {!hasScore && (
          <div className="flex items-center gap-2 pl-6">
            {match.odds_home || match.odds_draw || match.odds_away ? (
              <div className="flex items-center gap-3">
                {[{ l: '1', v: match.odds_home }, { l: 'X', v: match.odds_draw }, { l: '2', v: match.odds_away }].map(o => o.v && (
                  <div key={o.l} className="flex items-baseline gap-1">
                    <span className="text-[9px]" style={{ color: 'var(--muted)' }}>{o.l}</span>
                    <span className="font-mono text-xs font-semibold" style={{ color: '#F0B429' }}>×{Number(o.v).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-xs" style={{ color: 'var(--border-2)' }}>–</span>
            )}
          </div>
        )}

        {/* Away */}
        <div className="flex items-center gap-2">
          {getFlagUrl(match.away_team) && (
            <img src={getFlagUrl(match.away_team)!} alt="" width={18} height={13} className="rounded-sm shrink-0" />
          )}
          <span
            className="flex-1 text-sm font-semibold truncate"
            style={{ color: awayWon ? 'var(--text)' : isDone ? 'var(--muted)' : 'var(--text)', fontWeight: awayWon ? 700 : 500 }}
          >
            {match.away_team}
          </span>
          {hasScore && (
            <span
              className="font-display text-lg leading-none shrink-0"
              style={{ color: awayWon ? phaseColor : isLive ? '#22C55E' : 'var(--text)' }}
            >
              {match.final_score_away}
            </span>
          )}
        </div>
      </div>
    </a>
  )
}

export default async function BracketPage() {
  const supabase = await createClient()
  const { data: raw } = await supabase
    .from('matches')
    .select('id, home_team, away_team, kickoff_at, status, phase, final_score_home, final_score_away, result, odds_home, odds_draw, odds_away')
    .in('phase', PHASES as unknown as string[])
    .order('kickoff_at', { ascending: true })

  const matches = (raw ?? []) as Match[]

  const byPhase = PHASES.reduce<Record<Phase, Match[]>>((acc, p) => {
    acc[p] = matches.filter(m => m.phase === p)
    return acc
  }, {} as Record<Phase, Match[]>)

  const hasLive = matches.some(m => m.status === 'live')
  const hasAnyMatch = matches.length > 0

  // Stats
  const totalPlayed = matches.filter(m => m.status === 'finished').length
  const currentPhase = PHASES.find(p => byPhase[p].some(m => m.status !== 'finished' )) ?? null

  return (
    <div className="space-y-10 animate-fade-up">
      {hasLive && <LiveRefresh intervalMs={30000} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div>
          <h1 className="font-display text-5xl" style={{ color: 'var(--text)', letterSpacing: '.05em' }}>BRACKET</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Phase à élimination directe · CDM 2026</p>
        </div>
        {currentPhase && (
          <div
            className="sm:ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold"
            style={{
              background: PHASE_CONFIG[currentPhase].bg,
              color: PHASE_CONFIG[currentPhase].color,
              border: `1px solid ${PHASE_CONFIG[currentPhase].color}30`,
            }}
          >
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: PHASE_CONFIG[currentPhase].color }} />
            En cours : {PHASE_CONFIG[currentPhase].label}
          </div>
        )}
      </div>

      {/* Phase summary pills */}
      {hasAnyMatch && (
        <div className="flex flex-wrap gap-2">
          {PHASES.map(p => {
            const cfg    = PHASE_CONFIG[p]
            const pm     = byPhase[p]
            const done   = pm.filter(m => m.status === 'finished').length
            if (!pm.length) return null
            return (
              <a
                key={p}
                href={`#${p}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}20` }}
              >
                <span>{cfg.label}</span>
                <span className="font-mono opacity-70">{done}/{pm.length}</span>
                <span className="font-mono" style={{ opacity: .5 }}>{cfg.mult}</span>
              </a>
            )
          })}
        </div>
      )}

      {/* No data yet */}
      {!hasAnyMatch && (
        <div className="rounded-2xl p-14 text-center" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
          <p className="text-2xl mb-2">⏳</p>
          <p className="font-semibold" style={{ color: 'var(--text)' }}>La phase à élimination directe n'a pas encore commencé</p>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Les matchs apparaîtront ici dès que le tirage au sort sera effectué.</p>
        </div>
      )}

      {/* Phase sections */}
      {PHASES.map(p => {
        const cfg = PHASE_CONFIG[p]
        const pm  = byPhase[p]
        if (!pm.length) return null

        const cols = p === 'round_of_32' ? 4
          : p === 'round_of_16' ? 4
          : p === 'quarter'     ? 2
          : p === 'semi'        ? 2
          : 1

        return (
          <section key={p} id={p} className="space-y-4 scroll-mt-20">
            {/* Phase header */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-lg"
                  style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}20` }}
                >
                  {cfg.short}
                </span>
                <h2 className="font-semibold" style={{ color: 'var(--text)' }}>{cfg.label}</h2>
                <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
                  {cfg.mult} · {pm.filter(m => m.status === 'finished').length}/{pm.length} joués
                </span>
              </div>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            </div>

            {/* Match grid */}
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
            >
              {pm.map(m => (
                <MatchCard key={m.id} match={m} phaseColor={cfg.color} />
              ))}
            </div>

            {/* Progress bar */}
            {pm.length > 0 && (
              <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(pm.filter(m => m.status === 'finished').length / pm.length) * 100}%`,
                    background: cfg.color,
                  }}
                />
              </div>
            )}
          </section>
        )
      })}

      {/* Footer stats */}
      {hasAnyMatch && (
        <div className="rounded-2xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
          <div>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Matchs joués</p>
            <p className="font-display text-2xl mt-0.5" style={{ color: 'var(--text)' }}>{totalPlayed}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Matchs restants</p>
            <p className="font-display text-2xl mt-0.5" style={{ color: 'var(--text)' }}>{matches.length - totalPlayed}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Total éliminatoires</p>
            <p className="font-display text-2xl mt-0.5" style={{ color: 'var(--text)' }}>{matches.length}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Phase en cours</p>
            <p className="font-semibold text-sm mt-0.5" style={{ color: currentPhase ? PHASE_CONFIG[currentPhase].color : 'var(--muted)' }}>
              {currentPhase ? PHASE_CONFIG[currentPhase].label : '—'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
