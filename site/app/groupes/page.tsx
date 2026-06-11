import { createClient } from '@/lib/supabase/server'
import { getFlagUrl } from '@/lib/flags'

type TeamRow = {
  team: string
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  pts: number
}

function buildStandings(matches: any[]) {
  const groups: Record<string, Record<string, TeamRow>> = {}

  for (const m of matches) {
    const g = m.group_name as string
    if (!g) continue
    if (!groups[g]) groups[g] = {}

    const grp = groups[g]!
    if (!grp[m.home_team]) grp[m.home_team] = { team: m.home_team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 }
    if (!grp[m.away_team]) grp[m.away_team] = { team: m.away_team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 }

    if (m.status === 'finished' && m.final_score_home !== null && m.final_score_away !== null) {
      const h = grp[m.home_team]!
      const a = grp[m.away_team]!
      h.played++; a.played++
      h.gf += m.final_score_home; h.ga += m.final_score_away
      a.gf += m.final_score_away; a.ga += m.final_score_home
      if (m.final_score_home > m.final_score_away) { h.won++; h.pts += 3; a.lost++ }
      else if (m.final_score_home < m.final_score_away) { a.won++; a.pts += 3; h.lost++ }
      else { h.drawn++; h.pts++; a.drawn++; a.pts++ }
    }
  }

  return groups
}

function sortGroup(teams: TeamRow[]): TeamRow[] {
  return [...teams].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts
    const gdDiff = (b.gf - b.ga) - (a.gf - a.ga)
    if (gdDiff !== 0) return gdDiff
    return b.gf - a.gf
  })
}

// Row qualifier indicator: 1st=gold, 2nd=green, 3rd=possible (blue), 4th=out
const QUAL_STYLE = [
  { left: '#F0B429', title: '1er — Qualifié' },
  { left: '#22C55E', title: '2e — Qualifié' },
  { left: '#60A5FA', title: '3e — Possible' },
  { left: 'transparent', title: '' },
]

export default async function GroupesPage() {
  const supabase = await createClient()
  const { data: matches } = await supabase
    .from('matches')
    .select('group_name, home_team, away_team, final_score_home, final_score_away, status, kickoff_at')
    .eq('phase', 'group')
    .order('group_name', { ascending: true })

  const groups = buildStandings(matches ?? [])
  const sortedGroupNames = Object.keys(groups).sort()

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="flex items-baseline gap-4">
        <h1 className="font-display text-5xl" style={{ color: 'var(--text)', letterSpacing: '.05em' }}>GROUPES</h1>
        <span className="text-sm" style={{ color: 'var(--muted)' }}>{sortedGroupNames.length} groupes · phase de poules</span>
      </div>

      {sortedGroupNames.length === 0 && (
        <div className="rounded-2xl p-14 text-center" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--muted)' }}>Données des groupes non disponibles pour le moment.</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sortedGroupNames.map(groupName => {
          const teams = sortGroup(Object.values(groups[groupName]!))

          return (
            <div
              key={groupName}
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}
            >
              {/* Group header */}
              <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-3)' }}>
                <span className="font-display text-lg tracking-widest" style={{ color: '#F0B429' }}>
                  GROUPE {groupName}
                </span>
                <span className="text-xs ml-auto" style={{ color: 'var(--muted)' }}>
                  {teams.reduce((s, t) => s + t.played, 0) / 2} / {teams.length * (teams.length - 1) / 2} matchs joués
                </span>
              </div>

              {/* Table header */}
              <div className="grid items-center px-4 py-1.5 text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--muted)', gridTemplateColumns: '1fr repeat(7, 28px)' }}>
                <span>Équipe</span>
                <span className="text-center">Pts</span>
                <span className="text-center">J</span>
                <span className="text-center">V</span>
                <span className="text-center">N</span>
                <span className="text-center">D</span>
                <span className="text-center">BP</span>
                <span className="text-center">Diff</span>
              </div>

              {/* Team rows */}
              {teams.map((t, i) => {
                const qual = QUAL_STYLE[i] ?? QUAL_STYLE[3]!
                const gd = t.gf - t.ga

                return (
                  <div
                    key={t.team}
                    className="grid items-center px-4 py-2.5 relative"
                    style={{
                      gridTemplateColumns: '1fr repeat(7, 28px)',
                      borderTop: '1px solid var(--border)',
                      borderLeft: `2px solid ${qual.left}`,
                    }}
                    title={qual.title}
                  >
                    {/* Team name + flag */}
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      {getFlagUrl(t.team) && <img src={getFlagUrl(t.team)!} alt="" width={20} height={15} className="shrink-0 rounded-sm" />}
                      <span className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{t.team}</span>
                    </div>

                    {/* Pts */}
                    <span className="text-center text-sm font-bold font-mono" style={{ color: '#F0B429' }}>{t.pts}</span>
                    {/* J */}
                    <span className="text-center text-xs" style={{ color: 'var(--muted)' }}>{t.played}</span>
                    {/* V */}
                    <span className="text-center text-xs" style={{ color: t.won > 0 ? '#22C55E' : 'var(--muted)' }}>{t.won}</span>
                    {/* N */}
                    <span className="text-center text-xs" style={{ color: 'var(--muted)' }}>{t.drawn}</span>
                    {/* D */}
                    <span className="text-center text-xs" style={{ color: t.lost > 0 ? '#EF4444' : 'var(--muted)' }}>{t.lost}</span>
                    {/* BP */}
                    <span className="text-center text-xs" style={{ color: 'var(--muted)' }}>{t.gf}</span>
                    {/* Diff */}
                    <span
                      className="text-center text-xs font-semibold font-mono"
                      style={{ color: gd > 0 ? '#22C55E' : gd < 0 ? '#EF4444' : 'var(--muted)' }}
                    >
                      {gd > 0 ? `+${gd}` : gd}
                    </span>
                  </div>
                )
              })}

              {/* Qualifier legend */}
              <div className="flex items-center gap-4 px-4 py-2" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-3)' }}>
                <span className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--muted)' }}>
                  <span className="w-2 h-2 rounded-sm inline-block" style={{ background: '#F0B429' }} />Qualifié
                </span>
                <span className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--muted)' }}>
                  <span className="w-2 h-2 rounded-sm inline-block" style={{ background: '#60A5FA' }} />Possible
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
