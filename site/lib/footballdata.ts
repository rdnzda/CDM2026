// Wrapper football-data.org v4
// Free tier : 10 req/min, pas de limite mensuelle, couvre la CDM 2026
// Inscription : https://www.football-data.org/client/register

const BASE_URL   = 'https://api.football-data.org/v4'
const API_KEY    = process.env.FOOTBALL_DATA_API_KEY!
const COMPETITION = process.env.FOOTBALL_DATA_COMPETITION || 'WC'

const fetchFD = (path: string) =>
  fetch(`${BASE_URL}${path}`, {
    headers: { 'X-Auth-Token': API_KEY },
    next: { revalidate: 300 },
  }).then(r => r.json())

export const footballData = {
  // Tous les matchs du tournoi (1 seule requête)
  getAllMatches: () =>
    fetchFD(`/competitions/${COMPETITION}/matches`),

  // Matchs par statut : SCHEDULED | LIVE | IN_PLAY | PAUSED | FINISHED
  getMatchesByStatus: (status: string) =>
    fetchFD(`/competitions/${COMPETITION}/matches?status=${status}`),

  // Détail d'un match (inclut buts + cartons)
  getMatch: (matchId: number) =>
    fetchFD(`/matches/${matchId}`),

  // Top buteurs
  getTopScorers: () =>
    fetchFD(`/competitions/${COMPETITION}/scorers`),
}

// Mapping match football-data.org → format DB
export function mapMatch(m: any) {
  return {
    footballdata_match_id: m.id,
    home_team:             m.homeTeam.name,
    away_team:             m.awayTeam.name,
    home_team_id:          m.homeTeam.id,
    away_team_id:          m.awayTeam.id,
    kickoff_at:            m.utcDate,
    bets_locked_at:        m.utcDate,
    phase:                 detectPhase(m.stage),
    phase_multiplier:      PHASE_MULTIPLIERS[detectPhase(m.stage)],
    status:                mapStatus(m.status),
    final_score_home:      m.score?.fullTime?.home ?? null,
    final_score_away:      m.score?.fullTime?.away ?? null,
    result:                m.score?.fullTime?.home != null
                             ? getResult(m.score.fullTime.home, m.score.fullTime.away)
                             : null,
  }
}

// Extraction buteurs depuis match.goals[]
export function extractScorers(goals: any[]): string[] {
  return (goals || [])
    .filter(g => g.type !== 'OWN')
    .map(g => g.scorer?.name)
    .filter(Boolean)
}

// Extraction résultats spéciaux depuis match.goals[] + match.bookings[]
export function extractSpecialResults(
  goals: any[],
  bookings: any[],
  homeTeamId: number,
  homeScore: number,
  awayScore: number,
  halfTimeHome: number,
  halfTimeAway: number,
) {
  const redCards = (bookings || []).filter(b => b.card === 'RED_CARD' || b.card === 'YELLOW_RED_CARD')
  const shHome   = homeScore - halfTimeHome
  const shAway   = awayScore - halfTimeAway

  return {
    result_btts:      homeScore > 0 && awayScore > 0,
    result_over25:    (homeScore + awayScore) > 2.5,
    result_red_card:  redCards.length > 0,
    result_best_half: halfTimeHome + halfTimeAway > shHome + shAway ? 'home'
                    : halfTimeHome + halfTimeAway < shHome + shAway ? 'away'
                    : 'equal',
  }
}

// Matching match football-data.org ↔ event The Odds API (par équipe + date)
export function matchOddsEvent(match: any, oddsEvents: any[]): any | null {
  const kickoff = new Date(match.utcDate)
  return oddsEvents.find(e => {
    const oddsDate  = new Date(e.commence_time)
    const sameDay   = Math.abs(kickoff.getTime() - oddsDate.getTime()) < 24 * 3600 * 1000
    const homeFirst = match.homeTeam.name.toLowerCase().split(' ')[0]
    const homeMatch = e.home_team.toLowerCase().includes(homeFirst)
                   || match.homeTeam.name.toLowerCase().includes(e.home_team.toLowerCase().split(' ')[0])
    return sameDay && homeMatch
  }) ?? null
}

const PHASE_MULTIPLIERS: Record<string, number> = {
  group: 1.0, round_of_16: 1.5, quarter: 2.0, semi: 2.5, final: 3.0,
}

function detectPhase(stage: string): string {
  if (!stage) return 'group'
  const s = stage.toUpperCase()
  if (s === 'FINAL')                return 'final'
  if (s === 'SEMI_FINALS')          return 'semi'
  if (s === 'THIRD_PLACE')          return 'semi'
  if (s === 'QUARTER_FINALS')       return 'quarter'
  if (s === 'ROUND_OF_16')          return 'round_of_16'
  return 'group'
}

function mapStatus(status: string): string {
  if (['FINISHED', 'AWARDED'].includes(status))          return 'finished'
  if (['IN_PLAY', 'PAUSED', 'LIVE'].includes(status))    return 'live'
  return 'upcoming'
}

function getResult(home: number, away: number): 'home' | 'draw' | 'away' {
  if (home > away) return 'home'
  if (home < away) return 'away'
  return 'draw'
}
