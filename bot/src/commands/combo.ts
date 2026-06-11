import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction } from 'discord.js'
import { supabase } from '../services/supabase'
import { errorEmbed } from '../utils/embeds'
import { getOrCreateUser, checkBalance, getUpcomingMatchChoices } from '../utils/validators'
import { EmbedBuilder, Colors } from 'discord.js'
import { formatPoints, formatOdds, formatMatch } from '../utils/formatters'

export const data = new SlashCommandBuilder()
  .setName('combo')
  .setDescription('Gérer tes combinés')
  .addSubcommand(s => s.setName('créer').setDescription('Démarrer un nouveau combiné'))
  .addSubcommand(s =>
    s.setName('ajouter')
      .setDescription('Ajouter une sélection au combiné en cours')
      .addStringOption(o => o.setName('match').setDescription('Match').setRequired(true).setAutocomplete(true))
      .addStringOption(o => o.setName('type').setDescription('Type de pari').setRequired(true)
        .addChoices(
          { name: 'Résultat', value: 'result' },
          { name: 'Score exact', value: 'exact_score' },
          { name: 'BTTS Oui', value: 'btts_yes' },
          { name: 'BTTS Non', value: 'btts_no' },
          { name: 'Over 2.5', value: 'over25' },
          { name: 'Under 2.5', value: 'under25' },
        ))
      .addStringOption(o => o.setName('prediction').setDescription('Prédiction (home/draw/away ou score 1-0)').setRequired(true))
  )
  .addSubcommand(s =>
    s.setName('confirmer')
      .setDescription('Confirmer et placer le combiné')
      .addIntegerOption(o => o.setName('mise').setDescription('Mise en points').setRequired(true).setMinValue(100).setMaxValue(1000))
  )
  .addSubcommand(s => s.setName('annuler').setDescription('Annuler le combiné en cours'))
  .addSubcommand(s => s.setName('liste').setDescription('Voir tes combinés actifs'))

// In-memory draft store (keyed by discord user ID)
const drafts = new Map<string, { legs: any[] }>()

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true })
  const sub = interaction.options.getSubcommand()
  const user = await getOrCreateUser(interaction.user.id, interaction.user.username)
  if (!user) return interaction.editReply({ embeds: [errorEmbed('Profil introuvable.')] })

  if (sub === 'créer') {
    drafts.set(interaction.user.id, { legs: [] })
    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(Colors.Green).setTitle('✅ Combiné démarré').setDescription('Utilise `/combo ajouter` pour ajouter des sélections (2–10 matchs différents).')] })
  }

  if (sub === 'annuler') {
    drafts.delete(interaction.user.id)
    return interaction.editReply('Combiné annulé.')
  }

  if (sub === 'ajouter') {
    const draft = drafts.get(interaction.user.id)
    if (!draft) return interaction.editReply({ embeds: [errorEmbed('Aucun combiné en cours. Utilise `/combo créer`.') ]})
    if (draft.legs.length >= 10) return interaction.editReply({ embeds: [errorEmbed('Maximum 10 sélections par combiné.')] })

    const matchId = interaction.options.getString('match', true)
    if (draft.legs.some(l => l.match_id === matchId))
      return interaction.editReply({ embeds: [errorEmbed('Tu as déjà une sélection sur ce match.')] })

    const { data: match } = await supabase.from('matches').select('*').eq('id', matchId).single()
    if (!match) return interaction.editReply({ embeds: [errorEmbed('Match introuvable.')] })

    const type = interaction.options.getString('type', true)
    const prediction = interaction.options.getString('prediction', true)

    // Determine odds
    const oddsMap: Record<string, number | null> = {
      result_home: match.odds_home, result_draw: match.odds_draw, result_away: match.odds_away,
      btts_yes: match.odds_btts_yes, btts_no: match.odds_btts_no,
      over25: match.odds_over25, under25: match.odds_under25,
    }
    const oddsKey = type.startsWith('result') ? `result_${prediction}` : type
    const odds = oddsMap[oddsKey] ?? 0
    if (!odds) return interaction.editReply({ embeds: [errorEmbed('Cote non disponible.')] })

    draft.legs.push({ match_id: matchId, match_label: formatMatch(match), bet_type: type.replace('_yes','').replace('_no','').replace('over25','over_under').replace('under25','over_under'), odds_at_bet_time: odds, phase_multiplier: match.phase_multiplier })
    const totalOdds = draft.legs.reduce((acc, l) => acc * l.odds_at_bet_time, 1)

    return interaction.editReply({ embeds: [
      new EmbedBuilder().setColor(Colors.Blue)
        .setTitle(`✅ Sélection ajoutée (${draft.legs.length}/10)`)
        .setDescription(draft.legs.map(l => `• ${l.match_label} — ${formatOdds(l.odds_at_bet_time)}`).join('\n'))
        .addFields({ name: 'Cote totale', value: formatOdds(totalOdds), inline: true })
    ]})
  }

  if (sub === 'confirmer') {
    const draft = drafts.get(interaction.user.id)
    if (!draft || draft.legs.length < 2) return interaction.editReply({ embeds: [errorEmbed('Minimum 2 sélections requises.')] })

    const stake = interaction.options.getInteger('mise', true)
    const balErr = checkBalance(user, stake)
    if (balErr) return interaction.editReply({ embeds: [errorEmbed(balErr)] })

    const totalOdds = draft.legs.reduce((acc, l) => acc * l.odds_at_bet_time, 1)
    const potentialWin = Math.round(totalOdds * stake)

    const { data: combo, error } = await supabase.from('combos').insert({
      user_id: user.id, total_odds: totalOdds, stake, potential_win: potentialWin, legs_count: draft.legs.length,
    }).select().single()

    if (error || !combo) return interaction.editReply({ embeds: [errorEmbed('Erreur lors de la création du combiné.')] })

    await supabase.from('combo_legs').insert(draft.legs.map(l => ({ ...l, combo_id: combo.id })))
    await supabase.from('users').update({ frozen_points: user.frozen_points + stake }).eq('id', user.id)
    drafts.delete(interaction.user.id)

    return interaction.editReply({ embeds: [
      new EmbedBuilder().setColor(Colors.Green)
        .setTitle('🎰 Combiné confirmé !')
        .addFields(
          { name: 'Sélections', value: `${draft.legs.length}`, inline: true },
          { name: 'Cote totale', value: formatOdds(totalOdds), inline: true },
          { name: 'Mise', value: formatPoints(stake), inline: true },
          { name: 'Gain potentiel', value: formatPoints(potentialWin), inline: true },
        )
    ]})
  }

  if (sub === 'liste') {
    const { data: combos } = await supabase.from('combos').select('*, combo_legs(*)').eq('user_id', user.id).eq('status', 'pending').order('created_at', { ascending: false }).limit(5)
    if (!combos?.length) return interaction.editReply('Aucun combiné actif.')
    const lines = combos.map(c => `• ${c.legs_count} sélections — Cote: ${formatOdds(c.total_odds)} — Mise: ${formatPoints(c.stake)} — Potentiel: ${formatPoints(c.potential_win)}`)
    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(Colors.Blue).setTitle('🎰 Tes combinés actifs').setDescription(lines.join('\n'))] })
  }
}

export async function autocomplete(interaction: AutocompleteInteraction) {
  const focused = interaction.options.getFocused()
  const choices = await getUpcomingMatchChoices(focused)
  await interaction.respond(choices)
}
