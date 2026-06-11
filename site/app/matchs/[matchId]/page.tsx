import { createClient, createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import BetForm from './BetForm'
import { Lock } from 'lucide-react'
import { getFlagUrl } from '@/lib/flags'

const PHASE_LABEL: Record<string, string> = {
  group: 'Phase de groupes', round_of_16: '8e de finale',
  quarter: 'Quart de finale', semi: 'Demi-finale', final: 'Finale',
}

export default async function MatchPage({ params }: { params: { matchId: string } }) {
  const supabase = await createClient()

  const [{ data: match }, { data: { user: authUser } }] = await Promise.all([
    supabase.from('matches').select('*').eq('id', params.matchId).single(),
    supabase.auth.getUser(),
  ])
  if (!match) notFound()

  const locked = match.status !== 'upcoming' || new Date() >= new Date(match.bets_locked_at)

  const [{ data: exactScoreOdds }, { data: matchScorerOdds }] = await Promise.all([
    supabase.from('odds_exact_score').select('*').eq('match_id', match.id).order('odds', { ascending: true }).limit(30),
    supabase.from('odds_scorers').select('*').eq('match_id', match.id).order('odds', { ascending: true }).limit(50),
  ])

  // Fall back to global scorer pool when no match-specific odds are synced yet
  let scorerOdds = matchScorerOdds ?? []
  if (scorerOdds.length === 0) {
    const { data: globalScorers } = await supabase
      .from('odds_scorers')
      .select('id, player_name, team, odds')
      .order('odds', { ascending: true })
      .limit(50)
    scorerOdds = globalScorers ?? []
  }

  let availablePoints = 0
  if (authUser) {
    const service = await createServiceClient()
    const discordId = authUser.user_metadata?.provider_id ?? authUser.user_metadata?.sub
    const { data: dbUser } = await service.from('users').select('total_points, frozen_points').eq('discord_id', discordId).single()
    if (dbUser) availablePoints = dbUser.total_points - dbUser.frozen_points
  }

  const kickoff = new Date(match.kickoff_at).toLocaleString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
  })

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fade-up">

      {/* Match header */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}
      >
        {/* Diagonal texture */}
        <div className="absolute inset-0 bg-stripes pointer-events-none" />

        {/* Gold top bar when open, dim when locked */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background: locked
              ? 'var(--border-2)'
              : 'linear-gradient(90deg, transparent 0%, #F0B429 30%, #FFD060 70%, transparent 100%)',
          }}
        />

        {/* Subtle radial glow behind VS */}
        {!locked && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 60% 80% at 50% 50%, rgba(240,180,41,.04) 0%, transparent 70%)',
            }}
          />
        )}

        <div className="relative px-6 pt-5 pb-6">
          {/* Phase + status row */}
          <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-bold tracking-[.12em] uppercase px-2 py-1 rounded-md"
                style={{ background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--border)' }}
              >
                {PHASE_LABEL[match.phase] ?? match.phase}
              </span>
              {match.phase_multiplier > 1 && (
                <span
                  className="text-[10px] font-bold tracking-wider px-2 py-1 rounded-md"
                  style={{ background: 'rgba(240,180,41,.1)', color: '#F0B429', border: '1px solid rgba(240,180,41,.2)' }}
                >
                  ×{match.phase_multiplier} BONUS
                </span>
              )}
            </div>
            {locked ? (
              <span
                className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(239,68,68,.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,.2)' }}
              >
                <Lock className="w-3 h-3" />PARIS FERMÉS
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(34,197,94,.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,.2)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#22C55E' }} />
                PARIS OUVERTS
              </span>
            )}
          </div>

          {/* Teams */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex flex-col items-start gap-1.5">
              {getFlagUrl(match.home_team, '40x30') && (
                <img src={getFlagUrl(match.home_team, '40x30')!} alt="" width={32} height={24} className="rounded-sm" />
              )}
              <h1
                className="font-display leading-none"
                style={{ fontSize: 'clamp(1.5rem, 5vw, 2.25rem)', color: 'var(--text)', letterSpacing: '.04em' }}
              >
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
              <h1
                className="font-display leading-none text-right"
                style={{ fontSize: 'clamp(1.5rem, 5vw, 2.25rem)', color: 'var(--text)', letterSpacing: '.04em' }}
              >
                {match.away_team.toUpperCase()}
              </h1>
            </div>
          </div>

          <p className="text-[11px] text-center mt-4" style={{ color: 'var(--muted)' }}>{kickoff}</p>

          {/* Finished score */}
          {match.status === 'finished' && match.final_score_home !== null && (
            <div className="mt-5 text-center">
              <p
                className="text-[9px] tracking-[.2em] uppercase mb-2"
                style={{ color: 'var(--muted)' }}
              >
                Score final
              </p>
              <div
                className="font-display"
                style={{ fontSize: 'clamp(3rem, 12vw, 5rem)', color: '#F0B429', letterSpacing: '.08em', lineHeight: 1 }}
              >
                {match.final_score_home} – {match.final_score_away}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bet form or odds-only view */}
      {!locked ? (
        <BetForm
          match={match}
          exactScoreOdds={exactScoreOdds ?? []}
          scorerOdds={scorerOdds ?? []}
          isAuthenticated={!!authUser}
          availablePoints={availablePoints}
        />
      ) : (
        /* Odds reference card when locked */
        (match.odds_home || match.odds_draw || match.odds_away) && (
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
        )
      )}
    </div>
  )
}
