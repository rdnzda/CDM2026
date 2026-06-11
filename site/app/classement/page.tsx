import { createClient } from '@/lib/supabase/server'
import { Trophy, BarChart2, Dices, Swords, Medal } from 'lucide-react'

type Tab = 'points' | 'winrate' | 'audace' | '1v1'

const VIEWS: Record<Tab, string> = {
  points:  'leaderboard_points',
  winrate: 'leaderboard_winrate',
  audace:  'leaderboard_risk',
  '1v1':   'leaderboard_duels',
}

const TABS: { key: Tab; Icon: React.ElementType; label: string }[] = [
  { key: 'points',  Icon: Trophy,    label: 'Points'  },
  { key: 'winrate', Icon: BarChart2, label: 'Winrate' },
  { key: 'audace',  Icon: Dices,     label: 'Audace'  },
  { key: '1v1',     Icon: Swords,    label: 'Duels'   },
]

const MEDAL_COLORS = ['#F0B429', '#94A3B8', '#92734D']

export default async function ClassementPage({ searchParams }: { searchParams: { tab?: Tab } }) {
  const tab: Tab = (searchParams.tab && VIEWS[searchParams.tab]) ? searchParams.tab : 'points'
  const supabase = await createClient()
  const { data } = await supabase.from(VIEWS[tab]).select('*').limit(50)

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-up">

      <style>{`
        .lb-row-0 { background: rgba(240,180,41,.045); }
        .lb-row-1 { background: rgba(148,163,184,.03); }
        .lb-row-2 { background: rgba(146,115,77,.045); }
        .lb-row:hover { background: var(--bg-3) !important; }
        .lb-username { color: var(--text); transition: color .15s; }
        .lb-username:hover { color: #F0B429; }
      `}</style>

      {/* Page header */}
      <div>
        <h1
          className="font-display text-4xl mb-2"
          style={{ color: 'var(--text)', letterSpacing: '.06em' }}
        >
          CLASSEMENT
        </h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Top 50 joueurs · {TABS.find(t => t.key === tab)?.label}
        </p>
      </div>

      {/* Card */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}
      >

        {/* Tab bar */}
        <div
          className="flex overflow-x-auto"
          style={{ background: 'var(--bg-3)', borderBottom: '1px solid var(--border)' }}
        >
          {TABS.map(t => (
            <a
              key={t.key}
              href={`/classement?tab=${t.key}`}
              className="shrink-0 flex items-center gap-1.5 px-5 py-3 text-[10px] font-bold tracking-[.14em] uppercase transition-colors whitespace-nowrap"
              style={{
                color: tab === t.key ? 'var(--text)' : 'var(--muted)',
                borderBottom: `2px solid ${tab === t.key ? '#F0B429' : 'transparent'}`,
                marginBottom: '-1px',
              }}
            >
              <t.Icon className="w-3.5 h-3.5" />
              {t.label}
            </a>
          ))}
        </div>

        {/* Table */}
        {data?.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr
                className="text-left text-[10px] font-bold tracking-[.12em] uppercase"
                style={{ color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}
              >
                <th className="px-5 py-3 w-12">#</th>
                <th className="px-4 py-3">Joueur</th>
                {tab === 'points'  && <><th className="px-4 py-3 text-right">Points</th><th className="px-4 py-3 text-right">Paris</th><th className="px-4 py-3 text-right">Winrate</th></>}
                {tab === 'winrate' && <><th className="px-4 py-3 text-right">Winrate</th><th className="px-4 py-3 text-right">Paris</th></>}
                {tab === 'audace'  && <><th className="px-4 py-3 text-right">Cote moy.</th><th className="px-4 py-3 text-right">Paris</th></>}
                {tab === '1v1'     && <><th className="px-4 py-3 text-right">Victoires</th><th className="px-4 py-3 text-right">Défaites</th><th className="px-4 py-3 text-right">Série</th></>}
              </tr>
            </thead>
            <tbody>
              {data.map((row: any, i: number) => (
                <tr
                  key={row.id}
                  className={`lb-row transition-colors ${i < 3 ? `lb-row-${i}` : ''}`}
                  style={{ borderBottom: '1px solid rgba(26,47,74,.5)' }}
                >
                  {/* Rank */}
                  <td className="px-5 py-3.5 w-12">
                    {i < 3 ? (
                      <Medal className="w-4 h-4" style={{ color: MEDAL_COLORS[i] }} />
                    ) : (
                      <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
                        {i + 1}
                      </span>
                    )}
                  </td>

                  {/* Username */}
                  <td className="px-4 py-3.5">
                    <a
                      href={`/profil/${row.username}`}
                      className="lb-username inline-flex items-center gap-2.5"
                    >
                      <span
                        className="shrink-0 w-7 h-7 rounded-full overflow-hidden flex items-center justify-center"
                        style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}
                      >
                        {row.avatar_url
                          ? <img src={row.avatar_url} alt="" width={28} height={28} className="w-full h-full object-cover" />
                          : <span className="text-[10px] font-bold uppercase" style={{ color: '#F0B429' }}>{row.username?.[0]}</span>
                        }
                      </span>
                      <span className="font-semibold text-sm">{row.username}</span>
                    </a>
                  </td>

                  {/* Stats — Points tab */}
                  {tab === 'points' && <>
                    <td className="px-4 py-3.5 text-right font-mono font-bold" style={{ color: '#F0B429' }}>
                      {row.total_points?.toLocaleString('fr-FR')}
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs" style={{ color: 'var(--muted)' }}>
                      {row.total_bets}
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs" style={{ color: 'var(--muted)' }}>
                      {row.winrate}%
                    </td>
                  </>}

                  {/* Stats — Winrate tab */}
                  {tab === 'winrate' && <>
                    <td className="px-4 py-3.5 text-right font-mono font-bold" style={{ color: '#22C55E' }}>
                      {row.winrate}%
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs" style={{ color: 'var(--muted)' }}>
                      {row.total_bets}
                    </td>
                  </>}

                  {/* Stats — Audace tab */}
                  {tab === 'audace' && <>
                    <td className="px-4 py-3.5 text-right font-mono font-bold" style={{ color: '#F0B429' }}>
                      ×{Number(row.avg_odds).toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs" style={{ color: 'var(--muted)' }}>
                      {row.total_bets}
                    </td>
                  </>}

                  {/* Stats — 1v1 tab */}
                  {tab === '1v1' && <>
                    <td className="px-4 py-3.5 text-right font-mono font-semibold" style={{ color: '#22C55E' }}>
                      {row.duels_won}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-semibold" style={{ color: '#EF4444' }}>
                      {row.duels_lost}
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs" style={{ color: 'var(--muted)' }}>
                      {row.duels_streak}
                    </td>
                  </>}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-center py-10 text-sm" style={{ color: 'var(--muted)' }}>
            Aucune donnée disponible.
          </p>
        )}
      </div>
    </div>
  )
}
