// Wrapper API-Football (v3.football.api-sports.io)
// Free tier : 100 req/jour
// Inscription : https://dashboard.api-football.com/register

const BASE_URL = 'https://v3.football.api-sports.io'
const API_KEY  = process.env.API_FOOTBALL_KEY!
const LEAGUE   = process.env.API_FOOTBALL_LEAGUE_ID || '1'   // 1 = FIFA World Cup
const SEASON   = process.env.API_FOOTBALL_SEASON || '2026'

const fetchAF = (path: string) =>
  fetch(`${BASE_URL}${path}`, {
    headers: { 'x-apisports-key': API_KEY },
    next: { revalidate: 300 },
  }).then(r => r.json())

export const apifootball = {
  // Prochains matchs (status=NS)
  getUpcomingFixtures: () =>
    fetchAF(`/fixtures?league=${LEAGUE}&season=${SEASON}&status=NS&next=50`),

  // Matchs en cours
  getLiveFixtures: () =>
    fetchAF(`/fixtures?league=${LEAGUE}&season=${SEASON}&live=all`),

  // Matchs terminés
  getFinishedFixtures: () =>
    fetchAF(`/fixtures?league=${LEAGUE}&season=${SEASON}&status=FT`),

  // Détail d'un match
  getFixture: (fixtureId: number) =>
    fetchAF(`/fixtures?id=${fixtureId}`),

  // Événements d'un match (buts, cartons, remplacements)
  getEvents: (fixtureId: number) =>
    fetchAF(`/fixtures/events?fixture=${fixtureId}`),

  // Statistiques d'un match
  getStatistics: (fixtureId: number) =>
    fetchAF(`/fixtures/statistics?fixture=${fixtureId}`),

  // Top buteurs du tournoi
  getTopScorers: () =>
    fetchAF(`/players/topscorers?league=${LEAGUE}&season=${SEASON}`),

  // Joueurs d'une équipe
  getSquad: (teamId: number) =>
    fetchAF(`/players/squads?team=${teamId}`),
}

// Mapping fixture API-Football → format DB
export function mapFixture(fix: any) {
  const status = fix.fixture.status.short
  return {
    apifootball_fixture_id: fix.fixture.id,
    home_team:              fix.teams.home.name,
    away_team:              fix.teams.away.name,
    home_team_id:           fix.teams.home.id,
    away_team_id:           fix.teams.away.id,
    kickoff_at:             fix.fixture.date,
    bets_locked_at:         fix.fixture.date,
    status:                 status === 'FT' || status === 'AET' || status === 'PEN' ? 'finished'
                          : ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE'].includes(status)  ? 'live'
                          : 'upcoming',
    final_score_home:       fix.goals.home ?? null,
    final_score_away:       fix.goals.away ?? null,
    result:                 fix.goals.home != null ? getResult(fix.goals.home, fix.goals.away) : null,
    phase:                  detectPhase(fix.league.round),
    phase_multiplier:       PHASE_MULTIPLIERS[detectPhase(fix.league.round)],
  }
}

// Mapping événements → buteurs (hors CSC)
export function extractScorers(events: any[]): string[] {
  return events
    .filter(e => e.type === 'Goal' && e.detail !== 'Own Goal')
    .map(e => e.player.name)
    .filter(Boolean)
}

// Mapping événements → résultats spéciaux
export function extractSpecialResults(events: any[], homeId: number, homeScore: number, awayScore: number) {
  const goals    = events.filter(e => e.type === 'Goal' && e.detail !== 'Own Goal')
  const redCards = events.filter(e => e.type === 'Card' && e.detail === 'Red Card')
  const htHome   = goals.filter(e => e.time.elapsed <= 45 && e.team.id === homeId).length
  const htAway   = goals.filter(e => e.time.elapsed <= 45 && e.team.id !== homeId).length
  const shHome   = goals.filter(e => e.time.elapsed > 45  && e.team.id === homeId).length
  const shAway   = goals.filter(e => e.time.elapsed > 45  && e.team.id !== homeId).length

  return {
    result_btts:      homeScore > 0 && awayScore > 0,
    result_over25:    (homeScore + awayScore) > 2.5,
    result_red_card:  redCards.length > 0,
    result_best_half: htHome + htAway > shHome + shAway ? 'home'
                    : htHome + htAway < shHome + shAway ? 'away'
                    : 'equal',
  }
}

const PHASE_MULTIPLIERS: Record<string, number> = {
  group: 1.0, round_of_16: 1.5, quarter: 2.0, semi: 2.5, final: 3.0,
}

function detectPhase(round: string): string {
  if (!round) return 'group'
  const r = round.toLowerCase()
  if (r.includes('quarter')) return 'quarter'
  if (r.includes('semi'))    return 'semi'
  if (r.includes('final'))   return 'final'
  if (r.includes('16') || r.includes('round of 16')) return 'round_of_16'
  return 'group'
}

function getResult(home: number, away: number): 'home' | 'draw' | 'away' {
  if (home > away) return 'home'
  if (home < away) return 'away'
  return 'draw'
}

// Matching fixture API-Football ↔ event The Odds API (par équipe + date)
export function matchOddsEvent(fixture: any, oddsEvents: any[]): any | null {
  const kickoff = new Date(fixture.fixture.date)
  return oddsEvents.find(e => {
    const oddsDate  = new Date(e.commence_time)
    const sameDay   = Math.abs(kickoff.getTime() - oddsDate.getTime()) < 24 * 3600 * 1000
    const homeFirst = fixture.teams.home.name.toLowerCase().split(' ')[0]
    const homeMatch = e.home_team.toLowerCase().includes(homeFirst)
                   || fixture.teams.home.name.toLowerCase().includes(e.home_team.toLowerCase().split(' ')[0])
    return sameDay && homeMatch
  }) ?? null
}
