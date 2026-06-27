import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const FD_KEY         = Deno.env.get('FOOTBALL_DATA_API_KEY')!
const FD_COMPETITION = Deno.env.get('FOOTBALL_DATA_COMPETITION') || 'WC'
const ODDS_KEY       = Deno.env.get('ODDS_API_KEY')
const ODDS_SPORT     = Deno.env.get('ODDS_SPORT') || 'soccer_fifa_world_cup'

const PHASE_MULTIPLIERS: Record<string, number> = {
  group: 1.0, round_of_32: 1.25, round_of_16: 1.5, quarter: 2.0, semi: 2.5, final: 3.0,
}

// FIFA World Rankings points (June 2026)
const FIFA_RATINGS: Record<string, number> = {
  'france': 1877,
  'spain': 1876,
  'argentina': 1875,
  'england': 1826,
  'portugal': 1764,
  'brazil': 1761,
  'netherlands': 1758,
  'morocco': 1756,
  'belgium': 1735,
  'germany': 1730,
  'croatia': 1717,
  'colombia': 1693,
  'senegal': 1689,
  'mexico': 1681,
  'united states': 1673,
  'usa': 1673,
  'uruguay': 1673,
  'japan': 1660,
  'switzerland': 1649,
  'iran': 1615,
  'ir iran': 1615,
  'turkey': 1599,
  'ecuador': 1595,
  'austria': 1593,
  'south korea': 1589,
  'korea republic': 1589,
  'republic of korea': 1589,
  'australia': 1581,
  'algeria': 1564,
  'egypt': 1563,
  'canada': 1556,
  'norway': 1551,
  'panama': 1541,
  'ivory coast': 1533,
  "côte d'ivoire": 1533,
  "cote d'ivoire": 1533,
  'sweden': 1515,
  'paraguay': 1504,
  'czechia': 1501,
  'czech republic': 1501,
  'scotland': 1498,
  'tunisia': 1483,
  'dr congo': 1478,
  'democratic republic of congo': 1478,
  'congo dr': 1478,
  'uzbekistan': 1465,
  'qatar': 1420,
  'iraq': 1410,
  'south africa': 1395,
  'saudi arabia': 1390,
  'jordan': 1380,
  'bosnia and herzegovina': 1370,
  'bosnia & herzegovina': 1370,
  'bosnia-herzegovina': 1370,
  'cape verde': 1350,
  'cabo verde': 1350,
  'ghana': 1330,
  'curaçao': 1290,
  'curacao': 1290,
  'haiti': 1285,
  'new zealand': 1275,
}

function getTeamRating(name: string | null | undefined): number {
  if (!name) return 1500 // unknown team = average
  const key = name.toLowerCase().trim()
  return FIFA_RATINGS[key] ?? 1400
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function calcEloOdds(ratingHome: number, ratingAway: number, isKnockout = false): {
  home: number, draw: number, away: number,
  btts_yes: number, btts_no: number,
  over25: number, under25: number,
  red_card_yes: number, red_card_no: number,
  et_yes: number, et_no: number,
} {
  // Elo win probability (scale factor 600 for football)
  const pHome = 1 / (1 + Math.pow(10, (ratingAway - ratingHome) / 600))

  // Draw probability — higher when teams are evenly matched
  const evenness = 1 - Math.abs(pHome - 0.5) * 2
  const drawProb = 0.22 + evenness * 0.08 // 0.22 to 0.30

  const homeProb = Math.max(0.05, pHome - drawProb / 2)
  const awayProb = Math.max(0.05, 1 - pHome - drawProb / 2)
  const margin   = 0.93 // 7% bookmaker margin

  // Over/Under 2.5 — based on combined attack potential
  const avgRating  = (ratingHome + ratingAway) / 2
  const ratingDiff = Math.abs(ratingHome - ratingAway)
  // Stronger teams + bigger gap = more lopsided = often more goals
  const overBase  = 0.50 + (avgRating - 1500) / 3000 + ratingDiff / 4000
  const overProb  = Math.min(0.62, Math.max(0.38, overBase))
  const underProb = 1 - overProb

  // BTTS — both teams score; lower when one team is much stronger
  const bttsBase  = 0.46 - ratingDiff / 5000
  const bttsProb  = Math.min(0.55, Math.max(0.25, bttsBase))
  const bttNoProb = 1 - bttsProb

  // Red card — roughly 30% of matches have at least one red card
  const redProb   = 0.30
  const noRedProb = 0.70

  // Extra time — group stage: near impossible (no ET in group), knockout: ~25%
  const etProb    = isKnockout ? (evenness * 0.25) : 0.02
  const noEtProb  = 1 - etProb

  return {
    home:         round2(1 / (homeProb  * margin)),
    draw:         round2(1 / (drawProb  * margin)),
    away:         round2(1 / (awayProb  * margin)),
    btts_yes:     round2(1 / (bttsProb  * margin)),
    btts_no:      round2(1 / (bttNoProb * margin)),
    over25:       round2(1 / (overProb  * margin)),
    under25:      round2(1 / (underProb * margin)),
    red_card_yes: round2(1 / (redProb   * margin)),
    red_card_no:  round2(1 / (noRedProb * margin)),
    et_yes:       round2(1 / (etProb    * margin)),
    et_no:        round2(1 / (noEtProb  * margin)),
  }
}

// Team name aliases for The Odds API matching
const TEAM_ALIASES: Record<string, string> = {
  'united states':   'usa',
  'korea republic':  'south korea',
  'republic of korea': 'south korea',
  'ir iran':         'iran',
  "côte d'ivoire":   'ivory coast',
  "cote d'ivoire":   'ivory coast',
  'north macedonia': 'macedonia',
  'czech republic':  'czechia',
  'cape verde':      'cabo verde',
}

function normalizeTeam(name: string | null | undefined): string {
  if (!name) return ''
  const lower = name.toLowerCase().trim()
  return TEAM_ALIASES[lower] ?? lower
}

function teamsMatch(fdName: string, oddsName: string): boolean {
  const fd   = normalizeTeam(fdName)
  const odds = normalizeTeam(oddsName)
  if (fd === odds) return true
  if (fd.includes(odds) || odds.includes(fd)) return true
  const fdFirst   = fd.split(' ')[0]
  const oddsFirst = odds.split(' ')[0]
  if (fdFirst.length > 3 && (fd.includes(oddsFirst) || odds.includes(fdFirst))) return true
  return false
}

function detectPhase(stage: string): string {
  const s = (stage || '').toUpperCase()
  if (s === 'FINAL')                    return 'final'
  if (s === 'SEMI_FINALS')              return 'semi'
  if (s === 'THIRD_PLACE')              return 'semi'
  if (s === 'QUARTER_FINALS')           return 'quarter'
  if (s === 'ROUND_OF_16')              return 'round_of_16'
  if (s === 'ROUND_OF_32' || s === 'LAST_32') return 'round_of_32'
  return 'group'
}

function mapStatus(status: string, kickoffUtc: string): string {
  if (['FINISHED', 'AWARDED'].includes(status))       return 'finished'
  if (['IN_PLAY', 'PAUSED', 'LIVE'].includes(status)) return 'live'
  // Free-tier workaround: football-data.org stays TIMED during live play
  const elapsedMin = (Date.now() - new Date(kickoffUtc).getTime()) / 60000
  if (elapsedMin >= 0 && elapsedMin < 115) return 'live'
  return 'upcoming'
}

function getResult(home: number, away: number): 'home' | 'draw' | 'away' {
  if (home > away) return 'home'
  if (home < away) return 'away'
  return 'draw'
}

function matchOddsEvent(match: any, oddsEvents: any[]): any | null {
  const kickoff = new Date(match.utcDate)
  return oddsEvents.find(e => {
    const oddsDate = new Date(e.commence_time)
    const sameDay  = Math.abs(kickoff.getTime() - oddsDate.getTime()) < 24 * 3600 * 1000
    return sameDay && teamsMatch(match.homeTeam.name, e.home_team)
  }) ?? null
}

Deno.serve(async () => {
  try {
    // Fetch all CDM fixtures
    const fdRes = await fetch(`https://api.football-data.org/v4/competitions/${FD_COMPETITION}/matches`, {
      headers: { 'X-Auth-Token': FD_KEY },
    })
    const fdData = await fdRes.json()
    const matches: any[] = fdData.matches || []

    if (!matches.length) {
      return new Response(JSON.stringify({ error: 'No matches from football-data.org', raw: fdData }), { status: 200 })
    }

    // Try to fetch real odds (optional — Elo fallback always available)
    let oddsEvents: any[] = []
    if (ODDS_KEY) {
      const oddsRes = await fetch(
        `https://api.the-odds-api.com/v4/sports/${ODDS_SPORT}/odds?apiKey=${ODDS_KEY}&regions=eu&markets=h2h,btts,totals&oddsFormat=decimal`
      )
      const oddsRaw = await oddsRes.json().catch(() => [])
      if (Array.isArray(oddsRaw)) oddsEvents = oddsRaw
    }

    let synced = 0
    let oddsFromApi = 0
    let oddsFromElo = 0

    for (const m of matches) {
      const phase      = detectPhase(m.stage)
      const status     = mapStatus(m.status, m.utcDate)
      const isKnockout = phase !== 'group'

      // football-data.org returns "GROUP_A", "GROUP_B", etc. — keep just the letter
      const groupName = m.group ? m.group.replace(/^GROUP_/, '') : null

      const matchData: any = {
        footballdata_match_id: m.id,
        home_team:             m.homeTeam.name,
        away_team:             m.awayTeam.name,
        home_team_id:          m.homeTeam.id,
        away_team_id:          m.awayTeam.id,
        kickoff_at:            m.utcDate,
        bets_locked_at:        m.utcDate,
        phase,
        phase_multiplier:      PHASE_MULTIPLIERS[phase],
        group_name:            groupName,
        status,
      }

      if (m.score?.fullTime?.home != null) {
        matchData.final_score_home = m.score.fullTime.home
        matchData.final_score_away = m.score.fullTime.away
        matchData.result = getResult(m.score.fullTime.home, m.score.fullTime.away)

        const goals    = m.goals || []
        const bookings = m.bookings || []
        const htHome   = m.score?.halfTime?.home ?? 0
        const htAway   = m.score?.halfTime?.away ?? 0
        const shHome   = m.score.fullTime.home - htHome
        const shAway   = m.score.fullTime.away - htAway
        const redCards = bookings.filter((b: any) => b.card === 'RED_CARD' || b.card === 'YELLOW_RED_CARD')
        const scorers  = goals.filter((g: any) => g.type !== 'OWN').map((g: any) => g.scorer?.name).filter(Boolean)

        matchData.result_btts      = m.score.fullTime.home > 0 && m.score.fullTime.away > 0
        matchData.result_over25    = (m.score.fullTime.home + m.score.fullTime.away) > 2.5
        matchData.result_red_card  = redCards.length > 0
        matchData.result_best_half = htHome + htAway > shHome + shAway ? 'home'
                                   : htHome + htAway < shHome + shAway ? 'away' : 'equal'
        matchData.result_et        = ['EXTRA_TIME', 'PENALTY_SHOOTOUT'].includes(m.score.duration ?? '')
        matchData.scorers          = scorers
      }

      if ((status === 'upcoming' || status === 'live') && m.homeTeam?.name && m.awayTeam?.name) {
        // Try The Odds API first
        const oddsEvent = matchOddsEvent(m, oddsEvents)
        if (oddsEvent) {
          oddsFromApi++
          matchData.odds_api_event_id = oddsEvent.id
          const bookmaker = oddsEvent.bookmakers?.[0]
          if (bookmaker) {
            const h2h    = bookmaker.markets?.find((mk: any) => mk.key === 'h2h')
            const btts   = bookmaker.markets?.find((mk: any) => mk.key === 'btts')
            const totals = bookmaker.markets?.find((mk: any) => mk.key === 'totals')
            matchData.odds_home     = h2h?.outcomes?.find((o: any) => teamsMatch(o.name, oddsEvent.home_team))?.price ?? null
            matchData.odds_away     = h2h?.outcomes?.find((o: any) => teamsMatch(o.name, oddsEvent.away_team))?.price ?? null
            matchData.odds_draw     = h2h?.outcomes?.find((o: any) => o.name === 'Draw')?.price ?? null
            matchData.odds_btts_yes = btts?.outcomes?.find((o: any) => o.name === 'Yes')?.price ?? null
            matchData.odds_btts_no  = btts?.outcomes?.find((o: any) => o.name === 'No')?.price ?? null
            matchData.odds_over25   = totals?.outcomes?.find((o: any) => o.name === 'Over' && o.point === 2.5)?.price ?? null
            matchData.odds_under25  = totals?.outcomes?.find((o: any) => o.name === 'Under' && o.point === 2.5)?.price ?? null
          }
        }

        // Elo fallback for any missing odds
        const rHome = getTeamRating(m.homeTeam.name)
        const rAway = getTeamRating(m.awayTeam.name)
        const elo   = calcEloOdds(rHome, rAway, isKnockout)

        if (!matchData.odds_home)     { matchData.odds_home     = elo.home;         oddsFromElo++ }
        if (!matchData.odds_draw)       matchData.odds_draw     = elo.draw
        if (!matchData.odds_away)       matchData.odds_away     = elo.away
        if (!matchData.odds_btts_yes)   matchData.odds_btts_yes = elo.btts_yes
        if (!matchData.odds_btts_no)    matchData.odds_btts_no  = elo.btts_no
        if (!matchData.odds_over25)     matchData.odds_over25   = elo.over25
        if (!matchData.odds_under25)    matchData.odds_under25  = elo.under25

        // These markets rarely come from The Odds API — always use Elo
        matchData.odds_red_card_yes = elo.red_card_yes
        matchData.odds_red_card_no  = elo.red_card_no
        matchData.odds_et_yes       = elo.et_yes
        matchData.odds_et_no        = elo.et_no
      }

      await supabase.from('matches').upsert(matchData, { onConflict: 'footballdata_match_id' })
      synced++
    }

    return new Response(JSON.stringify({ synced, oddsFromApi, oddsFromElo }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
