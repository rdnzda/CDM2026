import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Colors } from 'discord.js'
import { supabase } from '../services/supabase'
import { errorEmbed } from '../utils/embeds'
import { getOrCreateUser } from '../utils/validators'
import { formatDate, formatMatch } from '../utils/formatters'

export const data = new SlashCommandBuilder()
  .setName('quotidien')
  .setDescription('Défi quotidien')
  .addSubcommand(s => s.setName('voir').setDescription('Voir le défi du jour'))
  .addSubcommand(s =>
    s.setName('participer')
      .setDescription('Soumettre ta réponse au défi du jour')
      .addStringOption(o => o.setName('prediction').setDescription('Ta prédiction (ex: 2-1 ou nom du buteur)').setRequired(true))
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true })
  const sub = interaction.options.getSubcommand()
  const user = await getOrCreateUser(interaction.user.id, interaction.user.username)
  if (!user) return interaction.editReply({ embeds: [errorEmbed('Profil introuvable.')] })

  const today = new Date().toISOString().split('T')[0]
  const { data: daily } = await supabase
    .from('daily_challenges')
    .select('*, matches(*)')
    .eq('challenge_date', today)
    .single()

  if (!daily) return interaction.editReply({ embeds: [errorEmbed('Aucun défi pour aujourd\'hui.')] })

  const match = daily.matches as any
  const typeLabels: Record<string, string> = { exact_score: 'Score exact', scorer: 'Buteur', combo_3: 'Combiné 3 sélections' }

  if (sub === 'voir') {
    return interaction.editReply({ embeds: [
      new EmbedBuilder().setColor(Colors.Purple)
        .setTitle('☀️ Défi du jour')
        .addFields(
          { name: 'Match', value: formatMatch(match), inline: true },
          { name: 'Coup d\'envoi', value: formatDate(match.kickoff_at), inline: true },
          { name: 'Type', value: typeLabels[daily.challenge_type], inline: false },
          { name: 'Récompenses', value: `🥇 1 000 pts · 🥈 500 pts · 🥉 250 pts · Correct: 100 pts`, inline: false },
        )
    ]})
  }

  if (sub === 'participer') {
    const prediction = interaction.options.getString('prediction', true)

    // Check not already entered
    const { data: existing } = await supabase
      .from('daily_challenge_entries')
      .select('id')
      .eq('daily_challenge_id', daily.id)
      .eq('user_id', user.id)
      .single()

    if (existing) return interaction.editReply({ embeds: [errorEmbed('Tu as déjà participé au défi du jour.')] })

    // Parse prediction
    let scoreHome: number | undefined, scoreAway: number | undefined, scorer: string | undefined
    if (daily.challenge_type === 'exact_score') {
      const parts = prediction.split(/[-:]/)
      if (parts.length === 2) { scoreHome = parseInt(parts[0]); scoreAway = parseInt(parts[1]) }
    } else if (daily.challenge_type === 'scorer') {
      scorer = prediction
    }

    await supabase.from('daily_challenge_entries').insert({
      daily_challenge_id:   daily.id,
      user_id:              user.id,
      prediction_score_home: scoreHome,
      prediction_score_away: scoreAway,
      prediction_scorer:    scorer,
    })

    return interaction.editReply({ embeds: [
      new EmbedBuilder().setColor(Colors.Green).setTitle('✅ Participation enregistrée').setDescription(`Ta prédiction : **${prediction}**\nLes points seront attribués à la fin du match.`)
    ]})
  }
}
