import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Colors } from 'discord.js'
import { supabase } from '../services/supabase'
import { errorEmbed } from '../utils/embeds'
import { getOrCreateUser } from '../utils/validators'

export const data = new SlashCommandBuilder()
  .setName('boost')
  .setDescription('Gérer tes boosts')
  .addSubcommand(s =>
    s.setName('liste')
      .setDescription('Voir tes boosts disponibles')
  )
  .addSubcommand(s =>
    s.setName('utiliser')
      .setDescription('Utiliser un boost sur un pari')
      .addStringOption(o => o.setName('boost_id').setDescription('ID du boost').setRequired(true))
      .addStringOption(o => o.setName('pari_id').setDescription('ID du pari').setRequired(true))
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true })
  const sub = interaction.options.getSubcommand()
  const user = await getOrCreateUser(interaction.user.id, interaction.user.username)
  if (!user) return interaction.editReply({ embeds: [errorEmbed('Profil introuvable.')] })

  if (sub === 'liste') {
    const { data: boosts } = await supabase
      .from('user_boosts')
      .select('*')
      .eq('user_id', user.id)
      .eq('used', false)
      .order('created_at', { ascending: true })

    if (!boosts?.length) return interaction.editReply('Aucun boost disponible.')

    const lines = boosts.map(b =>
      `• \`${b.id.slice(0, 8)}…\` — **${b.boost_type === 'x20_exact' ? '×2.0 Score exact' : '×1.5'}** (phase: ${b.phase})`
    )
    return interaction.editReply({ embeds: [
      new EmbedBuilder().setColor(Colors.Yellow).setTitle('⚡ Tes boosts disponibles').setDescription(lines.join('\n'))
    ]})
  }

  if (sub === 'utiliser') {
    return interaction.editReply({ embeds: [errorEmbed('Pour utiliser un boost, passe l\'ID du boost dans `/paris résultat` (paramètre optionnel). Cette commande est réservée aux boosts post-pari.')] })
  }
}
