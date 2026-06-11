import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Colors } from 'discord.js'
import { supabase } from '../services/supabase'
import { errorEmbed } from '../utils/embeds'
import { getOrCreateUser } from '../utils/validators'
import { formatPoints } from '../utils/formatters'

const TOURNAMENT_LOCK = new Date('2026-06-11T00:00:00Z')

export const data = new SlashCommandBuilder()
  .setName('tournoi')
  .setDescription('Prédictions podium tournoi')
  .addSubcommand(s =>
    s.setName('predire')
      .setDescription('Prédire le podium du tournoi')
      .addStringOption(o => o.setName('premier').setDescription('Équipe 1ère').setRequired(true))
      .addStringOption(o => o.setName('deuxieme').setDescription('Équipe 2ème').setRequired(true))
      .addStringOption(o => o.setName('troisieme').setDescription('Équipe 3ème').setRequired(true))
  )
  .addSubcommand(s =>
    s.setName('voir')
      .setDescription('Voir les prédictions d\'un joueur')
      .addUserOption(o => o.setName('joueur').setDescription('Joueur (défaut: toi)'))
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true })
  const sub = interaction.options.getSubcommand()
  const user = await getOrCreateUser(interaction.user.id, interaction.user.username)
  if (!user) return interaction.editReply({ embeds: [errorEmbed('Profil introuvable.')] })

  if (sub === 'predire') {
    if (new Date() >= TOURNAMENT_LOCK) return interaction.editReply({ embeds: [errorEmbed('Les prédictions tournoi sont fermées depuis le 11 juin 2026.')] })

    const first  = interaction.options.getString('premier', true)
    const second = interaction.options.getString('deuxieme', true)
    const third  = interaction.options.getString('troisieme', true)

    const { error } = await supabase.from('tournament_predictions').upsert({
      user_id:     user.id,
      first_team:  first,
      second_team: second,
      third_team:  third,
      odds_first:  1.0, // TODO: fetch real odds from DB/API
      odds_second: 1.0,
      odds_third:  1.0,
    }, { onConflict: 'user_id' })

    if (error) return interaction.editReply({ embeds: [errorEmbed(error.message)] })

    return interaction.editReply({ embeds: [
      new EmbedBuilder().setColor(Colors.Gold)
        .setTitle('🏆 Prédiction tournoi enregistrée')
        .addFields(
          { name: '🥇 1er', value: first, inline: true },
          { name: '🥈 2ème', value: second, inline: true },
          { name: '🥉 3ème', value: third, inline: true },
        )
    ]})
  }

  if (sub === 'voir') {
    const target = interaction.options.getUser('joueur') ?? interaction.user
    const targetUser = await getOrCreateUser(target.id, target.username)
    if (!targetUser) return interaction.editReply({ embeds: [errorEmbed('Utilisateur introuvable.')] })

    const { data: pred } = await supabase.from('tournament_predictions').select('*').eq('user_id', targetUser.id).single()
    if (!pred) return interaction.editReply(`**${target.username}** n'a pas encore fait de prédiction.`)

    return interaction.editReply({ embeds: [
      new EmbedBuilder().setColor(Colors.Gold)
        .setTitle(`🏆 Prédictions de ${target.username}`)
        .addFields(
          { name: '🥇', value: pred.first_team, inline: true },
          { name: '🥈', value: pred.second_team, inline: true },
          { name: '🥉', value: pred.third_team, inline: true },
        )
    ]})
  }
}
