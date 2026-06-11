import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Coins, CheckCircle2, Clock, BarChart2, Zap, Sparkles, Award, TrendingUp, Swords } from 'lucide-react'
import PointsLineChart from '@/components/PointsLineChart'
import { buildCumulative, WC_START } from '@/lib/wc-dates'
import DailyClaimButton from './DailyClaimButton'
import BetActions from './BetActions'
import ComboActions from './ComboActions'
import ChallengeActions from './ChallengeActions'

function todayParis(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' })
}

function dailyPoints(): number {
  const d = new Date()
  if (d >= new Date('2026-07-18')) return 500
  if (d >= new Date('2026-07-14')) return 300
  if (d >= new Date('2026-07-08')) return 250
  if (d >= new Date('2026-07-02')) return 200
  return 150
}

const BET_TYPE_LABELS: Record<string, string> = {
  result: 'Résultat', exact_score: 'Score exact', scorer: 'Buteur',
  btts: 'BTTS', over_under: 'Over/Under', red_card: 'Carton rouge',
  best_half: 'Mi-temps', extra_time: 'Prolongations', result_combo: 'Résultat+',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/api/auth/login')

  const service = await createServiceClient()
  const discordId = authUser.user_metadata?.provider_id ?? authUser.user_metadata?.sub

  const { data: dbUser } = await service.from('users').select('*').eq('discord_id', discordId).single()
  if (!dbUser) redirect('/api/auth/login')

  const available = dbUser.total_points - dbUser.frozen_points
  const winrate = dbUser.total_bets > 0 ? Math.round(dbUser.bets_won * 100 / dbUser.total_bets) : 0
  const progressPct = Math.min(100, Math.round((dbUser.total_points / 50000) * 100))

  const today = todayParis()

  const [
    { data: pendingBets },
    { data: pendingCombos },
    { data: pendingChallenges },
    { data: wildcards },
    { data: boosts },
    { data: achievements },
    { data: resolvedBets },
    { data: resolvedCombos },
    { data: finishedChallenges },
    { data: todayClaim },
  ] = await Promise.all([
    service.from('bets')
      .select('*, matches(home_team, away_team, kickoff_at, bets_locked_at)')
      .eq('user_id', dbUser.id).eq('status', 'pending')
      .order('created_at', { ascending: false }).limit(8),
    service.from('combos')
      .select('*, combo_legs(*, matches(home_team, away_team, bets_locked_at))')
      .eq('user_id', dbUser.id).eq('status', 'pending')
      .order('created_at', { ascending: false }).limit(4),
    service.from('challenges')
      .select('*, challenger:users!challenger_id(id, username, avatar_url), opponent:users!opponent_id(id, username, avatar_url)')
      .or(`challenger_id.eq.${dbUser.id},opponent_id.eq.${dbUser.id}`)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    service.from('user_wildcards').select('*').eq('user_id', dbUser.id).eq('used', false),
    service.from('user_boosts').select('*').eq('user_id', dbUser.id).eq('used', false),
    service.from('user_achievements').select('*, achievements(*)').eq('user_id', dbUser.id),
    service.from('bets').select('resolved_at, stake, points_won').eq('user_id', dbUser.id).in('status', ['won', 'lost', 'refunded']).gte('resolved_at', WC_START).not('resolved_at', 'is', null),
    service.from('combos').select('resolved_at, stake, points_won').eq('user_id', dbUser.id).in('status', ['won', 'lost', 'refunded']).gte('resolved_at', WC_START).not('resolved_at', 'is', null),
    service.from('challenges').select('finished_at, stake, winner_id').eq('status', 'finished').or(`challenger_id.eq.${dbUser.id},opponent_id.eq.${dbUser.id}`).gte('finished_at', WC_START).not('finished_at', 'is', null),
    service.from('daily_claims').select('id').eq('user_id', dbUser.id).eq('claim_date', today).maybeSingle(),
  ])

  const chartData = buildCumulative(
    [...(resolvedBets ?? []), ...(resolvedCombos ?? [])],
    (finishedChallenges ?? []).map(ch => ({
      finished_at: ch.finished_at,
      stake:       ch.stake,
      is_winner:   ch.winner_id === dbUser.id,
    })),
    dbUser.total_points,
  )

  const WILDCARD_LABELS: Record<string, string> = { double: '×2 Double', insurance: 'Assurance', last_minute: 'Dernière Minute' }
  const WILDCARD_COLORS: Record<string, string> = {
    double:      'bg-purple-900/40 border-purple-500/40 text-purple-300',
    insurance:   'bg-blue-900/40 border-blue-500/40 text-blue-300',
    last_minute: 'bg-orange-900/40 border-orange-500/40 text-orange-300',
  }

  const STATS = [
    { label: 'Points totaux', value: dbUser.total_points.toLocaleString('fr-FR'), sub: 'pts',   color: 'text-amber-400', Icon: Coins        },
    { label: 'Disponibles',   value: available.toLocaleString('fr-FR'),            sub: 'pts',   color: 'text-green-400', Icon: CheckCircle2  },
    { label: 'En attente',    value: dbUser.frozen_points.toLocaleString('fr-FR'), sub: 'gelés', color: 'text-slate-400', Icon: Clock         },
    { label: 'Winrate',       value: `${winrate}%`, sub: `${dbUser.bets_won}/${dbUser.total_bets}`, color: 'text-blue-400', Icon: BarChart2 },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        {dbUser.avatar_url
          ? <img src={dbUser.avatar_url} alt="" className="w-14 h-14 rounded-full ring-2 ring-amber-500/30" />
          : <div className="w-14 h-14 rounded-full bg-slate-700 flex items-center justify-center text-xl font-bold">{dbUser.username[0].toUpperCase()}</div>}
        <div>
          <h1 className="text-2xl font-bold">{dbUser.username}</h1>
          <p className="text-slate-400 text-sm">{dbUser.total_bets} paris · {dbUser.total_combos} combinés · {dbUser.duels_won + dbUser.duels_lost} duels</p>
        </div>
        <div className="ml-auto flex gap-2">
          <a href="/matchs" className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-4 py-2 rounded-xl text-sm transition-colors">Parier</a>
          <a href="/api/auth/logout" className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-sm transition-colors border border-slate-700">Déconnexion</a>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STATS.map(s => (
          <div key={s.label} className="bg-slate-800 border border-slate-700/50 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-xs font-medium">{s.label}</p>
              <s.Icon className="w-4 h-4 text-slate-500" />
            </div>
            <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
            <p className="text-slate-500 text-xs mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Daily claim */}
      <DailyClaimButton alreadyClaimed={!!todayClaim} points={dailyPoints()} />

      {/* Progress bar */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-400">Progression</span>
          <span className="text-slate-400">{progressPct}% vers 50 000 pts</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Wildcards & Boosts */}
      {((wildcards && wildcards.length > 0) || (boosts && boosts.length > 0)) && (
        <div className="grid md:grid-cols-2 gap-4">
          {wildcards && wildcards.length > 0 && (
            <div className={`bg-slate-800 border border-slate-700/50 rounded-2xl p-5${!(boosts && boosts.length > 0) ? ' md:col-span-2' : ''}`}>
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />Wild Cards
              </h2>
              <div className="flex flex-wrap gap-2">
                {wildcards.map((w: any) => (
                  <span key={w.id} className={`border text-xs font-medium px-3 py-1.5 rounded-full ${WILDCARD_COLORS[w.type] ?? 'bg-slate-700 border-slate-600 text-slate-300'}`}>
                    {WILDCARD_LABELS[w.type] ?? w.type}
                  </span>
                ))}
              </div>
            </div>
          )}
          {boosts && boosts.length > 0 && (
            <div className={`bg-slate-800 border border-slate-700/50 rounded-2xl p-5${!(wildcards && wildcards.length > 0) ? ' md:col-span-2' : ''}`}>
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />Boosts
              </h2>
              <div className="flex flex-wrap gap-2">
                {boosts.map((b: any) => (
                  <span key={b.id} className="bg-yellow-900/40 border border-yellow-500/40 text-yellow-300 text-xs font-medium px-3 py-1.5 rounded-full">
                    {b.boost_type === 'x20_exact' ? '×2.0 Score exact' : '×1.5'} · {b.phase}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Achievements */}
      {achievements && achievements.length > 0 && (
        <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />Succès ({achievements.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {achievements.map((ua: any) => (
              <span key={ua.id}
                title={`${ua.achievements.name} — ${ua.achievements.description}`}
                className="bg-slate-700/60 hover:bg-slate-700 border border-slate-600/50 px-3 py-1.5 rounded-full text-xs cursor-help transition-colors">
                {ua.achievements.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Daily progression chart */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-400" />
          Progression Coupe du Monde
        </h2>
        {chartData.length >= 2 ? (
          <PointsLineChart
            series={[{ name: dbUser.username, color: '#F0B429', data: chartData }]}
          />
        ) : (
          <p className="text-center py-6 text-sm" style={{ color: 'var(--muted)' }}>
            Les données de progression apparaîtront dès les premiers matchs résolus.
          </p>
        )}
      </div>

      {/* Paris en cours */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />Paris en cours
          {((pendingBets?.length ?? 0) + (pendingCombos?.length ?? 0)) > 0 && (
            <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
              {(pendingBets?.length ?? 0) + (pendingCombos?.length ?? 0)}
            </span>
          )}
        </h2>

        {(pendingBets?.length || pendingCombos?.length) ? (
          <div className="space-y-2">
            {pendingBets?.map((bet: any) => {
              const match = bet.matches as any
              return (
                <div key={bet.id} className="flex items-center bg-slate-700/40 hover:bg-slate-700/60 rounded-xl px-4 py-3 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{match.home_team} vs {match.away_team}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{BET_TYPE_LABELS[bet.bet_type] ?? bet.bet_type}</p>
                  </div>
                  <div className="text-right shrink-0 mx-3">
                    <p className="text-amber-400 font-semibold text-sm">{bet.stake.toLocaleString('fr-FR')} pts</p>
                    <p className="text-slate-500 text-xs">@ ×{Number(bet.odds_at_bet_time).toFixed(2)}</p>
                  </div>
                  <BetActions betId={bet.id} stake={bet.stake} lockedAt={match.bets_locked_at} />
                </div>
              )
            })}

            {pendingCombos?.map((combo: any) => {
              const legs = (combo.combo_legs ?? []) as any[]
              const matchNames = legs.map((l: any) => `${l.matches.home_team} vs ${l.matches.away_team}`).join(' · ')
              const earliestLockedAt = legs.reduce((min: string, l: any) => {
                return !min || l.matches.bets_locked_at < min ? l.matches.bets_locked_at : min
              }, '')
              return (
                <div key={combo.id} className="flex items-center bg-slate-700/40 hover:bg-slate-700/60 rounded-xl px-4 py-3 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm flex items-center gap-1.5">
                      <span className="bg-purple-900/50 text-purple-300 text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0">
                        COMBINÉ {legs.length}
                      </span>
                      <span className="text-slate-400 text-xs truncate">{matchNames}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0 mx-3">
                    <p className="text-amber-400 font-semibold text-sm">{combo.stake.toLocaleString('fr-FR')} pts</p>
                    <p className="text-slate-500 text-xs">×{Number(combo.total_odds).toFixed(2)} → {combo.potential_win.toLocaleString('fr-FR')} pts</p>
                  </div>
                  <ComboActions comboId={combo.id} earliestLockedAt={earliestLockedAt} />
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-slate-500 mb-3">Aucun pari en cours.</p>
            <a href="/matchs" className="inline-block bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-5 py-2 rounded-xl text-sm transition-colors">
              Voir les matchs
            </a>
          </div>
        )}
      </div>

      {/* Duels en attente */}
      {pendingChallenges && pendingChallenges.length > 0 && (
        <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Swords className="w-4 h-4 text-slate-400" />Duels en attente
            <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
              {pendingChallenges.length}
            </span>
          </h2>
          <div className="space-y-2">
            {pendingChallenges.map((ch: any) => {
              const isChallenger = ch.challenger_id === dbUser.id
              const other = isChallenger ? ch.opponent : ch.challenger
              const expiresIn = Math.max(0, Math.round((new Date(ch.expires_at).getTime() - Date.now()) / 60000))
              return (
                <div key={ch.id} className="flex items-center bg-slate-700/40 hover:bg-slate-700/60 rounded-xl px-4 py-3 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm flex items-center gap-1.5">
                      {isChallenger ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-600 text-slate-300 shrink-0">ENVOYÉ</span>
                      ) : (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-300 shrink-0 animate-pulse">REÇU</span>
                      )}
                      <span className="truncate">{isChallenger ? `vs ${other?.username}` : `de ${other?.username}`}</span>
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {ch.stake.toLocaleString('fr-FR')} pts · expire dans {expiresIn} min
                    </p>
                  </div>
                  <ChallengeActions challengeId={ch.id} isChallenger={isChallenger} />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
