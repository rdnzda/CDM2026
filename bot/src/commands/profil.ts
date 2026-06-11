import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import { supabase } from '../services/supabase'
import { profilEmbed, errorEmbed } from '../utils/embeds'
import { getOrCreateUser } from '../utils/validators'

export const data = new SlashCommandBuilder()
  .setName('profil')
  .setDescription('Affiche ton profil ou celui d\'un autre joueur')
  .addUserOption(opt => opt.setName('joueur').setDescription('Joueur à consulter'))

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply()

  const target = interaction.options.getUser('joueur') ?? interaction.user
  const user = await getOrCreateUser(
    target.id,
    target.username,
    target.displayAvatarURL()
  )
  if (!user) return interaction.editReply({ embeds: [errorEmbed('Utilisateur introuvable.')] })

  const { data: achievements } = await supabase
    .from('user_achievements')
    .select('*, achievements(*)')
    .eq('user_id', user.id)

  await interaction.editReply({ embeds: [profilEmbed(user, achievements || [])] })
}
