import { Client, TextChannel } from 'discord.js'
import { formatMatch, formatPoints } from '../utils/formatters'

export async function notifyBetResult(client: Client, bet: any, match: any, won: boolean, pointsWon: number) {
  const channelId = process.env.DISCORD_RESULTS_CHANNEL_ID
  if (!channelId) return
  const channel = client.channels.cache.get(channelId) as TextChannel | undefined
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
  const channel = client.channels.cache.get(channelId) as TextChannel | undefined
  if (!channel) return

  await channel.send(
    `☀️ **Défi du jour !**\n` +
    `Match : **${formatMatch(match)}**\n` +
    `Type : **${challengeType}**\n` +
    `Utilise \`/quotidien participer\` pour soumettre ta prédiction !`
  )
}
