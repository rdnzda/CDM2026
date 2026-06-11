import { Client, TextChannel, EmbedBuilder } from 'discord.js'
import { supabase } from './supabase'
import { formatMatch, formatPoints, formatOdds, formatBetType } from '../utils/formatters'

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

// Start 2 min before now to catch anything resolved while the bot was starting
let lastBetCheck   = new Date(Date.now() - 2 * 60 * 1000)
let lastComboCheck = new Date(Date.now() - 2 * 60 * 1000)
let lastDuelCheck  = new Date(Date.now() - 2 * 60 * 1000)

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
      stake, winner_id, finished_at,
      challenger:users!challenges_challenger_id_fkey(id, discord_id, username, avatar_url),
      opponent:users!challenges_opponent_id_fkey(id, discord_id, username, avatar_url)
    `)
    .eq('status', 'finished')
    .gt('finished_at', since)
    .not('finished_at', 'is', null)
    .order('finished_at', { ascending: true })

  for (const duel of duels ?? []) {
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

export function startResultsPoller(client: Client) {
  const INTERVAL = 90_000 // 90 secondes

  const poll = async () => {
    try {
      await Promise.all([
        postResolvedBets(client),
        postResolvedCombos(client),
        postResolvedDuels(client),
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
