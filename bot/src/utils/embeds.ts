import { EmbedBuilder, Colors } from 'discord.js'
import { formatPoints, formatOdds, formatDate, formatMatch, formatBetType, formatResult } from './formatters'

export function betConfirmEmbed(bet: any, match: any, pointsIfWon: number) {
  return new EmbedBuilder()
    .setColor(Colors.Blue)
    .setTitle('✅ Pari enregistré')
    .addFields(
      { name: 'Match', value: formatMatch(match), inline: true },
      { name: 'Type', value: formatBetType(bet.bet_type), inline: true },
      { name: 'Cote', value: formatOdds(bet.odds_at_bet_time), inline: true },
      { name: 'Mise', value: formatPoints(bet.stake), inline: true },
      { name: 'Gain potentiel', value: formatPoints(pointsIfWon), inline: true },
      { name: 'Phase', value: `×${bet.phase_multiplier}`, inline: true },
    )
    .setTimestamp()
}

export function errorEmbed(message: string) {
  return new EmbedBuilder()
    .setColor(Colors.Red)
    .setTitle('❌ Erreur')
    .setDescription(message)
}

export function leaderboardEmbed(rows: any[], title: string) {
  const lines = rows.map((r, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
    return `${medal} **${r.username}** — ${formatPoints(r.total_points)}`
  })
  return new EmbedBuilder()
    .setColor(Colors.Gold)
    .setTitle(title)
    .setDescription(lines.join('\n') || 'Aucun résultat')
    .setTimestamp()
}

export function matchListEmbed(matches: any[]) {
  const lines = matches.map(m =>
    `🔵 **${formatMatch(m)}** — ${formatDate(m.kickoff_at)}\n` +
    `   1: ${formatOdds(m.odds_home ?? 0)} | X: ${formatOdds(m.odds_draw ?? 0)} | 2: ${formatOdds(m.odds_away ?? 0)}`
  )
  return new EmbedBuilder()
    .setColor(Colors.Blue)
    .setTitle('📅 Prochains matchs')
    .setDescription(lines.join('\n\n') || 'Aucun match à venir')
    .setTimestamp()
}

export function profilEmbed(user: any, achievements: any[]) {
  const winrate = user.total_bets > 0 ? Math.round(user.bets_won * 100 / user.total_bets) : 0
  return new EmbedBuilder()
    .setColor(Colors.Blurple)
    .setTitle(`👤 ${user.username}`)
    .setThumbnail(user.avatar_url)
    .addFields(
      { name: 'Points', value: formatPoints(user.total_points), inline: true },
      { name: 'Paris', value: `${user.total_bets} (${winrate}% gagnés)`, inline: true },
      { name: 'Duels', value: `${user.duels_won}W / ${user.duels_lost}L`, inline: true },
      { name: 'Cote moyenne', value: user.avg_odds ? formatOdds(user.avg_odds) : 'N/A', inline: true },
      { name: 'Succès', value: achievements.length > 0 ? achievements.map(a => a.achievements?.icon).join(' ') : 'Aucun', inline: false },
    )
    .setTimestamp()
}
