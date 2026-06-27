import { createClient, createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import BetForm from './BetForm'
import BetDistribution from './BetDistribution'
import { Lock } from 'lucide-react'
import { getFlagUrl } from '@/lib/flags'
import LiveRefresh from '@/components/LiveRefresh'

const PHASE_LABEL: Record<string, string> = {
  group: 'Phase de groupes', round_of_32: '32e de finale', round_of_16: '8e de finale',
  quarter: 'Quart de finale', semi: 'Demi-finale', final: 'Finale',
}

const BET_TYPE_LABELS: Record<string, string> = {
  result: 'Résultat', result_combo: 'Résultat+', exact_score: 'Score exact',
  scorer: 'Buteur', btts: 'BTTS', over_under: 'Over/Under',
  red_card: 'Carton rouge', best_half: 'Mi-temps', extra_time: 'Prolong.',
}

function fmtPred(betType: string, b: any, home: string, away: string): string {
  if (betType === 'result' || betType === 'result_combo') {
    if (b.prediction_result === 'home') return home
    if (b.prediction_result === 'away') return away
    return 'Nul'
  }
  if (betType === 'exact_score') return `${b.prediction_score_home}–${b.prediction_score_away}`
  if (betType === 'scorer') return b.prediction_scorer ?? '?'
  if (betType === 'btts') return b.prediction_bool ? 'Les deux marquent' : 'Aucun ou 1'
  if (betType === 'over_under') return b.prediction_bool ? 'Over 2.5' : 'Under 2.5'
  if (betType === 'red_card') return b.prediction_bool ? 'Oui' : 'Non'
  if (betType === 'best_half') {
    if (b.prediction_half === 'home') return `${home} domine`
    if (b.prediction_half === 'away') return `${away} domine`
    return 'Égal'
  }
  if (betType === 'extra_time') return b.prediction_bool ? 'Prolong.' : 'Non'
  return '—'
}

export default async function MatchPage({
  params,
  searchParams,
}: {
  params: { matchId: string }
  searchParams: { tab?: string }
}) {
  const supabase = await createClient()
  const service = await createServiceClient()

  const [{ data: match }, { data: { user: authUser } }] = await Promise.all([
    supabase.from('matches').select('*').eq('id', params.matchId).single(),
    supabase.auth.getUser(),
  ])
  if (!match) notFound()

  const activeTab = searchParams.tab === 'paris' ? 'paris' : 'parier'

  // Always fetch bet count for the tab badge
  const { count: betCount } = await service
    .from('bets')
    .select('id', { count: 'exact', head: true })
    .eq('match_id', match.id)
    .eq('status', 'pending')

  const [{ data: exactScoreOdds }, { data: matchScorerOdds }, { data: betDistRaw }] = await Promise.all([
    supabase.from('odds_exact_score').select('*').eq('match_id', match.id).order('odds', { ascending: true }).limit(30),
    supabase.from('odds_scorers').select('*').eq('match_id', match.id).order('odds', { ascending: true }).limit(50),
    service.from('bets').select('prediction_result, stake').eq('match_id', match.id).not('prediction_result', 'is', null),
  ])

  const betDist = {
    home: { count: 0, stake: 0 },
    draw: { count: 0, stake: 0 },
    away: { count: 0, stake: 0 },
  }
  for (const b of betDistRaw ?? []) {
    const k = b.prediction_result as 'home' | 'draw' | 'away'
    if (k in betDist) { betDist[k].count++; betDist[k].stake += b.stake }
  }
  const betDistTotal = betDist.home.count + betDist.draw.count + betDist.away.count

  let scorerOdds = matchScorerOdds ?? []
  if (scorerOdds.length === 0) {
    const { data: globalScorers } = await supabase
      .from('odds_scorers').select('id, player_name, team, odds').order('odds', { ascending: true }).limit(50)
    scorerOdds = globalScorers ?? []
  }

  let availablePoints = 0
  let userBoosts: { id: string; boost_type: 'x15' | 'x20_exact'; phase: string }[] = []
  let userWildcards: { id: string; type: 'double' | 'insurance' | 'last_minute' }[] = []
  if (authUser) {
    const discordId = authUser.user_metadata?.provider_id ?? authUser.user_metadata?.sub
    const { data: dbUser } = await service.from('users').select('id, total_points, frozen_points').eq('discord_id', discordId).single()
    if (dbUser) {
      availablePoints = dbUser.total_points - dbUser.frozen_points
      const [{ data: boosts }, { data: wildcards }] = await Promise.all([
        service.from('user_boosts').select('id, boost_type, phase').eq('user_id', dbUser.id).eq('phase', match.phase).eq('used', false),
        service.from('user_wildcards').select('id, type').eq('user_id', dbUser.id).eq('used', false),
      ])
      userBoosts = (boosts ?? []) as typeof userBoosts
      userWildcards = (wildcards ?? []) as typeof userWildcards
    }
  }

  const hasLastMinuteWildcard = userWildcards.some(w => w.type === 'last_minute')
  const withinLastMinuteWindow = Date.now() < new Date(match.kickoff_at).getTime() + 10 * 60 * 1000
  const locked = match.status === 'finished' || (
    (match.status !== 'upcoming' || Date.now() >= new Date(match.bets_locked_at).getTime()) &&
    !(hasLastMinuteWildcard && withinLastMinuteWindow)
  )

  // Fetch paris tab data only when needed
  let pendingBets: any[] = []
  let pendingComboLegs: any[] = []

  if (activeTab === 'paris') {
    const [{ data: bets }, { data: rawLegs }] = await Promise.all([
      service.from('bets')
        .select('*, users(id, username, avatar_url)')
        .eq('match_id', match.id)
        .eq('status', 'pending')
        .order('stake', { ascending: false }),
      service.from('combo_legs')
        .select('bet_type, prediction_result, prediction_bool, prediction_half, odds_at_bet_time, combos(id, stake, total_odds, status, legs_count, users!user_id(id, username, avatar_url))')
        .eq('match_id', match.id),
    ])
    pendingBets = bets ?? []
    pendingComboLegs = (rawLegs ?? []).filter((l: any) => l.combos?.status === 'pending')
  }

  const kickoff = new Date(match.kickoff_at).toLocaleString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
  })

  const totalPending = (betCount ?? 0) + pendingComboLegs.length
  // Recompute for badge (always fresh from count query above + combo legs)
  const badgeCount = (betCount ?? 0)

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fade-up">
      {(match.status === 'live' || (match.status === 'upcoming' && betDistTotal > 0)) && (
        <LiveRefresh intervalMs={match.status === 'live' ? 30000 : 60000} />
      )}

      {/* Match header */}
      <div className="relative overflow-hidden rounded-2xl" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
        <div className="absolute inset-0 bg-stripes pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{
          background: locked
            ? 'var(--border-2)'
            : 'linear-gradient(90deg, transparent 0%, #F0B429 30%, #FFD060 70%, transparent 100%)',
        }} />
        {!locked && (
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse 60% 80% at 50% 50%, rgba(240,180,41,.04) 0%, transparent 70%)',
          }} />
        )}

        <div className="relative px-6 pt-5 pb-6">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-[.12em] uppercase px-2 py-1 rounded-md"
                style={{ background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                {PHASE_LABEL[match.phase] ?? match.phase}
              </span>
              {match.phase_multiplier > 1 && (
                <span className="text-[10px] font-bold tracking-wider px-2 py-1 rounded-md"
                  style={{ background: 'rgba(240,180,41,.1)', color: '#F0B429', border: '1px solid rgba(240,180,41,.2)' }}>
                  ×{match.phase_multiplier} BONUS
                </span>
              )}
            </div>
            {locked ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(239,68,68,.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,.2)' }}>
                <Lock className="w-3 h-3" />PARIS FERMÉS
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(34,197,94,.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,.2)' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#22C55E' }} />
                PARIS OUVERTS
              </span>
            )}
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex flex-col items-start gap-1.5">
              {getFlagUrl(match.home_team, '40x30') && (
                <img src={getFlagUrl(match.home_team, '40x30')!} alt="" width={32} height={24} className="rounded-sm" />
              )}
              <h1 className="font-display leading-none"
                style={{ fontSize: 'clamp(1.5rem, 5vw, 2.25rem)', color: 'var(--text)', letterSpacing: '.04em' }}>
                {match.home_team.toUpperCase()}
              </h1>
            </div>
            <div className="flex flex-col items-center gap-1 shrink-0 px-2">
              <span className="font-display text-xs tracking-[.2em]" style={{ color: 'var(--border-2)' }}>VS</span>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {getFlagUrl(match.away_team, '40x30') && (
                <img src={getFlagUrl(match.away_team, '40x30')!} alt="" width={32} height={24} className="rounded-sm" />
              )}
              <h1 className="font-display leading-none text-right"
                style={{ fontSize: 'clamp(1.5rem, 5vw, 2.25rem)', color: 'var(--text)', letterSpacing: '.04em' }}>
                {match.away_team.toUpperCase()}
              </h1>
            </div>
          </div>

          <p className="text-[11px] text-center mt-4" style={{ color: 'var(--muted)' }}>{kickoff}</p>

          {match.status === 'live' ? (
            <div className="mt-5 text-center">
              <div className="inline-flex items-center gap-1.5 mb-3">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#22C55E' }} />
                <p className="text-[9px] tracking-[.2em] uppercase font-bold" style={{ color: '#22C55E' }}>EN DIRECT</p>
              </div>
              {match.final_score_home !== null ? (
                <div className="font-display" style={{ fontSize: 'clamp(3rem, 12vw, 5rem)', color: '#22C55E', letterSpacing: '.08em', lineHeight: 1 }}>
                  {match.final_score_home} – {match.final_score_away}
                </div>
              ) : (
                <div className="font-display" style={{ fontSize: 'clamp(2rem, 8vw, 3.5rem)', color: 'var(--muted)', letterSpacing: '.08em', lineHeight: 1 }}>
                  ? – ?
                </div>
              )}
            </div>
          ) : match.status === 'finished' && match.final_score_home !== null ? (
            <div className="mt-5 text-center">
              <p className="text-[9px] tracking-[.2em] uppercase mb-2" style={{ color: 'var(--muted)' }}>Score final</p>
              <div className="font-display" style={{ fontSize: 'clamp(3rem, 12vw, 5rem)', color: '#F0B429', letterSpacing: '.08em', lineHeight: 1 }}>
                {match.final_score_home} – {match.final_score_away}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex rounded-xl p-1 gap-1" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
        {[
          { key: 'parier', label: match.status === 'finished' ? 'Cotes' : 'Parier' },
          { key: 'paris',  label: `Paris${badgeCount > 0 ? ` (${badgeCount})` : ''}` },
        ].map(t => (
          <a
            key={t.key}
            href={t.key === 'parier' ? `/matchs/${match.id}` : `/matchs/${match.id}?tab=paris`}
            className="flex-1 text-center text-sm font-semibold py-2 rounded-lg transition-colors"
            style={activeTab === t.key
              ? { background: 'var(--bg-3)', color: 'var(--text)' }
              : { color: 'var(--muted)' }}
          >
            {t.label}
          </a>
        ))}
      </div>

      {/* Bet distribution — always visible when there are result bets */}
      {betDistTotal > 0 && (
        <BetDistribution
          home={match.home_team}
          away={match.away_team}
          dist={betDist}
          isLive={match.status === 'live'}
        />
      )}

      {/* Tab content */}
      {activeTab === 'parier' ? (
        !locked ? (
          <BetForm
            match={match}
            exactScoreOdds={exactScoreOdds ?? []}
            scorerOdds={scorerOdds ?? []}
            isAuthenticated={!!authUser}
            availablePoints={availablePoints}
            userBoosts={userBoosts}
            userWildcards={userWildcards}
          />
        ) : (
          (match.odds_home || match.odds_draw || match.odds_away) ? (
            <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold tracking-widest" style={{ color: 'var(--muted)' }}>COTES AU MOMENT DE LA FERMETURE</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { l: '1', label: match.home_team, v: match.odds_home },
                  { l: 'X', label: 'Nul',           v: match.odds_draw },
                  { l: '2', label: match.away_team,  v: match.odds_away },
                ].map(o => o.v && (
                  <div key={o.l} className="text-center p-3 rounded-xl" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
                    <p className="text-xs mb-1 truncate" style={{ color: 'var(--muted)' }}>{o.label}</p>
                    <p className="font-mono font-semibold text-lg" style={{ color: '#F0B429' }}>×{Number(o.v).toFixed(2)}</p>
                    <p className="text-[9px] tracking-wide mt-0.5" style={{ color: 'var(--muted)' }}>{o.l}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null
        )
      ) : (
        /* ── Paris tab ── */
        <div className="space-y-3">

          {/* Simple bets */}
          {pendingBets.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <p className="text-xs font-semibold tracking-widest" style={{ color: 'var(--muted)' }}>
                  PARIS SIMPLES — {pendingBets.length}
                </p>
              </div>
              <div className="divide-y" style={{ '--tw-divide-opacity': 1 } as any}>
                {pendingBets.map((bet: any) => {
                  const user = bet.users as any
                  const potWin = Math.round(Number(bet.odds_at_bet_time) * bet.stake * (match.phase_multiplier ?? 1))
                  return (
                    <div key={bet.id} className="flex items-center gap-3 px-4 py-3" style={{ borderColor: 'var(--border)' }}>
                      {/* Player */}
                      <a href={`/profil/${user.username}`} className="flex items-center gap-2 min-w-0 w-36 shrink-0 hover:opacity-80 transition-opacity">
                        {user.avatar_url
                          ? <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full shrink-0" />
                          : <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                              style={{ background: 'var(--bg-3)', color: 'var(--muted)' }}>
                              {user.username[0].toUpperCase()}
                            </div>
                        }
                        <span className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{user.username}</span>
                      </a>

                      {/* Type + prediction */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
                          {BET_TYPE_LABELS[bet.bet_type] ?? bet.bet_type}
                        </p>
                        <p className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>
                          {fmtPred(bet.bet_type, bet, match.home_team, match.away_team)}
                        </p>
                      </div>

                      {/* Odds / Points */}
                      {bet.stake === 0 ? (
                        <div className="text-right shrink-0">
                          <p className="text-[10px]" style={{ color: 'var(--muted)' }}>Si correct</p>
                          <p className="text-sm font-bold" style={{ color: '#22C55E' }}>+{Number(bet.odds_at_bet_time).toLocaleString('fr-FR')} pts</p>
                        </div>
                      ) : (
                        <>
                          <div className="text-center shrink-0 w-12">
                            <p className="text-[10px]" style={{ color: 'var(--muted)' }}>Cote</p>
                            <p className="font-mono text-sm font-bold" style={{ color: '#F0B429' }}>×{Number(bet.odds_at_bet_time).toFixed(2)}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{bet.stake.toLocaleString('fr-FR')} pts</p>
                            <p className="text-[10px]" style={{ color: '#22C55E' }}>→ {potWin.toLocaleString('fr-FR')}</p>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Combo legs */}
          {pendingComboLegs.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <p className="text-xs font-semibold tracking-widest" style={{ color: 'var(--muted)' }}>
                  SÉLECTIONS EN COMBINÉ — {pendingComboLegs.length}
                </p>
              </div>
              <div className="divide-y">
                {pendingComboLegs.map((leg: any, i: number) => {
                  const combo = leg.combos as any
                  const user = combo?.users as any
                  if (!user) return null
                  return (
                    <div key={i} className="flex items-center gap-3 px-4 py-3" style={{ borderColor: 'var(--border)' }}>
                      {/* Player */}
                      <a href={`/profil/${user.username}`} className="flex items-center gap-2 min-w-0 w-36 shrink-0 hover:opacity-80 transition-opacity">
                        {user.avatar_url
                          ? <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full shrink-0" />
                          : <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                              style={{ background: 'var(--bg-3)', color: 'var(--muted)' }}>
                              {user.username[0].toUpperCase()}
                            </div>
                        }
                        <span className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{user.username}</span>
                      </a>

                      {/* Type + prediction */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(168,85,247,.15)', color: '#C084FC' }}>
                            COMBINÉ {combo.legs_count}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--muted)' }}>{BET_TYPE_LABELS[leg.bet_type] ?? leg.bet_type}</span>
                        </div>
                        <p className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>
                          {fmtPred(leg.bet_type, leg, match.home_team, match.away_team)}
                        </p>
                      </div>

                      {/* Leg odds */}
                      <div className="text-center shrink-0 w-12">
                        <p className="text-[10px]" style={{ color: 'var(--muted)' }}>Cote</p>
                        <p className="font-mono text-sm font-bold" style={{ color: '#F0B429' }}>×{Number(leg.odds_at_bet_time).toFixed(2)}</p>
                      </div>

                      {/* Combo stake */}
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{combo.stake.toLocaleString('fr-FR')} pts</p>
                        <p className="text-[10px]" style={{ color: 'var(--muted)' }}>×{Number(combo.total_odds).toFixed(2)} total</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {pendingBets.length === 0 && pendingComboLegs.length === 0 && (
            <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Aucun pari en cours sur ce match.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
