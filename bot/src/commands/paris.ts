import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction } from 'discord.js'
import { supabase } from '../services/supabase'
import { placeBet } from '../services/bets'
import { betConfirmEmbed, errorEmbed } from '../utils/embeds'
import { getOrCreateUser, getUpcomingMatchChoices } from '../utils/validators'

export const data = new SlashCommandBuilder()
  .setName('paris')
  .setDescription('Poser un pari')
  .addSubcommand(sub =>
    sub.setName('résultat')
      .setDescription('Parier sur le résultat (1X2)')
      .addStringOption(o => o.setName('match').setDescription('Match').setRequired(true).setAutocomplete(true))
      .addStringOption(o => o.setName('prediction').setDescription('home / draw / away').setRequired(true)
        .addChoices({ name: 'Domicile', value: 'home' }, { name: 'Nul', value: 'draw' }, { name: 'Extérieur', value: 'away' }))
      .addIntegerOption(o => o.setName('mise').setDescription('Mise en points').setRequired(true).setMinValue(100).setMaxValue(2000))
  )
  .addSubcommand(sub =>
    sub.setName('score')
      .setDescription('Parier sur le score exact')
      .addStringOption(o => o.setName('match').setDescription('Match').setRequired(true).setAutocomplete(true))
      .addIntegerOption(o => o.setName('score_domicile').setDescription('Buts domicile').setRequired(true).setMinValue(0))
      .addIntegerOption(o => o.setName('score_exterieur').setDescription('Buts extérieur').setRequired(true).setMinValue(0))
      .addIntegerOption(o => o.setName('mise').setDescription('Mise en points').setRequired(true).setMinValue(100).setMaxValue(2000))
  )
  .addSubcommand(sub =>
    sub.setName('buteur')
      .setDescription('Parier sur un buteur')
      .addStringOption(o => o.setName('match').setDescription('Match').setRequired(true).setAutocomplete(true))
      .addStringOption(o => o.setName('joueur').setDescription('Nom du joueur').setRequired(true))
      .addIntegerOption(o => o.setName('mise').setDescription('Mise en points').setRequired(true).setMinValue(100).setMaxValue(2000))
  )
  .addSubcommand(sub =>
    sub.setName('special')
      .setDescription('Parier sur un marché spécial')
      .addStringOption(o => o.setName('match').setDescription('Match').setRequired(true).setAutocomplete(true))
      .addStringOption(o => o.setName('type').setDescription('Type de pari').setRequired(true)
        .addChoices(
          { name: 'Les deux équipes marquent (Oui)', value: 'btts_yes' },
          { name: 'Les deux équipes marquent (Non)', value: 'btts_no' },
          { name: 'Plus de 2.5 buts', value: 'over25' },
          { name: 'Moins de 2.5 buts', value: 'under25' },
          { name: 'Carton rouge (Oui)', value: 'red_yes' },
          { name: 'Carton rouge (Non)', value: 'red_no' },
          { name: 'Prolongations (Oui)', value: 'et_yes' },
          { name: 'Prolongations (Non)', value: 'et_no' },
        ))
      .addIntegerOption(o => o.setName('mise').setDescription('Mise en points').setRequired(true).setMinValue(100).setMaxValue(2000))
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true })

  const user = await getOrCreateUser(interaction.user.id, interaction.user.username, interaction.user.displayAvatarURL())
  if (!user) return interaction.editReply({ embeds: [errorEmbed('Impossible de créer ton profil.')] })

  const sub = interaction.options.getSubcommand()
  const matchId = interaction.options.getString('match', true)
  const stake = interaction.options.getInteger('mise', true)

  const { data: match } = await supabase.from('matches').select('*').eq('id', matchId).single()
  if (!match) return interaction.editReply({ embeds: [errorEmbed('Match introuvable. Utilise `/matchs` pour voir les IDs disponibles.')] })
  if (match.status !== 'upcoming') return interaction.editReply({ embeds: [errorEmbed('Les paris sont fermés pour ce match.')] })

  let opts: any = { userId: user.id, matchId, stake, betType: '' }

  if (sub === 'résultat') {
    opts.betType = 'result'
    opts.predictionResult = interaction.options.getString('prediction', true)
  } else if (sub === 'score') {
    opts.betType = 'exact_score'
    opts.predictionScoreHome = interaction.options.getInteger('score_domicile', true)
    opts.predictionScoreAway = interaction.options.getInteger('score_exterieur', true)
  } else if (sub === 'buteur') {
    opts.betType = 'scorer'
    opts.predictionScorer = interaction.options.getString('joueur', true)
  } else if (sub === 'special') {
    const type = interaction.options.getString('type', true)
    const typeMap: Record<string, { betType: string; predictionBool?: boolean }> = {
      btts_yes: { betType: 'btts', predictionBool: true },
      btts_no:  { betType: 'btts', predictionBool: false },
      over25:   { betType: 'over_under', predictionBool: true },
      under25:  { betType: 'over_under', predictionBool: false },
      red_yes:  { betType: 'red_card', predictionBool: true },
      red_no:   { betType: 'red_card', predictionBool: false },
      et_yes:   { betType: 'extra_time', predictionBool: true },
      et_no:    { betType: 'extra_time', predictionBool: false },
    }
    Object.assign(opts, typeMap[type])
  }

  const result = await placeBet(user, match, opts)
  if (result.error) return interaction.editReply({ embeds: [errorEmbed(result.error)] })

  await interaction.editReply({ embeds: [betConfirmEmbed(result.bet, match, result.pointsIfWon ?? 0)] })
}

export async function autocomplete(interaction: AutocompleteInteraction) {
  const focused = interaction.options.getFocused()
  const choices = await getUpcomingMatchChoices(focused)
  await interaction.respond(choices)
}
