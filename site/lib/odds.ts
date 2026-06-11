const ODDS_BASE = 'https://api.the-odds-api.com/v4'
const API_KEY   = process.env.ODDS_API_KEY!
const SPORT     = process.env.ODDS_SPORT || 'soccer_fifa_world_cup'

export const oddsApi = {
  getUpcomingOdds: () =>
    fetch(`${ODDS_BASE}/sports/${SPORT}/odds?apiKey=${API_KEY}&regions=eu&markets=h2h,btts,totals&oddsFormat=decimal`, { next: { revalidate: 3600 } })
      .then(r => r.json()),

  getMatchOdds: (eventId: string, markets = 'h2h,btts,totals') =>
    fetch(`${ODDS_BASE}/sports/${SPORT}/events/${eventId}/odds?apiKey=${API_KEY}&regions=eu&markets=${markets}&oddsFormat=decimal`, { next: { revalidate: 3600 } })
      .then(r => r.json()),

  getExactScoreOdds: (eventId: string) =>
    fetch(`${ODDS_BASE}/sports/${SPORT}/events/${eventId}/odds?apiKey=${API_KEY}&regions=eu&markets=alternate_totals,scores&oddsFormat=decimal`, { next: { revalidate: 3600 } })
      .then(r => r.json()),

  getScorerOdds: (eventId: string) =>
    fetch(`${ODDS_BASE}/sports/${SPORT}/events/${eventId}/odds?apiKey=${API_KEY}&regions=eu&markets=player_goal_scorer&oddsFormat=decimal`, { next: { revalidate: 3600 } })
      .then(r => r.json()),
}

export function mapOddsToMatch(oddsEvent: any) {
  const bookmaker = oddsEvent.bookmakers?.[0]
  if (!bookmaker) return {}

  const h2h    = bookmaker.markets?.find((m: any) => m.key === 'h2h')
  const btts   = bookmaker.markets?.find((m: any) => m.key === 'btts')
  const totals = bookmaker.markets?.find((m: any) => m.key === 'totals')

  return {
    odds_api_event_id: oddsEvent.id,
    odds_home:         h2h?.outcomes?.find((o: any) => o.name === oddsEvent.home_team)?.price ?? null,
    odds_draw:         h2h?.outcomes?.find((o: any) => o.name === 'Draw')?.price ?? null,
    odds_away:         h2h?.outcomes?.find((o: any) => o.name === oddsEvent.away_team)?.price ?? null,
    odds_btts_yes:     btts?.outcomes?.find((o: any) => o.name === 'Yes')?.price ?? null,
    odds_btts_no:      btts?.outcomes?.find((o: any) => o.name === 'No')?.price ?? null,
    odds_over25:       totals?.outcomes?.find((o: any) => o.name === 'Over' && o.point === 2.5)?.price ?? null,
    odds_under25:      totals?.outcomes?.find((o: any) => o.name === 'Under' && o.point === 2.5)?.price ?? null,
  }
}

export function matchEvents(sofascoreEvent: any, oddsEvents: any[]): any | null {
  const kickoff = new Date(sofascoreEvent.startTimestamp * 1000)
  return oddsEvents.find(e => {
    const oddsDate  = new Date(e.commence_time)
    const sameDay   = Math.abs(kickoff.getTime() - oddsDate.getTime()) < 24 * 3600 * 1000
    const homeMatch = e.home_team.toLowerCase().includes(sofascoreEvent.homeTeam?.name?.toLowerCase()?.split(' ')[0])
                   || sofascoreEvent.homeTeam?.name?.toLowerCase().includes(e.home_team.toLowerCase().split(' ')[0])
    return sameDay && homeMatch
  }) ?? null
}
