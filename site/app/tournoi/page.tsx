import { createClient, createServiceClient } from '@/lib/supabase/server'
import TournoiForm from './TournoiForm'

export default async function TournoiPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  // Fetch all distinct teams from matches
  const { data: matches } = await supabase
    .from('matches')
    .select('home_team, away_team')

  const teamsSet = new Set<string>()
  for (const m of matches ?? []) {
    if (m.home_team) teamsSet.add(m.home_team)
    if (m.away_team) teamsSet.add(m.away_team)
  }
  const teams = Array.from(teamsSet).sort()

  // Top scorer candidates for suggestions
  const { data: scorerRows } = await supabase
    .from('odds_scorers')
    .select('player_name, team')
    .order('odds', { ascending: true })
    .limit(100)

  const seenPlayers = new Set<string>()
  const players = (scorerRows ?? []).filter(p => {
    if (seenPlayers.has(p.player_name)) return false
    seenPlayers.add(p.player_name)
    return true
  })

  let existing = { podium: null, boot: null, ball: null } as {
    podium: { first_team: string; second_team: string; third_team: string } | null
    boot:   { player_name: string; team: string } | null
    ball:   { player_name: string; team: string } | null
  }

  if (authUser) {
    const service = await createServiceClient()
    const discordId = authUser.user_metadata?.provider_id ?? authUser.user_metadata?.sub
    const { data: dbUser } = await service.from('users').select('id').eq('discord_id', discordId).single()

    if (dbUser) {
      const [{ data: podium }, { data: awards }] = await Promise.all([
        service.from('tournament_predictions').select('first_team, second_team, third_team').eq('user_id', dbUser.id).maybeSingle(),
        service.from('award_predictions').select('award_type, player_name, team').eq('user_id', dbUser.id),
      ])
      existing.podium = podium
      existing.boot   = awards?.find(a => a.award_type === 'golden_boot') ?? null
      existing.ball   = awards?.find(a => a.award_type === 'golden_ball') ?? null
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">
      <div>
        <h1
          className="font-display text-4xl mb-2"
          style={{ color: 'var(--text)', letterSpacing: '.06em' }}
        >
          PRÉDICTIONS
        </h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Podium final et lauréats individuels — verrouillé au coup d'envoi du 1er match.
        </p>
      </div>

      <TournoiForm
        teams={teams}
        players={players}
        existing={existing}
        isAuthenticated={!!authUser}
      />
    </div>
  )
}
