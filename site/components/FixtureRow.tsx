import { getFlagUrl } from '@/lib/flags'

// Ligne de match partagée : liste des matchs (pleine largeur) et accueil (compacte)

export const PHASE_LABEL: Record<string, string> = {
  group: 'Groupes', round_of_32: '32es', round_of_16: '8es', quarter: 'Quarts', semi: 'Demies', final: 'Finale',
}
const PHASE_COLOR: Record<string, { bg: string; text: string }> = {
  group:        { bg: 'rgba(74,98,128,.2)',   text: 'var(--muted)' },
  round_of_32:  { bg: 'rgba(14,165,233,.12)', text: '#38BDF8' },
  round_of_16:  { bg: 'rgba(59,130,246,.12)', text: '#60A5FA' },
  quarter:      { bg: 'rgba(139,92,246,.12)', text: '#A78BFA' },
  semi:         { bg: 'rgba(249,115,22,.12)', text: '#FB923C' },
  final:        { bg: 'rgba(240,180,41,.12)', text: '#F0B429' },
}

export type Status = 'live' | 'done' | 'open' | 'closed'

const STATUS: Record<Status, { label: string; color: string; bg: string; pulse?: boolean }> = {
  live:   { label: 'En direct',   color: 'var(--green)', bg: 'rgba(34,197,94,.12)', pulse: true },
  open:   { label: 'Ouvert', color: 'var(--green)', bg: 'rgba(34,197,94,.10)' },
  closed: { label: 'Fermé',  color: '#F87171',      bg: 'rgba(239,68,68,.10)' },
  done:   { label: 'Terminé', color: 'var(--muted)', bg: 'rgba(74,98,128,.15)' },
}

export function StatusTag({ status }: { status: Status }) {
  const c = STATUS[status]
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: c.bg, color: c.color }}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.pulse ? 'animate-pulse' : ''}`} style={{ background: c.color }} aria-hidden="true" />
      {c.label}
    </span>
  )
}

function Team({ name, align = 'left' }: { name: string; align?: 'left' | 'right' }) {
  const flag = getFlagUrl(name, '40x30')
  return (
    <span className={`min-w-0 flex items-center gap-2 font-semibold text-[15px] leading-tight ${align === 'right' ? 'sm:justify-end sm:text-right' : ''}`} style={{ color: 'var(--text)' }}>
      {flag && <img src={flag} alt="" width={20} height={15} className={`shrink-0 w-5 h-[15px] object-cover rounded-sm ${align === 'right' ? 'sm:order-2' : ''}`} />}
      <span className="truncate">{name}</span>
    </span>
  )
}

function Odds({ match }: { match: any }) {
  const odds = [{ l: '1', v: match.odds_home }, { l: 'X', v: match.odds_draw }, { l: '2', v: match.odds_away }].filter(o => o.v)
  if (!odds.length) return <span className="font-display text-xl leading-none" style={{ color: 'var(--muted-2)' }}>VS</span>
  return (
    <span className="inline-flex rounded-md overflow-hidden" style={{ border: '1px solid var(--border-2)', background: 'var(--bg)' }}>
      {odds.map((o, k) => (
        <span key={o.l} className="flex items-baseline gap-1.5 px-2.5 py-1" style={{ borderLeft: k ? '1px solid var(--border)' : undefined }}>
          <span className="text-[11px] font-semibold" style={{ color: 'var(--muted)' }}>{o.l}</span>
          <span className="font-mono text-xs font-semibold" style={{ color: 'var(--gold)' }}>{Number(o.v).toFixed(2)}</span>
        </span>
      ))}
    </span>
  )
}

function Score({ home, away, live }: { home: number; away: number; live: boolean }) {
  const c = live ? 'var(--green)' : 'var(--text)'
  return (
    <span className="inline-flex items-center gap-2 font-display text-3xl leading-none tabular" aria-label={`Score ${home} – ${away}`}>
      <span style={{ color: c }}>{home}</span>
      <span className="text-xl" style={{ color: 'var(--muted)' }}>–</span>
      <span style={{ color: c }}>{away}</span>
    </span>
  )
}

export function FixtureRow({ match, status, showDate = false, last = false, compact = false }: { match: any; status: Status; showDate?: boolean; last?: boolean; compact?: boolean }) {
  const k        = new Date(match.kickoff_at)
  const time     = k.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })
  const day      = k.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Paris' })
  const phaseC   = PHASE_COLOR[match.phase] ?? PHASE_COLOR.group
  const hasScore = (status === 'live' || status === 'done') && match.final_score_home !== null && match.final_score_home !== undefined
  const phase    = PHASE_LABEL[match.phase] ?? match.phase
  const scoreC   = status === 'live' ? 'var(--green)' : 'var(--text)'

  return (
    <li>
      <a
        href={`/matchs/${match.id}`}
        className="hover-bg-3 relative block px-4 sm:px-5 py-3.5"
        style={{ borderBottom: last ? undefined : '1px solid var(--border)' }}
      >
        {status === 'open' && <span className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: 'var(--gold)' }} aria-hidden="true" />}

        {/* Mobile / compact */}
        <div className={compact ? '' : 'sm:hidden'}>
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs flex items-center gap-2">
              <span className="font-mono font-semibold" style={{ color: 'var(--text)' }}>{showDate ? `${day}, ` : ''}{time}</span>
              <span className="font-semibold px-1.5 py-0.5 rounded" style={{ background: phaseC.bg, color: phaseC.text }}>{phase}</span>
            </span>
            <StatusTag status={status} />
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 items-center">
            <Team name={match.home_team} />
            {hasScore ? <span className="font-display text-2xl leading-none tabular w-6 text-center" style={{ color: scoreC }}>{match.final_score_home}</span> : <span />}
            <Team name={match.away_team} />
            {hasScore ? <span className="font-display text-2xl leading-none tabular w-6 text-center" style={{ color: scoreC }}>{match.final_score_away}</span> : <span />}
          </div>
          {!hasScore && <div className="mt-2.5"><Odds match={match} /></div>}
        </div>

        {/* Desktop */}
        {!compact && <div className="hidden sm:grid grid-cols-[4.5rem_1fr_10.5rem_1fr_6rem] items-center gap-4">
          <span className="leading-tight">
            {showDate && <span className="block text-xs font-mono" style={{ color: 'var(--muted)' }}>{day}</span>}
            <span className="block font-mono text-sm font-semibold" style={{ color: 'var(--text)' }}>{time}</span>
            <span className="inline-block mt-1 text-[11px] font-semibold px-1.5 py-px rounded" style={{ background: phaseC.bg, color: phaseC.text }}>{phase}</span>
          </span>
          <Team name={match.home_team} align="right" />
          <span className="flex justify-center">
            {hasScore ? <Score home={match.final_score_home} away={match.final_score_away} live={status === 'live'} /> : <Odds match={match} />}
          </span>
          <Team name={match.away_team} />
          <span className="flex justify-end"><StatusTag status={status} /></span>
        </div>}
      </a>
    </li>
  )
}


export function matchStatus(match: any): Status {
  if (match.status === 'live') return 'live'
  if (match.status === 'finished') return 'done'
  const locked = match.status !== 'upcoming' || new Date() >= new Date(match.bets_locked_at)
  return locked ? 'closed' : 'open'
}
