import { Client, TextChannel, EmbedBuilder, Colors } from 'discord.js'
import { supabase } from './supabase'
import { formatMatch, formatPoints, formatOdds, formatBetType } from '../utils/formatters'

const PHASE_LABEL: Record<string, string> = {
  group: 'Phase de groupes', round_of_16: '8e de finale',
  quarter: 'Quart de finale', semi: 'Demi-finale', final: 'Finale',
}

// Track already-announced finished matches (resets on restart, safe)
const announcedMatchIds = new Set<string>()

// ─── One-off helpers ────────────────────────────────────────────────────────

export async function notifyBetResult(client: Client, bet: any, match: any, won: boolean, pointsWon: number) {
  const channelId = process.env.DISCORD_RESULTS_CHANNEL_ID
  if (!channelId) return
  const channel = await client.channels.fetch(channelId).catch(() => null) as TextChannel | null
  if (!channel) return

  const emoji = won ? '✅' : '❌'
  await channel.send(
    `${emoji} **<@${bet.discord_id}>** — ${formatMatch(match)}\n` +
    `${won ? `+${formatPoints(pointsWon)} gagnés !` : `Pari perdu (mise : ${formatPoints(bet.stake)})`}`
  )
}

export async function notifyDailyChallenge(client: Client, match: any, challengeType: string) {
  const channelId = process.env.DISCORD_GENERAL_CHANNEL_ID
  if (!channelId) return
  const channel = await client.channels.fetch(channelId).catch(() => null) as TextChannel | null
  if (!channel) return

  await channel.send(
    `☀️ **Défi du jour !**\n` +
    `Match : **${formatMatch(match)}**\n` +
    `Type : **${challengeType}**\n` +
    `Utilise \`/quotidien participer\` pour soumettre ta prédiction !`
  )
}

// ─── Auto-posting: polls for resolved bets & combos ─────────────────────────

// On startup look back 6h to catch anything resolved while bot was offline
// Announced IDs prevent double-posting within the same session
let lastBetCheck   = new Date(Date.now() - 6 * 60 * 60 * 1000)
let lastComboCheck = new Date(Date.now() - 6 * 60 * 60 * 1000)
let lastDuelCheck  = new Date(Date.now() - 6 * 60 * 60 * 1000)
const announcedBetIds   = new Set<string>()
const announcedComboIds = new Set<string>()
const announcedDuelIds  = new Set<string>()

// New bet announcements — no lookback on startup to avoid spamming old bets
let lastNewBetCheck   = new Date()
let lastNewComboCheck = new Date()
const announcedNewBetIds   = new Set<string>()
const announcedNewComboIds = new Set<string>()

function fmtBetPred(bet: any, match: any): string {
  const parts: string[] = []

  if (bet.prediction_result === 'home')        parts.push(`🏠 **${match.home_team}** gagne`)
  else if (bet.prediction_result === 'away')   parts.push(`✈️ **${match.away_team}** gagne`)
  else if (bet.prediction_result === 'draw')   parts.push('🤝 Match nul')

  if (bet.prediction_score_home != null && bet.prediction_score_away != null)
    parts.push(`Score **${bet.prediction_score_home}-${bet.prediction_score_away}**`)

  if (bet.prediction_scorer)                   parts.push(`⚽ ${bet.prediction_scorer} buteur`)
  if (bet.bet_type === 'btts')                 parts.push(bet.prediction_bool ? '🎯 Les deux marquent' : '🛡️ BTTS Non')
  if (bet.bet_type === 'over_under')           parts.push(bet.prediction_bool ? '📈 Over 2.5' : '📉 Under 2.5')
  if (bet.bet_type === 'red_card')             parts.push(bet.prediction_bool ? '🟥 Carton rouge' : 'Pas de rouge')
  if (bet.bet_type === 'extra_time')           parts.push(bet.prediction_bool ? '⏱️ Prolongations' : 'Pas de prolong.')

  return parts.join(' · ') || '—'
}

async function postResolvedBets(client: Client) {
  const channelId = process.env.DISCORD_RESULTS_CHANNEL_ID
  if (!channelId) return
  const channel = await client.channels.fetch(channelId).catch(() => null) as TextChannel | null
  if (!channel) return

  const since = lastBetCheck.toISOString()
  lastBetCheck = new Date()

  const { data: bets } = await supabase
    .from('bets')
    .select('*, users(discord_id, username, avatar_url), matches(home_team, away_team)')
    .in('status', ['won', 'lost'])
    .gt('resolved_at', since)
    .not('resolved_at', 'is', null)
    .order('resolved_at', { ascending: true })

  for (const bet of bets ?? []) {
    if (announcedBetIds.has(bet.id)) continue
    announcedBetIds.add(bet.id)
    const user  = bet.users  as any
    const match = bet.matches as any
    const won   = bet.status === 'won'

    const embed = new EmbedBuilder()
      .setColor(won ? 0x22C55E : 0xEF4444)
      .setAuthor({
        name:    user.username,
        iconURL: user.avatar_url ?? undefined,
      })
      .setTitle(won ? '✅ Pari gagné !' : '❌ Pari perdu')
      .addFields(
        { name: 'Match',  value: formatMatch(match),          inline: true },
        { name: 'Type',   value: formatBetType(bet.bet_type), inline: true },
        { name: 'Cote',   value: formatOdds(bet.odds_at_bet_time), inline: true },
        { name: 'Mise',   value: formatPoints(bet.stake),     inline: true },
        {
          name:   won ? 'Gains' : 'Perte',
          value:  won
            ? `**+${formatPoints(bet.points_won)}**`
            : `-${formatPoints(bet.stake)}`,
          inline: true,
        },
      )
      .setFooter({ text: `<@${user.discord_id}> · /profil pour tes stats` })
      .setTimestamp(new Date(bet.resolved_at))

    await channel.send({ content: `<@${user.discord_id}>`, embeds: [embed] })
  }
}

async function postResolvedCombos(client: Client) {
  const channelId = process.env.DISCORD_RESULTS_CHANNEL_ID
  if (!channelId) return
  const channel = await client.channels.fetch(channelId).catch(() => null) as TextChannel | null
  if (!channel) return

  const since = lastComboCheck.toISOString()
  lastComboCheck = new Date()

  const { data: combos } = await supabase
    .from('combos')
    .select('*, users(discord_id, username, avatar_url)')
    .in('status', ['won', 'lost'])
    .gt('resolved_at', since)
    .not('resolved_at', 'is', null)
    .order('resolved_at', { ascending: true })

  for (const combo of combos ?? []) {
    if (announcedComboIds.has(combo.id)) continue
    announcedComboIds.add(combo.id)
    const user = combo.users as any
    const won  = combo.status === 'won'

    const embed = new EmbedBuilder()
      .setColor(won ? 0xF0B429 : 0xEF4444)
      .setAuthor({
        name:    user.username,
        iconURL: user.avatar_url ?? undefined,
      })
      .setTitle(won ? '🎉 Combiné gagné !' : '❌ Combiné perdu')
      .addFields(
        { name: 'Legs',        value: `${combo.legs_won ?? 0}/${combo.legs_count}`,      inline: true },
        { name: 'Cote totale', value: formatOdds(combo.total_odds),                       inline: true },
        { name: 'Mise',        value: formatPoints(combo.stake),                           inline: true },
        {
          name:   won ? 'Gains' : 'Perte',
          value:  won
            ? `**+${formatPoints(combo.points_won)}**`
            : `-${formatPoints(combo.stake)}`,
          inline: true,
        },
      )
      .setFooter({ text: `Combiné · <@${user.discord_id}>` })
      .setTimestamp(new Date(combo.resolved_at))

    await channel.send({ content: `<@${user.discord_id}>`, embeds: [embed] })
  }
}

async function postResolvedDuels(client: Client) {
  const channelId = process.env.DISCORD_RESULTS_CHANNEL_ID
  if (!channelId) return
  const channel = await client.channels.fetch(channelId).catch(() => null) as TextChannel | null
  if (!channel) return

  const since = lastDuelCheck.toISOString()
  lastDuelCheck = new Date()

  const { data: duels } = await supabase
    .from('challenges')
    .select(`
      id, stake, winner_id, finished_at,
      challenger:users!challenges_challenger_id_fkey(id, discord_id, username, avatar_url),
      opponent:users!challenges_opponent_id_fkey(id, discord_id, username, avatar_url)
    `)
    .eq('status', 'finished')
    .gt('finished_at', since)
    .not('finished_at', 'is', null)
    .order('finished_at', { ascending: true })

  for (const duel of duels ?? []) {
    if (announcedDuelIds.has(duel.id)) continue
    announcedDuelIds.add(duel.id)
    const challenger = duel.challenger as any
    const opponent   = duel.opponent   as any
    const winnerIsChallenger = duel.winner_id === challenger.id
    const winner = winnerIsChallenger ? challenger : opponent
    const loser  = winnerIsChallenger ? opponent   : challenger

    const embed = new EmbedBuilder()
      .setColor(0xF0B429)
      .setTitle('⚔️ Résultat du duel 1v1')
      .addFields(
        { name: '🏆 Vainqueur', value: `<@${winner.discord_id}> **${winner.username}**`, inline: true },
        { name: '💀 Perdant',   value: `<@${loser.discord_id}> **${loser.username}**`,   inline: true },
        { name: '💰 Mise',      value: formatPoints(duel.stake),                          inline: true },
        { name: '📈 Gain net',  value: `**+${formatPoints(duel.stake)}**`,                inline: true },
        { name: '📉 Perte',     value: `-${formatPoints(duel.stake)}`,                   inline: true },
      )
      .setFooter({ text: 'Duel 1v1 · /defi lancer pour en lancer un nouveau' })
      .setTimestamp(new Date(duel.finished_at))

    await channel.send({
      content: `<@${winner.discord_id}> <@${loser.discord_id}>`,
      embeds:  [embed],
    })
  }
}

async function postNewBets(client: Client) {
  const channelId = process.env.DISCORD_BETS_CHANNEL_ID
  if (!channelId) return
  const channel = await client.channels.fetch(channelId).catch(() => null) as TextChannel | null
  if (!channel) return

  const since = lastNewBetCheck.toISOString()
  lastNewBetCheck = new Date()

  const { data: bets } = await supabase
    .from('bets')
    .select('id, created_at, bet_type, stake, odds_at_bet_time, boost_used, boost_multiplier, prediction_result, prediction_score_home, prediction_score_away, prediction_scorer, prediction_bool, users(discord_id, username, avatar_url), matches(home_team, away_team, phase_multiplier)')
    .gt('created_at', since)
    .order('created_at', { ascending: true })

  for (const bet of bets ?? []) {
    if (announcedNewBetIds.has(bet.id)) continue
    announcedNewBetIds.add(bet.id)

    const user  = bet.users  as any
    const match = bet.matches as any
    const potWin = Math.round(
      bet.odds_at_bet_time * bet.stake * (match.phase_multiplier ?? 1) * (bet.boost_multiplier ?? 1)
    )
    const pred = fmtBetPred(bet, match)

    const fields: any[] = [
      { name: 'Cote',            value: formatOdds(bet.odds_at_bet_time), inline: true },
      { name: 'Gain potentiel',  value: `**+${formatPoints(potWin)}**`,   inline: true },
    ]
    if (bet.boost_used) fields.push({ name: 'Boost', value: `×${bet.boost_multiplier} 🔥`, inline: true })

    const embed = new EmbedBuilder()
      .setColor(bet.boost_used ? 0xF97316 : 0xF0B429)
      .setAuthor({ name: user.username, iconURL: user.avatar_url ?? undefined })
      .setDescription(
        `mise **${formatPoints(bet.stake)}** sur **${formatMatch(match)}**\n` +
        pred
      )
      .addFields(fields)
      .setTimestamp(new Date(bet.created_at))

    await channel.send({ embeds: [embed] })
  }
}

async function postNewCombos(client: Client) {
  const channelId = process.env.DISCORD_BETS_CHANNEL_ID
  if (!channelId) return
  const channel = await client.channels.fetch(channelId).catch(() => null) as TextChannel | null
  if (!channel) return

  const since = lastNewComboCheck.toISOString()
  lastNewComboCheck = new Date()

  const { data: combos } = await supabase
    .from('combos')
    .select('id, created_at, stake, total_odds, legs_count, boost_used, users(discord_id, username, avatar_url)')
    .gt('created_at', since)
    .order('created_at', { ascending: true })

  for (const combo of combos ?? []) {
    if (announcedNewComboIds.has(combo.id)) continue
    announcedNewComboIds.add(combo.id)

    const user   = combo.users as any
    const potWin = Math.round(combo.total_odds * combo.stake)

    const embed = new EmbedBuilder()
      .setColor(0xA855F7)
      .setAuthor({ name: user.username, iconURL: user.avatar_url ?? undefined })
      .setDescription(`place un **combiné ${combo.legs_count} matchs** · **${formatPoints(combo.stake)}** misés`)
      .addFields(
        { name: 'Cote totale',    value: formatOdds(combo.total_odds), inline: true },
        { name: 'Gain potentiel', value: `**+${formatPoints(potWin)}**`, inline: true },
        ...(combo.boost_used ? [{ name: 'Boost', value: '🔥 actif', inline: true }] : []),
      )
      .setTimestamp(new Date(combo.created_at))

    await channel.send({ embeds: [embed] })
  }
}

async function postMatchResults(client: Client) {
  const channelId = process.env.DISCORD_RESULTS_CHANNEL_ID
  if (!channelId) return
  const channel = await client.channels.fetch(channelId).catch(() => null) as TextChannel | null
  if (!channel) return

  const { data: finishedMatches } = await supabase
    .from('matches')
    .select('*')
    .eq('status', 'finished')
    .eq('results_announced', false)
    .not('final_score_home', 'is', null)

  for (const match of finishedMatches ?? []) {
    if (announcedMatchIds.has(match.id)) continue

    // Wait until all bets on this match are resolved
    const { count: pendingCount } = await supabase
      .from('bets')
      .select('id', { count: 'exact', head: true })
      .eq('match_id', match.id)
      .eq('status', 'pending')
    if ((pendingCount ?? 0) > 0) continue

    announcedMatchIds.add(match.id)
    await supabase.from('matches').update({ results_announced: true }).eq('id', match.id)

    // Fetch resolved bets for this match
    const { data: bets } = await supabase
      .from('bets')
      .select('status, stake, points_won, users(username)')
      .eq('match_id', match.id)
      .in('status', ['won', 'lost', 'refunded'])

    const wonBets  = (bets ?? []).filter(b => b.status === 'won')
    const lostBets = (bets ?? []).filter(b => b.status === 'lost')
    const biggestWin = wonBets.reduce((max: any, b: any) => (!max || b.points_won > max.points_won ? b : max), null)

    const resultLine = match.result === 'home'
      ? `**${match.home_team}** gagne`
      : match.result === 'away'
      ? `**${match.away_team}** gagne`
      : 'Match nul'

    const embed = new EmbedBuilder()
      .setColor(0xF0B429)
      .setTitle(`⚽ ${match.home_team} ${match.final_score_home} – ${match.final_score_away} ${match.away_team}`)
      .setDescription(`${resultLine} · ${PHASE_LABEL[match.phase] ?? match.phase}`)
      .addFields(
        { name: '✅ Paris gagnants', value: `${wonBets.length}`,  inline: true },
        { name: '❌ Paris perdants', value: `${lostBets.length}`, inline: true },
        {
          name:   '🏆 Meilleur gain',
          value:  biggestWin
            ? `**${(biggestWin.users as any)?.username}** +${formatPoints(biggestWin.points_won)}`
            : 'Aucun',
          inline: false,
        },
      )
      .setTimestamp()

    await channel.send({ embeds: [embed] })

    // Post updated leaderboard
    const { data: leaderboard } = await supabase
      .from('leaderboard_points')
      .select('*')
      .limit(8)

    if (leaderboard?.length) {
      const lines = leaderboard.map((r: any, i: number) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
        return `${medal} **${r.username}** — ${formatPoints(r.total_points)}`
      })
      const lbEmbed = new EmbedBuilder()
        .setColor(Colors.Gold)
        .setTitle('🏆 Classement mis à jour')
        .setDescription(lines.join('\n'))
        .setTimestamp()
      await channel.send({ embeds: [lbEmbed] })
    }
  }
}

export async function forcePostMatchResults(client: Client, matchId?: string): Promise<string> {
  const channelId = process.env.DISCORD_RESULTS_CHANNEL_ID
  if (!channelId) return '❌ `DISCORD_RESULTS_CHANNEL_ID` non configuré.'
  const channel = await client.channels.fetch(channelId).catch(() => null) as TextChannel | null
  if (!channel) return '❌ Canal résultats introuvable.'

  let query = supabase
    .from('matches')
    .select('*')
    .eq('status', 'finished')
    .not('final_score_home', 'is', null)

  if (matchId) {
    query = query.eq('id', matchId)
  } else {
    query = query.order('kickoff_at', { ascending: false }).limit(1)
  }

  const { data: matchList } = await query
  const match = matchList?.[0]
  if (!match) return '❌ Aucun match terminé avec score trouvé.'

  const { data: bets } = await supabase
    .from('bets')
    .select('status, stake, points_won, users(username)')
    .eq('match_id', match.id)
    .in('status', ['won', 'lost', 'refunded'])

  const wonBets    = (bets ?? []).filter((b: any) => b.status === 'won')
  const lostBets   = (bets ?? []).filter((b: any) => b.status === 'lost')
  const biggestWin = wonBets.reduce((max: any, b: any) => (!max || b.points_won > max.points_won ? b : max), null)

  const resultLine = match.result === 'home'
    ? `**${match.home_team}** gagne`
    : match.result === 'away'
    ? `**${match.away_team}** gagne`
    : 'Match nul'

  const embed = new EmbedBuilder()
    .setColor(0xF0B429)
    .setTitle(`⚽ ${match.home_team} ${match.final_score_home} – ${match.final_score_away} ${match.away_team}`)
    .setDescription(`${resultLine} · ${PHASE_LABEL[match.phase] ?? match.phase}`)
    .addFields(
      { name: '✅ Paris gagnants', value: `${wonBets.length}`,  inline: true },
      { name: '❌ Paris perdants', value: `${lostBets.length}`, inline: true },
      {
        name:   '🏆 Meilleur gain',
        value:  biggestWin
          ? `**${(biggestWin.users as any)?.username}** +${formatPoints(biggestWin.points_won)}`
          : 'Aucun',
        inline: false,
      },
    )
    .setTimestamp()

  await channel.send({ embeds: [embed] })
  announcedMatchIds.add(match.id)
  await supabase.from('matches').update({ results_announced: true }).eq('id', match.id)

  const { data: leaderboard } = await supabase
    .from('leaderboard_points')
    .select('*')
    .limit(8)

  if (leaderboard?.length) {
    const lines = leaderboard.map((r: any, i: number) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
      return `${medal} **${r.username}** — ${formatPoints(r.total_points)}`
    })
    const lbEmbed = new EmbedBuilder()
      .setColor(Colors.Gold)
      .setTitle('🏆 Classement mis à jour')
      .setDescription(lines.join('\n'))
      .setTimestamp()
    await channel.send({ embeds: [lbEmbed] })
  }

  return `✅ Résultat posté : **${match.home_team} ${match.final_score_home}–${match.final_score_away} ${match.away_team}**`
}

export function startResultsPoller(client: Client) {
  const INTERVAL = 90_000 // 90 secondes

  const poll = async () => {
    try {
      await Promise.all([
        postResolvedBets(client),
        postResolvedCombos(client),
        postResolvedDuels(client),
        postMatchResults(client),
        postNewBets(client),
        postNewCombos(client),
      ])
    } catch (err) {
      console.error('Erreur poller résultats:', err)
    }
  }

  // First poll shortly after startup
  setTimeout(poll, 10_000)
  setInterval(poll, INTERVAL)
  console.log('📡 Poller résultats démarré (interval: 90s)')
}
