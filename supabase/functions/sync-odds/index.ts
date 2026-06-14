import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)
const ODDS_API_KEY = Deno.env.get('ODDS_API_KEY')!
const ODDS_SPORT   = Deno.env.get('ODDS_SPORT') || 'soccer_fifa_world_cup'

// ── Poisson model for exact score odds ──────────────────────────────────────

function poissonPmf(lambda: number, k: number): number {
  if (lambda <= 0 || k < 0) return 0
  // Use log-space to avoid overflow for large k
  let logP = -lambda + k * Math.log(lambda)
  for (let i = 1; i <= k; i++) logP -= Math.log(i)
  return Math.exp(logP)
}

function resultProbs(lh: number, la: number, maxG = 9) {
  let home = 0, draw = 0, away = 0
  for (let i = 0; i <= maxG; i++) {
    const pi = poissonPmf(lh, i)
    for (let j = 0; j <= maxG; j++) {
      const pij = pi * poissonPmf(la, j)
      if (i > j) home += pij
      else if (i === j) draw += pij
      else away += pij
    }
  }
  return { home, draw, away }
}

// Grid search to find (λ_home, λ_away) that match observed result probabilities
function fitLambdas(pH: number, pD: number, pA: number): { lh: number; la: number } {
  let bestErr = Infinity, bestLH = 1.5, bestLA = 1.0
  for (let lh = 0.3; lh <= 3.8; lh += 0.05) {
    for (let la = 0.3; la <= 3.8; la += 0.05) {
      const p = resultProbs(lh, la)
      const err = (p.home - pH) ** 2 + (p.draw - pD) ** 2 + (p.away - pA) ** 2
      if (err < bestErr) { bestErr = err; bestLH = lh; bestLA = la }
    }
  }
  return { lh: bestLH, la: bestLA }
}

// Generate exact score odds from Poisson parameters (scores up to maxG–maxG)
function genExactScoreOdds(lh: number, la: number, maxG = 6) {
  const results: { scoreH: number; scoreA: number; odds: number }[] = []
  for (let h = 0; h <= maxG; h++) {
    for (let a = 0; a <= maxG; a++) {
      const p = poissonPmf(lh, h) * poissonPmf(la, a)
      // Skip negligible probabilities (would give odds > 200)
      if (p < 0.005) continue
      results.push({ scoreH: h, scoreA: a, odds: Math.round((1 / p) * 100) / 100 })
    }
  }
  return results
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async () => {
  try {
    let oddsUpdated = 0
    let exactScoresUpdated = 0

    // ── 1. Sync h2h / btts / totals from The Odds API ────────────────────────
    try {
      const res = await fetch(
        `https://api.the-odds-api.com/v4/sports/${ODDS_SPORT}/odds?apiKey=${ODDS_API_KEY}&regions=eu&markets=h2h,btts,totals&oddsFormat=decimal`
      )
      const oddsEvents = await res.json()
      if (Array.isArray(oddsEvents)) {
        for (const e of oddsEvents) {
          const bookmaker = e.bookmakers?.[0]
          if (!bookmaker) continue
          const h2h    = bookmaker.markets?.find((m: any) => m.key === 'h2h')
          const btts   = bookmaker.markets?.find((m: any) => m.key === 'btts')
          const totals = bookmaker.markets?.find((m: any) => m.key === 'totals')

          await supabase.from('matches').update({
            odds_home:     h2h?.outcomes?.find((o: any) => o.name === e.home_team)?.price ?? null,
            odds_away:     h2h?.outcomes?.find((o: any) => o.name === e.away_team)?.price ?? null,
            odds_draw:     h2h?.outcomes?.find((o: any) => o.name === 'Draw')?.price ?? null,
            odds_btts_yes: btts?.outcomes?.find((o: any) => o.name === 'Yes')?.price ?? null,
            odds_btts_no:  btts?.outcomes?.find((o: any) => o.name === 'No')?.price ?? null,
            odds_over25:   totals?.outcomes?.find((o: any) => o.name === 'Over' && o.point === 2.5)?.price ?? null,
            odds_under25:  totals?.outcomes?.find((o: any) => o.name === 'Under' && o.point === 2.5)?.price ?? null,
          }).eq('odds_api_event_id', e.id)

          oddsUpdated++
        }
      }
    } catch (_) {
      // Odds API failure is non-fatal — Poisson generation continues below
    }

    // ── 2. Generate exact score odds via Poisson model ────────────────────────
    const { data: upcomingMatches } = await supabase
      .from('matches')
      .select('id, odds_home, odds_draw, odds_away')
      .eq('status', 'upcoming')
      .not('odds_home', 'is', null)
      .not('odds_draw', 'is', null)
      .not('odds_away', 'is', null)

    for (const match of upcomingMatches ?? []) {
      // Convert bookmaker odds to true probabilities (remove vig)
      const rawH = 1 / Number(match.odds_home)
      const rawD = 1 / Number(match.odds_draw)
      const rawA = 1 / Number(match.odds_away)
      const total = rawH + rawD + rawA
      const pH = rawH / total
      const pD = rawD / total
      const pA = rawA / total

      const { lh, la } = fitLambdas(pH, pD, pA)
      const scores = genExactScoreOdds(lh, la)
      if (scores.length === 0) continue

      await supabase.from('odds_exact_score').upsert(
        scores.map(s => ({
          match_id:   match.id,
          score_home: s.scoreH,
          score_away: s.scoreA,
          odds:       s.odds,
        })),
        { onConflict: 'match_id,score_home,score_away' }
      )

      exactScoresUpdated += scores.length
    }

    return new Response(
      JSON.stringify({ oddsUpdated, exactScoresUpdated }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
