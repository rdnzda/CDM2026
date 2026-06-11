import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Colors } from 'discord.js'
import { supabase } from '../services/supabase'
import { errorEmbed } from '../utils/embeds'
import { getOrCreateUser } from '../utils/validators'

const TOURNAMENT_LOCK = new Date('2026-06-11T00:00:00Z')

export const data = new SlashCommandBuilder()
  .setName('award')
  .setDescription('Prédictions Golden Boot & Golden Ball')
  .addSubcommand(s =>
    s.setName('golden-boot')
      .setDescription('Prédire le meilleur buteur')
      .addStringOption(o => o.setName('joueur').setDescription('Nom du joueur').setRequired(true))
      .addStringOption(o => o.setName('equipe').setDescription('Équipe du joueur').setRequired(true))
  )
  .addSubcommand(s =>
    s.setName('golden-ball')
      .setDescription('Prédire le meilleur joueur')
      .addStringOption(o => o.setName('joueur').setDescription('Nom du joueur').setRequired(true))
      .addStringOption(o => o.setName('equipe').setDescription('Équipe du joueur').setRequired(true))
  )
  .addSubcommand(s =>
    s.setName('voir')
      .setDescription('Voir les prédictions awards')
      .addUserOption(o => o.setName('joueur').setDescription('Joueur (défaut: toi)'))
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true })
  const sub = interaction.options.getSubcommand()
  const user = await getOrCreateUser(interaction.user.id, interaction.user.username)
  if (!user) return interaction.editReply({ embeds: [errorEmbed('Profil introuvable.')] })

  if (sub === 'golden-boot' || sub === 'golden-ball') {
    if (new Date() >= TOURNAMENT_LOCK) return interaction.editReply({ embeds: [errorEmbed('Les prédictions awards sont fermées depuis le 11 juin 2026.')] })

    const playerName = interaction.options.getString('joueur', true)
    const team       = interaction.options.getString('equipe', true)
    const awardType  = sub === 'golden-boot' ? 'golden_boot' : 'golden_ball'

    const { error } = await supabase.from('award_predictions').upsert({
      user_id:     user.id,
      award_type:  awardType,
      player_name: playerName,
      team,
      odds_at_time: 1.0, // TODO: fetch real odds
    }, { onConflict: 'user_id,award_type' })

    if (error) return interaction.editReply({ embeds: [errorEmbed(error.message)] })

    const label = sub === 'golden-boot' ? '⚽ Golden Boot' : '🌟 Golden Ball'
    return interaction.editReply({ embeds: [
      new EmbedBuilder().setColor(Colors.Gold)
        .setTitle(`${label} enregistré`)
        .addFields({ name: 'Joueur', value: playerName, inline: true }, { name: 'Équipe', value: team, inline: true })
    ]})
  }

  if (sub === 'voir') {
    const target = interaction.options.getUser('joueur') ?? interaction.user
    const targetUser = await getOrCreateUser(target.id, target.username)
    if (!targetUser) return interaction.editReply({ embeds: [errorEmbed('Utilisateur introuvable.')] })

    const { data: awards } = await supabase.from('award_predictions').select('*').eq('user_id', targetUser.id)
    if (!awards?.length) return interaction.editReply(`**${target.username}** n'a aucune prédiction award.`)

    const boot = awards.find(a => a.award_type === 'golden_boot')
    const ball = awards.find(a => a.award_type === 'golden_ball')

    return interaction.editReply({ embeds: [
      new EmbedBuilder().setColor(Colors.Gold)
        .setTitle(`🏅 Awards de ${target.username}`)
        .addFields(
          { name: '⚽ Golden Boot', value: boot ? `${boot.player_name} (${boot.team})` : 'Non prédit', inline: true },
          { name: '🌟 Golden Ball', value: ball ? `${ball.player_name} (${ball.team})` : 'Non prédit', inline: true },
        )
    ]})
  }
}
