import { supabase } from '../services/supabase'

export async function getUser(discordId: string) {
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('discord_id', discordId)
    .single()
  return data
}

export async function getOrCreateUser(discordId: string, username: string, avatarUrl?: string) {
  const existing = await getUser(discordId)
  if (existing) return existing

  const { data } = await supabase
    .from('users')
    .insert({ discord_id: discordId, username, avatar_url: avatarUrl })
    .select()
    .single()

  if (data) {
    // Seed wildcards
    await supabase.from('user_wildcards').insert([
      { user_id: data.id, type: 'double' },
      { user_id: data.id, type: 'insurance' },
      { user_id: data.id, type: 'last_minute' },
    ])
    // Seed group phase boosts
    await supabase.from('user_boosts').insert([
      { user_id: data.id, boost_type: 'x15', phase: 'group' },
      { user_id: data.id, boost_type: 'x15', phase: 'group' },
      { user_id: data.id, boost_type: 'x15', phase: 'group' },
      { user_id: data.id, boost_type: 'x20_exact', phase: 'group' },
    ])
  }

  return data
}

export function checkBalance(user: any, stake: number): string | null {
  const available = user.total_points - user.frozen_points
  if (stake < 100) return 'Mise minimum : 100 pts'
  if (available < stake) return `Solde insuffisant. Disponible : ${available} pts`
  return null
}

export function checkBetDeadline(match: any, wildcardLastMinute = false): string | null {
  const now = Date.now()
  const lockTime = new Date(match.bets_locked_at).getTime()
  if (!wildcardLastMinute && now >= lockTime) return 'Les paris sont fermés pour ce match.'
  if (wildcardLastMinute) {
    const kickoff = new Date(match.kickoff_at).getTime()
    const tenthMin = kickoff + 10 * 60 * 1000
    if (now >= tenthMin) return 'La wildcard Dernière Minute ne peut s\'utiliser qu\'avant la 10e minute.'
  }
  return null
}

export async function getUpcomingMatchChoices(query: string) {
  let req = supabase
    .from('matches')
    .select('id, home_team, away_team, kickoff_at')
    .eq('status', 'upcoming')
    .order('kickoff_at', { ascending: true })
    .limit(25)

  if (query) {
    req = req.or(`home_team.ilike.%${query}%,away_team.ilike.%${query}%`)
  }

  const { data } = await req
  return (data || []).map(m => ({
    name: `${m.home_team} vs ${m.away_team} — ${new Date(m.kickoff_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}`.slice(0, 100),
    value: m.id,
  }))
}
