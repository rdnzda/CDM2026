import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)
const ODDS_API_KEY = Deno.env.get('ODDS_API_KEY')!
const ODDS_SPORT   = Deno.env.get('ODDS_SPORT') || 'soccer_fifa_world_cup'

Deno.serve(async () => {
  try {
    const res = await fetch(
      `https://api.the-odds-api.com/v4/sports/${ODDS_SPORT}/odds?apiKey=${ODDS_API_KEY}&regions=eu&markets=h2h,btts,totals&oddsFormat=decimal`
    )
    const oddsEvents = await res.json()
    if (!Array.isArray(oddsEvents)) throw new Error('Invalid odds response')

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
    }

    return new Response(JSON.stringify({ updated: oddsEvents.length }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
