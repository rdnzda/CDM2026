import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

async function unlock(userId: string, code: string, context?: string) {
  await supabase.from('user_achievements').upsert(
    { user_id: userId, achievement_code: code, context },
    { onConflict: 'user_id,achievement_code', ignoreDuplicates: true }
  )
}

Deno.serve(async (req) => {
  try {
    const { user_id } = await req.json()
    if (!user_id) return new Response(JSON.stringify({ error: 'user_id required' }), { status: 400 })

    const { data: user } = await supabase.from('users').select('*').eq('id', user_id).single()
    if (!user) return new Response(JSON.stringify({ error: 'user not found' }), { status: 404 })

    const { data: bets }   = await supabase.from('bets').select('*').eq('user_id', user_id)
    const { data: combos } = await supabase.from('combos').select('*').eq('user_id', user_id)
    const { data: duels }  = await supabase.from('challenges').select('*').or(`challenger_id.eq.${user_id},opponent_id.eq.${user_id}`)

    const wonBets  = (bets || []).filter(b => b.status === 'won')
    const wonCombos = (combos || []).filter(c => c.status === 'won')

    if ((bets || []).length >= 1)  await unlock(user_id, 'first_bet')
    if (wonBets.length >= 1)       await unlock(user_id, 'first_win')
    if ((bets || []).length >= 10) await unlock(user_id, '10_bets')
    if ((bets || []).length >= 50) await unlock(user_id, '50_bets')

    // Win streak
    const sorted = [...(bets || [])].sort((a, b) => new Date(b.resolved_at || 0).getTime() - new Date(a.resolved_at || 0).getTime())
    let streak = 0
    for (const b of sorted) {
      if (b.status === 'won') streak++
      else break
    }
    if (streak >= 5) await unlock(user_id, '5_win_streak')

    // Exact scores
    const exactWins = wonBets.filter(b => b.bet_type === 'exact_score')
    if (exactWins.length >= 1) await unlock(user_id, 'exact_score_win')
    if (exactWins.length >= 3) await unlock(user_id, '3_exact_scores')

    // High odds
    if (wonBets.some(b => b.odds_at_bet_time >= 5.0)) await unlock(user_id, 'high_odds_win')

    // Combos
    if (wonCombos.some(c => c.legs_count >= 3)) await unlock(user_id, 'combo_3_win')
    if (wonCombos.some(c => c.legs_count >= 5)) await unlock(user_id, 'combo_5_win')

    // Duels
    if ((duels || []).length >= 1) await unlock(user_id, 'first_duel')
    if (user.duels_won >= 5)       await unlock(user_id, '5_duels_won')
    if (user.duels_streak >= 3)    await unlock(user_id, 'duel_streak_3')

    // Points milestones
    if (user.total_points >= 20000) await unlock(user_id, '20k_points')
    if (user.total_points >= 50000) await unlock(user_id, '50k_points')

    // Wildcards used
    if ((bets || []).some(b => b.wildcard_used === 'double'))    await unlock(user_id, 'double_wildcard')
    if ((bets || []).some(b => b.wildcard_used === 'insurance' && b.status === 'refunded')) await unlock(user_id, 'insurance_saved')

    return new Response(JSON.stringify({ checked: true }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
