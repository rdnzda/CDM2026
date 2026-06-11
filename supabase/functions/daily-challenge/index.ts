import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async () => {
  try {
    const today = new Date().toISOString().split('T')[0]

    // Check if already created
    const { data: existing } = await supabase
      .from('daily_challenges')
      .select('id')
      .eq('challenge_date', today)
      .single()

    if (existing) return new Response(JSON.stringify({ skipped: 'already exists' }))

    // Find a match happening today or the next upcoming match
    const { data: match } = await supabase
      .from('matches')
      .select('id')
      .eq('status', 'upcoming')
      .gte('kickoff_at', today)
      .order('kickoff_at', { ascending: true })
      .limit(1)
      .single()

    if (!match) return new Response(JSON.stringify({ skipped: 'no match found' }))

    const types = ['exact_score', 'scorer', 'combo_3']
    const challenge_type = types[Math.floor(Math.random() * types.length)] as any

    await supabase.from('daily_challenges').insert({
      match_id:       match.id,
      challenge_type,
      challenge_date: today,
    })

    return new Response(JSON.stringify({ created: true, date: today }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
