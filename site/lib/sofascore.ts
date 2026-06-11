const BASE_URL = 'https://sofascore.p.rapidapi.com'
const HEADERS = {
  'X-RapidAPI-Key':  process.env.RAPIDAPI_KEY!,
  'X-RapidAPI-Host': 'sofascore.p.rapidapi.com',
}

const fetchSofascore = (path: string) =>
  fetch(`${BASE_URL}${path}`, { headers: HEADERS, next: { revalidate: 300 } }).then(r => r.json())

export const sofascore = {
  getSeasons: (tournamentId: number) =>
    fetchSofascore(`/api/v1/unique-tournament/${tournamentId}/seasons`),

  getUpcomingMatches: (tournamentId: number, seasonId: number, page = 0) =>
    fetchSofascore(`/api/v1/unique-tournament/${tournamentId}/season/${seasonId}/events/next/${page}`),

  getLastMatches: (tournamentId: number, seasonId: number, page = 0) =>
    fetchSofascore(`/api/v1/unique-tournament/${tournamentId}/season/${seasonId}/events/last/${page}`),

  getMatch: (eventId: number) =>
    fetchSofascore(`/api/v1/event/${eventId}`),

  getIncidents: (eventId: number) =>
    fetchSofascore(`/api/v1/event/${eventId}/incidents`),

  getMatchStats: (eventId: number) =>
    fetchSofascore(`/api/v1/event/${eventId}/statistics`),

  getTopScorers: (tournamentId: number, seasonId: number) =>
    fetchSofascore(`/api/v1/unique-tournament/${tournamentId}/season/${seasonId}/top-players/goals`),

  getTopRatedPlayers: (tournamentId: number, seasonId: number) =>
    fetchSofascore(`/api/v1/unique-tournament/${tournamentId}/season/${seasonId}/top-players/rating`),

  getTeamPlayers: (teamId: number) =>
    fetchSofascore(`/api/v1/team/${teamId}/players`),
}

export function mapSofascoreEvent(event: any) {
  const statusType = event.status?.type
  return {
    sofascore_event_id: event.id,
    home_team:          event.homeTeam?.name,
    away_team:          event.awayTeam?.name,
    home_team_id:       event.homeTeam?.id,
    away_team_id:       event.awayTeam?.id,
    kickoff_at:         new Date(event.startTimestamp * 1000).toISOString(),
    bets_locked_at:     new Date(event.startTimestamp * 1000).toISOString(),
    status:             statusType === 'finished'   ? 'finished'
                      : statusType === 'inprogress' ? 'live'
                      : 'upcoming',
    final_score_home:   event.homeScore?.current ?? null,
    final_score_away:   event.awayScore?.current ?? null,
    result:             event.homeScore?.current != null
                          ? getResult(event.homeScore.current, event.awayScore.current)
                          : null,
  }
}

export function extractScorers(incidents: any[]): string[] {
  return incidents
    .filter(i => i.incidentType === 'goal' && i.incidentClass !== 'ownGoal')
    .map(i => i.player?.name)
    .filter(Boolean)
}

export function extractSpecialResults(incidents: any[], homeScore: number, awayScore: number) {
  const goals    = incidents.filter(i => i.incidentType === 'goal')
  const redCards = incidents.filter(i => i.incidentType === 'card' && i.incidentClass === 'red')
  const htHome   = goals.filter(i => i.time <= 45 && i.isHome).length
  const htAway   = goals.filter(i => i.time <= 45 && !i.isHome).length
  const shHome   = goals.filter(i => i.time > 45 && i.isHome).length
  const shAway   = goals.filter(i => i.time > 45 && !i.isHome).length

  return {
    result_btts:      homeScore > 0 && awayScore > 0,
    result_over25:    (homeScore + awayScore) > 2.5,
    result_red_card:  redCards.length > 0,
    result_best_half: htHome + htAway > shHome + shAway ? 'home'
                    : htHome + htAway < shHome + shAway ? 'away'
                    : 'equal',
  }
}

function getResult(home: number, away: number): 'home' | 'draw' | 'away' {
  if (home > away) return 'home'
  if (home < away) return 'away'
  return 'draw'
}
