import { createClient } from '@/lib/supabase/server'
import { FixtureRow, type Status } from '@/components/FixtureRow'
import LiveRefresh from '@/components/LiveRefresh'

function Block({ title, marker, count, children }: { title: string; marker: string; count?: number; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="flex items-center gap-3 mb-3">
        <span className="inline-flex items-center gap-2 text-base font-semibold" style={{ color: 'var(--text)' }}>
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: marker }} aria-hidden="true" />
          {title.charAt(0).toUpperCase() + title.slice(1)}
        </span>
        {count !== undefined && <span className="text-sm tabular" style={{ color: 'var(--muted)' }}>{count} {count > 1 ? 'matchs' : 'match'}</span>}
        <span className="flex-1 h-px" style={{ background: 'var(--border)' }} aria-hidden="true" />
      </h2>
      <ul className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>{children}</ul>
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
    <div className="space-y-10">
      {hasLiveMatches && <LiveRefresh intervalMs={30000} />}
      <header className="section-head justify-between flex-wrap">
        <h1 className="font-display text-5xl leading-none" style={{ color: 'var(--text)' }}>MATCHS</h1>
        <span className="text-sm" style={{ color: 'var(--muted)' }}>{matches?.length ?? 0} rencontres, horaires à l’heure de Paris</span>
      </header>

      {/* ── Phase éliminatoire à venir en tête ── */}
      {hasKnockout16 && (
        <Block title="Phase éliminatoire" marker="#60A5FA" count={knockout16.length}>
          {knockout16.map((match: any, i: number) => {
            const locked = new Date() >= new Date(match.bets_locked_at)
            return <FixtureRow key={match.id} match={match} status={locked ? 'closed' : 'open'} showDate last={i === knockout16.length - 1} />
          })}
        </Block>
      )}

      {/* Matchs LIVE en tête */}
      {hasLiveMatches && (
        <Block title="En direct" marker="var(--green)" count={liveMatches.length}>
          {liveMatches.map((match: any, i: number) => <FixtureRow key={match.id} match={match} status="live" last={i === liveMatches.length - 1} />)}
        </Block>
      )}

      {/* Matchs à venir dans les 3h */}
      {soonMatches.length > 0 && (
        <Block title="À venir" marker="var(--gold)" count={soonMatches.length}>
          {soonMatches.map((match: any, i: number) => {
            const locked = new Date() >= new Date(match.bets_locked_at)
            return <FixtureRow key={match.id} match={match} status={locked ? 'closed' : 'open'} last={i === soonMatches.length - 1} />
          })}
        </Block>
      )}

      {Object.keys(grouped).length === 0 && !hasLiveMatches && soonMatches.length === 0 && (
        <div className="rounded-lg py-14 px-6 text-center" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
          <p className="font-semibold" style={{ color: 'var(--text)' }}>Aucun match disponible pour le moment.</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Le calendrier se met à jour automatiquement toutes les 6 heures. Reviens un peu plus tard.</p>
        </div>
      )}

      {Object.entries(grouped).map(([date, dayMatches]) => (
        <Block key={date} title={date} marker="var(--muted)" count={dayMatches!.length}>
          {dayMatches!.map((match: any, i: number) => {
            const locked = match.status !== 'upcoming' || new Date() >= new Date(match.bets_locked_at)
            const status: Status = match.status === 'live' ? 'live' : match.status === 'finished' ? 'done' : !locked ? 'open' : 'closed'
            return <FixtureRow key={match.id} match={match} status={status} last={i === dayMatches!.length - 1} />
          })}
        </Block>
      ))}
    </div>
  )
}
