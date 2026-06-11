import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import { supabase } from '../services/supabase'
import { leaderboardEmbed, errorEmbed } from '../utils/embeds'

export const data = new SlashCommandBuilder()
  .setName('classement')
  .setDescription('Affiche le classement')
  .addStringOption(opt =>
    opt.setName('type')
      .setDescription('Type de classement')
      .addChoices(
        { name: 'Points (défaut)', value: 'points' },
        { name: 'Winrate', value: 'winrate' },
        { name: 'Audace (cote moyenne)', value: 'audace' },
        { name: 'Duels 1v1', value: '1v1' },
      )
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply()
  const type = interaction.options.getString('type') || 'points'

  const viewMap: Record<string, string> = {
    points: 'leaderboard_points',
    winrate: 'leaderboard_winrate',
    audace: 'leaderboard_risk',
    '1v1': 'leaderboard_duels',
  }

  const { data, error } = await supabase
    .from(viewMap[type])
    .select('*')
    .limit(10)

  if (error) return interaction.editReply({ embeds: [errorEmbed(error.message)] })

  const titles: Record<string, string> = {
    points: '🏆 Classement — Points',
    winrate: '📊 Classement — Meilleur winrate',
    audace: '🎲 Classement — Plus audacieux',
    '1v1': '⚔️ Classement — Duels 1v1',
  }

  await interaction.editReply({ embeds: [leaderboardEmbed(data || [], titles[type])] })
}
