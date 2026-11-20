import { createClient } from '@/lib/supabase/server'
import { getFlagUrl } from '@/lib/flags'
import LiveRefresh from '@/components/LiveRefresh'

const PHASE_LABEL: Record<string, string> = {
  group: 'Groupes', round_of_32: '32es', round_of_16: '8es', quarter: 'Quarts', semi: 'Demies', final: 'Finale',
}
// Couleur du libellé de phase : neutre en groupes, puis on « monte » vers la finale
const PHASE_COLOR: Record<string, { bg: string; text: string }> = {
  group:        { bg: 'transparent', text: 'var(--muted)' },
  round_of_32:  { bg: 'transparent', text: '#8FB0FF' },
  round_of_16:  { bg: 'transparent', text: '#8FB0FF' },
  quarter:      { bg: 'transparent', text: '#FF9EA3' },
  semi:         { bg: 'transparent', text: '#FB923C' },
  final:        { bg: 'transparent', text: '#F4C430' },
}

type Status = 'live' | 'done' | 'open' | 'closed'

function StatusTag({ status }: { status: Status }) {
  if (status === 'live') return (
    <span className="inline-flex items-center gap-1.5 font-display text-sm leading-none px-1.5 py-1" style={{ background: 'var(--host-red)', color: '#fff', borderRadius: 2 }}>
      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#fff' }} aria-hidden="true" />Live
    </span>
  )
  const map = {
    done:   { label: 'Fin',    color: 'var(--muted)', mark: 'var(--border-2)' },
    open:   { label: 'Ouvert', color: 'var(--green)', mark: 'var(--green)' },
    closed: { label: 'Fermé',  color: 'var(--red)',   mark: 'var(--red)' },
  }[status]
  return (
    <span className="inline-flex items-center gap-1.5 font-display text-sm leading-none" style={{ color: map.color }}>
      <span className="w-2 h-2" style={{ background: map.mark }} aria-hidden="true" />{map.label}
    </span>
  )
}

function Team({ name, align = 'left' }: { name: string; align?: 'left' | 'right' }) {
  const flag = getFlagUrl(name, '40x30')
  return (
    <span className={`min-w-0 flex items-center gap-2 font-semibold text-[15px] sm:text-base leading-tight ${align === 'right' ? 'sm:justify-end sm:text-right' : ''}`} style={{ color: 'var(--text)' }}>
      {flag && <img src={flag} alt="" width={22} height={16} className={`shrink-0 w-[22px] h-4 object-cover ${align === 'right' ? 'sm:order-2' : ''}`} style={{ outline: '1px solid rgba(255,255,255,.12)' }} />}
      <span className="truncate">{name}</span>
    </span>
  )
}

function Odds({ match }: { match: any }) {
  const odds = [{ l: '1', v: match.odds_home }, { l: 'X', v: match.odds_draw }, { l: '2', v: match.odds_away }].filter(o => o.v)
  if (!odds.length) return <span className="font-display text-lg leading-none" style={{ color: 'var(--muted)' }}>VS</span>
  return (
    <span className="inline-flex" style={{ border: '1px solid var(--border-2)', borderRadius: 2, background: '#0A0B0A' }}>
      {odds.map((o, k) => (
        <span key={o.l} className="flex items-baseline gap-1 px-2 py-1" style={{ borderLeft: k ? '1px solid var(--border)' : undefined }}>
          <span className="text-[11px] font-semibold" style={{ color: 'var(--muted)' }}>{o.l}</span>
          <span className="font-mono text-sm font-bold" style={{ color: 'var(--gold)' }}>{Number(o.v).toFixed(2)}</span>
        </span>
      ))}
    </span>
  )
}

function Score({ home, away, live }: { home: number; away: number; live: boolean }) {
  return (
    <span className="inline-flex items-stretch font-display text-2xl leading-none tabular" style={{ borderRadius: 2, overflow: 'hidden' }} aria-label={`Score ${home} – ${away}`}>
      <span className="px-2 py-1" style={{ background: live ? 'var(--host-red)' : '#0A0B0A', color: live ? '#fff' : 'var(--gold)' }}>{home}</span>
      <span className="px-1 py-1" style={{ background: '#0A0B0A', color: 'var(--muted)' }}>–</span>
      <span className="px-2 py-1" style={{ background: live ? 'var(--host-red)' : '#0A0B0A', color: live ? '#fff' : 'var(--gold)' }}>{away}</span>
    </span>
  )
}

function FixtureRow({ match, status, showDate = false }: { match: any; status: Status; showDate?: boolean }) {
  const k        = new Date(match.kickoff_at)
  const time     = k.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })
  const day      = k.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Paris' })
  const phaseC   = PHASE_COLOR[match.phase] ?? PHASE_COLOR.group
  const hasScore = (status === 'live' || status === 'done') && match.final_score_home !== null && match.final_score_home !== undefined
  const phase    = PHASE_LABEL[match.phase] ?? match.phase

  return (
    <li>
      <a
        href={`/matchs/${match.id}`}
        className="hover-bg-3 block px-3 sm:px-4 py-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {/* Mobile : en-tête + deux lignes d'équipes, score à droite */}
        <div className="sm:hidden">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-sm">
              <span className="font-mono font-bold" style={{ color: 'var(--text)' }}>{showDate ? `${day} · ` : ''}{time}</span>
              <span className="ml-2 font-semibold" style={{ color: phaseC.text }}>{phase}</span>
            </span>
            <StatusTag status={status} />
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 items-center">
            <Team name={match.home_team} />
            {hasScore ? <span className="font-display text-2xl leading-none tabular w-7 text-center" style={{ color: status === 'live' ? 'var(--red)' : 'var(--gold)' }}>{match.final_score_home}</span> : <span />}
            <Team name={match.away_team} />
            {hasScore ? <span className="font-display text-2xl leading-none tabular w-7 text-center" style={{ color: status === 'live' ? 'var(--red)' : 'var(--gold)' }}>{match.final_score_away}</span> : <span />}
          </div>
          {!hasScore && <div className="mt-2.5"><Odds match={match} /></div>}
        </div>

        {/* Desktop : ligne de feuille de match */}
        <div className="hidden sm:grid grid-cols-[4.5rem_1fr_auto_1fr_5.5rem] items-center gap-4">
          <span className="leading-tight">
            {showDate && <span className="block text-xs font-mono" style={{ color: 'var(--muted)' }}>{day}</span>}
            <span className="block font-mono text-base font-bold" style={{ color: 'var(--text)' }}>{time}</span>
            <span className="block text-xs font-semibold" style={{ color: phaseC.text }}>{phase}</span>
          </span>
          <Team name={match.home_team} align="right" />
          <span className="flex justify-center min-w-[9.5rem]">
            {hasScore ? <Score home={match.final_score_home} away={match.final_score_away} live={status === 'live'} /> : <Odds match={match} />}
          </span>
          <Team name={match.away_team} />
          <span className="flex justify-end"><StatusTag status={status} /></span>
        </div>
      </a>
    </li>
  )
}

function Block({ title, marker, count, children }: { title: string; marker: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="space-y-0">
      <h2 className="flex items-center gap-2.5 font-display text-xl sm:text-2xl leading-none pb-2" style={{ color: 'var(--text)' }}>
        <span className="w-3 h-3 shrink-0" style={{ background: marker }} aria-hidden="true" />
        {title}
        {count !== undefined && <span className="font-sans text-sm font-semibold normal-case" style={{ color: 'var(--muted)' }}>{count}</span>}
      </h2>
      <ul style={{ borderTop: `2px solid ${marker}` }}>{children}</ul>
    </section>
  )
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
  const knockout16     = allMatches.filter((m: any) =>
    m.status === 'upcoming' && m.phase !== 'group'
  )
  const soonMatches    = allMatches.filter((m: any) => {
    if (m.status !== 'upcoming') return false
    if (m.phase !== 'group') return false   // déjà dans knockout16
    const k = new Date(m.kickoff_at)
    return k > now && k <= in3h
  })
  const hasLiveMatches  = liveMatches.length > 0
  const hasKnockout16   = knockout16.length > 0
  const pinnedIds       = new Set([...liveMatches, ...soonMatches, ...knockout16].map((m: any) => m.id))
  const rest            = allMatches.filter((m: any) => !pinnedIds.has(m.id))

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
      <header className="section-head justify-between flex-wrap">
        <h1 className="font-display text-5xl sm:text-6xl leading-none" style={{ color: 'var(--text)' }}>Matchs</h1>
        <span className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>{matches?.length ?? 0} rencontres · heures de Paris</span>
      </header>

      {/* ── Phase éliminatoire à venir en tête ── */}
      {hasKnockout16 && (
        <Block title="Phase éliminatoire" marker="#8FB0FF" count={knockout16.length}>
          {knockout16.map((match: any) => {
            const locked = new Date() >= new Date(match.bets_locked_at)
            return <FixtureRow key={match.id} match={match} status={locked ? 'closed' : 'open'} showDate />
          })}
        </Block>
      )}

      {/* Matchs LIVE en tête */}
      {hasLiveMatches && (
        <Block title="En direct" marker="var(--host-red)" count={liveMatches.length}>
          {liveMatches.map((match: any) => <FixtureRow key={match.id} match={match} status="live" />)}
        </Block>
      )}

      {/* Matchs à venir dans les 3h */}
      {soonMatches.length > 0 && (
        <Block title="À venir" marker="var(--gold)" count={soonMatches.length}>
          {soonMatches.map((match: any) => {
            const locked = new Date() >= new Date(match.bets_locked_at)
            return <FixtureRow key={match.id} match={match} status={locked ? 'closed' : 'open'} />
          })}
        </Block>
      )}

      {Object.keys(grouped).length === 0 && !hasLiveMatches && soonMatches.length === 0 && (
        <div className="py-14 px-6 text-center" style={{ border: '1px dashed var(--border-2)' }}>
          <p style={{ color: 'var(--muted)' }}>Aucun match disponible pour le moment.</p>
        </div>
      )}

      {Object.entries(grouped).map(([date, dayMatches]) => (
        <Block key={date} title={date} marker="var(--border-2)" count={dayMatches!.length}>
          {dayMatches!.map((match: any) => {
            const locked = match.status !== 'upcoming' || new Date() >= new Date(match.bets_locked_at)
            const status: Status = match.status === 'live' ? 'live' : match.status === 'finished' ? 'done' : !locked ? 'open' : 'closed'
            return <FixtureRow key={match.id} match={match} status={status} />
          })}
        </Block>
      ))}
    </div>
  )
}
