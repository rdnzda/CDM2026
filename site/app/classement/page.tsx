import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Trophy, BarChart2, Dices, Swords, TrendingUp } from 'lucide-react'

function StreakBadge({ streak }: { streak: number }) {
  // Série de victoires : plus elle est longue, plus le marquage est fort
  const tier =
    streak >= 10 ? { bg: '#F4C430', color: '#111311', border: '#F4C430' } :
    streak >= 7  ? { bg: '#D52B3A', color: '#fff',    border: '#D52B3A' } :
    streak >= 5  ? { bg: 'transparent', color: '#FF6B72', border: '#FF6B72' } :
                   { bg: 'transparent', color: '#F4C430', border: 'rgba(244,196,48,.5)' }
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 font-display text-xs leading-none"
      style={{ background: tier.bg, color: tier.color, border: `1px solid ${tier.border}`, borderRadius: 2 }}
      title={`${streak} paris gagnés d'affilée`}
    >
      Série {streak}
    </span>
  )
}
import PointsLineChart, { ChartSeries } from '@/components/PointsLineChart'
import { buildCumulative, WC_START } from '@/lib/wc-dates'

type Tab = 'points' | 'winrate' | 'audace' | '1v1' | 'progression'

const VIEWS: Record<Exclude<Tab, 'progression'>, string> = {
  points:  'leaderboard_points',
  winrate: 'leaderboard_winrate',
  audace:  'leaderboard_risk',
  '1v1':   'leaderboard_duels',
}

const TABS: { key: Tab; Icon: React.ElementType; label: string }[] = [
  { key: 'points',      Icon: Trophy,      label: 'Points'      },
  { key: 'winrate',     Icon: BarChart2,   label: 'Winrate'     },
  { key: 'audace',      Icon: Dices,       label: 'Audace'      },
  { key: '1v1',         Icon: Swords,      label: 'Duels'       },
  { key: 'progression', Icon: TrendingUp,  label: 'Progression' },
]

const MEDAL_COLORS = ['#F4C430', '#C9CDD3', '#C08A57']

const CHART_COLORS = [
  '#F4C430', '#8FB0FF', '#4CC77F', '#FF6B72',
  '#F2EFE6', '#FB923C', '#2DD4BF', '#F9A8D4',
  '#C9CDD3', '#C08A57',
]

export default async function ClassementPage({ searchParams }: { searchParams: { tab?: Tab } }) {
  const tab: Tab = searchParams.tab && (VIEWS[searchParams.tab as Exclude<Tab, 'progression'>] || searchParams.tab === 'progression')
    ? searchParams.tab
    : 'points'

  const supabase = await createClient()
  let data: any[] | null = null
  let chartSeries: ChartSeries[] = []

  if (tab === 'progression') {
    const service = await createServiceClient()

    // Top 10 by points
    const { data: top10 } = await supabase
      .from('leaderboard_points')
      .select('id, username, total_points')
      .limit(10)

    if (top10?.length) {
      const userIds = top10.map((u: any) => u.id)

      const [{ data: allBets }, { data: allCombos }] = await Promise.all([
        service
          .from('bets')
          .select('user_id, resolved_at, stake, points_won')
          .in('user_id', userIds)
          .in('status', ['won', 'lost', 'refunded'])
          .gte('resolved_at', WC_START)
          .not('resolved_at', 'is', null),
        service
          .from('combos')
          .select('user_id, resolved_at, stake, points_won')
          .in('user_id', userIds)
          .in('status', ['won', 'lost', 'refunded'])
          .gte('resolved_at', WC_START)
          .not('resolved_at', 'is', null),
      ])

      chartSeries = top10.map((u: any, i: number) => {
        const userBets   = (allBets   ?? []).filter((b: any) => b.user_id === u.id)
        const userCombos = (allCombos ?? []).filter((c: any) => c.user_id === u.id)
        const seriesData = buildCumulative(
          [...userBets, ...userCombos],
          [],
          u.total_points,
        )
        return {
          name:  u.username,
          color: CHART_COLORS[i % CHART_COLORS.length],
          data:  seriesData,
        }
      })
    }
  } else {
    const result = await supabase.from(VIEWS[tab as Exclude<Tab, 'progression'>]).select('*').limit(50)
    data = result.data
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-up">

      <style>{`
        .lb-row:hover { background: var(--bg-3); }
        .lb-username { color: var(--text); }
        .lb-username:hover { text-decoration: underline; text-underline-offset: 4px; }
        .lb-tab { color: var(--muted); }
        .lb-tab:hover { color: var(--text); }
      `}</style>

      {/* Page header */}
      <div className="section-head flex-col !items-start !gap-1">
        <h1 className="font-display text-5xl sm:text-6xl leading-none" style={{ color: 'var(--text)' }}>
          Classement
        </h1>
        <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>
          {tab === 'progression'
            ? 'Top 10 · évolution des points depuis le début de la compétition'
            : `Top 50 joueurs · ${TABS.find(t => t.key === tab)?.label}`}
        </p>
      </div>

      {/* Card */}
      <div style={{ border: '1px solid var(--border-2)', borderRadius: 2 }}>

        {/* Tab bar */}
        <nav
          aria-label="Type de classement"
          className="flex overflow-x-auto"
          style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border-2)' }}
        >
          {TABS.map(t => (
            <a
              key={t.key}
              href={`/classement?tab=${t.key}`}
              aria-current={tab === t.key ? 'page' : undefined}
              className="lb-tab shrink-0 flex items-center gap-2 px-4 sm:px-5 py-3 font-display text-base sm:text-lg leading-none whitespace-nowrap"
              style={tab === t.key
                ? { background: 'var(--text)', color: '#111311' }
                : { borderRight: '1px solid var(--border)' }}
            >
              <t.Icon className="w-4 h-4" aria-hidden="true" />
              {t.label}
            </a>
          ))}
        </nav>

        {/* Progression chart */}
        {tab === 'progression' && (
          <div className="p-6">
            {chartSeries.length > 0 ? (
              <PointsLineChart series={chartSeries} showLegend />
            ) : (
              <p className="text-center py-10 text-sm" style={{ color: 'var(--muted)' }}>
                Aucune donnée disponible.
              </p>
            )}
          </div>
        )}

        {/* Table (non-progression tabs) */}
        {tab !== 'progression' && (
          data?.length ? (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="text-left text-xs font-semibold"
                  style={{ color: 'var(--muted)', borderBottom: '1px solid var(--border-2)', background: 'var(--bg-2)' }}
                >
                  <th scope="col" className="pl-3 sm:pl-4 pr-2 py-2.5 w-14">Rang</th>
                  <th scope="col" className="px-2 sm:px-4 py-2.5">Joueur</th>
                  {tab === 'points'  && <><th scope="col" className="px-2 sm:px-4 py-2.5 text-right">Points</th><th scope="col" className="px-2 sm:px-4 py-2.5 text-right">Paris</th><th scope="col" className="px-2 sm:px-4 py-2.5 text-right">Winrate</th></>}
                  {tab === 'winrate' && <><th scope="col" className="px-2 sm:px-4 py-2.5 text-right">Winrate</th><th scope="col" className="px-2 sm:px-4 py-2.5 text-right">Paris</th></>}
                  {tab === 'audace'  && <><th scope="col" className="px-2 sm:px-4 py-2.5 text-right">Cote moy.</th><th scope="col" className="px-2 sm:px-4 py-2.5 text-right">Paris</th></>}
                  {tab === '1v1'     && <><th scope="col" className="px-2 sm:px-4 py-2.5 text-right">Victoires</th><th scope="col" className="px-2 sm:px-4 py-2.5 text-right">Défaites</th><th scope="col" className="px-2 sm:px-4 py-2.5 text-right">Série</th></>}
                </tr>
              </thead>
              <tbody>
                {data.map((row: any, i: number) => (
                  <tr
                    key={row.id}
                    className="lb-row"
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    {/* Rank */}
                    <td className="pl-3 sm:pl-4 pr-2 py-2.5 w-14">
                      <span
                        className="inline-block w-9 text-center font-display text-xl leading-none py-1 tabular"
                        style={i < 3 ? { background: MEDAL_COLORS[i], color: '#111311', borderRadius: 2 } : { color: 'var(--muted)' }}
                      >
                        {i + 1}
                      </span>
                    </td>

                    {/* Username */}
                    <td className="px-2 sm:px-4 py-2.5">
                      <a
                        href={`/profil/${row.username}`}
                        className="lb-username inline-flex items-center gap-2.5"
                      >
                        <span
                          className="shrink-0 w-8 h-8 overflow-hidden hidden sm:flex items-center justify-center"
                          style={{ background: 'var(--bg-3)', borderRadius: 2 }}
                        >
                          {row.avatar_url
                            ? <img src={row.avatar_url} alt="" width={28} height={28} className="w-full h-full object-cover" />
                            : <span className="font-display text-base" style={{ color: 'var(--text)' }}>{row.username?.[0]}</span>
                          }
                        </span>
                        <span className="flex flex-col items-start sm:flex-row sm:items-center gap-1 sm:gap-2.5 min-w-0">
                          <span className="font-semibold text-[15px] break-all sm:break-normal">{row.username}</span>
                          {row.bet_win_streak >= 3 && (
                            <StreakBadge streak={row.bet_win_streak} />
                          )}
                        </span>
                      </a>
                    </td>

                    {/* Stats — Points tab */}
                    {tab === 'points' && <>
                      <td className="px-2 sm:px-4 py-2.5 text-right font-display text-xl leading-none tabular" style={{ color: '#F4C430' }}>
                        {row.total_points?.toLocaleString('fr-FR')}
                      </td>
                      <td className="px-2 sm:px-4 py-2.5 text-right text-sm tabular" style={{ color: 'var(--muted)' }}>
                        {row.total_bets}
                      </td>
                      <td className="px-2 sm:px-4 py-2.5 text-right text-sm tabular" style={{ color: 'var(--muted)' }}>
                        {row.winrate}%
                      </td>
                    </>}

                    {/* Stats — Winrate tab */}
                    {tab === 'winrate' && <>
                      <td className="px-2 sm:px-4 py-2.5 text-right font-display text-xl leading-none tabular" style={{ color: '#4CC77F' }}>
                        {row.winrate}%
                      </td>
                      <td className="px-2 sm:px-4 py-2.5 text-right text-sm tabular" style={{ color: 'var(--muted)' }}>
                        {row.total_bets}
                      </td>
                    </>}

                    {/* Stats — Audace tab */}
                    {tab === 'audace' && <>
                      <td className="px-2 sm:px-4 py-2.5 text-right font-display text-xl leading-none tabular" style={{ color: '#F4C430' }}>
                        ×{Number(row.avg_odds).toFixed(2)}
                      </td>
                      <td className="px-2 sm:px-4 py-2.5 text-right text-sm tabular" style={{ color: 'var(--muted)' }}>
                        {row.total_bets}
                      </td>
                    </>}

                    {/* Stats — 1v1 tab */}
                    {tab === '1v1' && <>
                      <td className="px-2 sm:px-4 py-2.5 text-right font-display text-xl leading-none tabular" style={{ color: '#4CC77F' }}>
                        {row.duels_won}
                      </td>
                      <td className="px-2 sm:px-4 py-2.5 text-right font-display text-xl leading-none tabular" style={{ color: '#FF6B72' }}>
                        {row.duels_lost}
                      </td>
                      <td className="px-2 sm:px-4 py-2.5 text-right text-sm tabular" style={{ color: 'var(--muted)' }}>
                        {row.duels_streak}
                      </td>
                    </>}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          ) : (
            <p className="text-center py-10 text-sm" style={{ color: 'var(--muted)' }}>
              Aucune donnée disponible.
            </p>
          )
        )}
      </div>
    </div>
  )
}
