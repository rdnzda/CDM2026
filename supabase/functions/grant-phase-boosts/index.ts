import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const VALID_PHASES = ['round_of_32', 'round_of_16', 'quarter', 'semi', 'final']

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  // Require service-role key in Authorization header
  const auth = req.headers.get('Authorization') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  if (!auth.includes(serviceKey)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  let phase: string
  try {
    const body = await req.json()
    phase = body.phase
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 })
  }

  if (!VALID_PHASES.includes(phase)) {
    return new Response(
      JSON.stringify({ error: `Phase invalide. Valeurs : ${VALID_PHASES.join(', ')}` }),
      { status: 400 }
    )
  }

  // Fetch all user IDs
  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('id')

  if (usersErr) {
    return new Response(JSON.stringify({ error: usersErr.message }), { status: 500 })
  }

  if (!users?.length) {
    return new Response(JSON.stringify({ granted: 0, skipped: 0 }))
  }

  // For each user, check if they already have boosts for this phase
  const { data: existingBoosts } = await supabase
    .from('user_boosts')
    .select('user_id')
    .eq('phase', phase)

  const usersWithBoosts = new Set((existingBoosts ?? []).map((b: any) => b.user_id))
  const eligibleUsers = users.filter((u: any) => !usersWithBoosts.has(u.id))

  if (!eligibleUsers.length) {
    return new Response(JSON.stringify({ granted: 0, skipped: users.length }))
  }

  // Build boost rows: 3× x15 + 1× x20_exact per eligible user
  const boostRows = eligibleUsers.flatMap((u: any) => [
    { user_id: u.id, boost_type: 'x15',       phase },
    { user_id: u.id, boost_type: 'x15',       phase },
    { user_id: u.id, boost_type: 'x15',       phase },
    { user_id: u.id, boost_type: 'x20_exact', phase },
  ])

  // Insert in batches of 500 to stay under Supabase limits
  const BATCH = 500
  for (let i = 0; i < boostRows.length; i += BATCH) {
    const { error } = await supabase.from('user_boosts').insert(boostRows.slice(i, i + BATCH))
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
  }

  return new Response(
    JSON.stringify({
      granted: eligibleUsers.length,
      skipped: users.length - eligibleUsers.length,
      phase,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
