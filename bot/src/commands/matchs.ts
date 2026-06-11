import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import { supabase } from '../services/supabase'
import { matchListEmbed, errorEmbed } from '../utils/embeds'

export const data = new SlashCommandBuilder()
  .setName('matchs')
  .setDescription('Affiche les prochains matchs disponibles pour parier')

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply()

  const { data: matches, error } = await supabase
    .from('matches')
    .select('*')
    .eq('status', 'upcoming')
    .order('kickoff_at', { ascending: true })
    .limit(10)

  if (error) return interaction.editReply({ embeds: [errorEmbed(error.message)] })

  await interaction.editReply({ embeds: [matchListEmbed(matches || [])] })
}
