import { createClient, createServiceClient } from '@/lib/supabase/server'
import ComboBuilder from './ComboBuilder'

export default async function CombosPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  const { data: matches } = await supabase
    .from('matches')
    .select('id, home_team, away_team, kickoff_at, phase, phase_multiplier, odds_home, odds_draw, odds_away, odds_btts_yes, odds_btts_no, odds_over25, odds_under25, bets_locked_at, status')
    .eq('status', 'upcoming')
    .gte('bets_locked_at', new Date().toISOString())
    .order('kickoff_at', { ascending: true })

  let availablePoints = 0
  let pendingCombos: any[] = []

  if (authUser) {
    const service = await createServiceClient()
    const discordId = authUser.user_metadata?.provider_id ?? authUser.user_metadata?.sub
    const { data: dbUser } = await service.from('users').select('id, total_points, frozen_points').eq('discord_id', discordId).single()

    if (dbUser) {
      availablePoints = dbUser.total_points - dbUser.frozen_points
      const { data } = await service
        .from('combos')
        .select('*, combo_legs(*, matches(home_team, away_team))')
        .eq('user_id', dbUser.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5)
      pendingCombos = data ?? []
    }
  }

  return (
    <div className="space-y-8 animate-fade-up">

      {/* Page header */}
      <div>
        <h1
          className="font-display text-4xl mb-2"
          style={{ color: 'var(--text)', letterSpacing: '.06em' }}
        >
          COMBINÉS
        </h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          2 à 10 sélections sur des matchs différents. Mise max 1 000 pts.
        </p>
      </div>

      {/* Pending combos */}
      {pendingCombos.length > 0 && (
        <section className="delay-1 animate-fade-up">
          <div className="flex items-baseline justify-between mb-4">
            <h2
              className="font-display text-2xl"
              style={{ color: 'var(--text)', letterSpacing: '.06em' }}
            >
              EN COURS
            </h2>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              {pendingCombos.length} combiné{pendingCombos.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-3">
            {pendingCombos.map((combo: any) => (
              <div
                key={combo.id}
                className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}
              >
                {/* Summary row */}
                <div
                  className="flex items-center justify-between px-5 py-3.5 flex-wrap gap-3"
                  style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-3)' }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-md"
                      style={{ background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--border)' }}
                    >
                      {combo.legs_count} sél.
                    </span>
                    <span
                      className="font-mono font-bold text-base"
                      style={{ color: '#F0B429' }}
                    >
                      ×{Number(combo.total_odds).toFixed(2)}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--muted)' }}>
                      Mise : {combo.stake.toLocaleString('fr-FR')} pts
                    </span>
                  </div>
                  <div className="text-right">
                    <span
                      className="font-display text-xl"
                      style={{ color: '#22C55E', letterSpacing: '.04em' }}
                    >
                      +{combo.potential_win.toLocaleString('fr-FR')}
                    </span>
                    <span
                      className="text-[9px] tracking-widest ml-1.5 uppercase"
                      style={{ color: 'var(--muted)' }}
                    >
                      pts pot.
                    </span>
                  </div>
                </div>

                {/* Legs */}
                <div className="px-5 py-3 space-y-1">
                  {combo.combo_legs?.map((leg: any) => (
                    <div
                      key={leg.id}
                      className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                    >
                      <span style={{ color: 'var(--muted)' }}>
                        {leg.matches?.home_team} vs {leg.matches?.away_team}
                        <span className="mx-1.5 opacity-40">·</span>
                        {leg.bet_type}
                      </span>
                      <span className="font-mono font-semibold" style={{ color: '#F0B429' }}>
                        ×{Number(leg.odds_at_bet_time).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Builder */}
      <section className="delay-2 animate-fade-up">
        <div className="flex items-baseline gap-3 mb-4">
          <h2
            className="font-display text-2xl"
            style={{ color: 'var(--text)', letterSpacing: '.06em' }}
          >
            CRÉER
          </h2>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>
            {matches?.length ?? 0} matchs disponibles
          </span>
        </div>
        <ComboBuilder
          matches={matches ?? []}
          availablePoints={availablePoints}
          isAuthenticated={!!authUser}
        />
      </section>

    </div>
  )
}
