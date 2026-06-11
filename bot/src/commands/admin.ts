import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import { supabase } from '../services/supabase'

const ADMIN_ID = '574503884987564044'

export const data = new SlashCommandBuilder()
  .setName('admin')
  .setDescription('Commandes admin')
  .addSubcommand(sub =>
    sub.setName('reset-user')
      .setDescription('Remet un utilisateur à zéro (points, paris, boosts)')
      .addUserOption(o => o.setName('utilisateur').setDescription('Utilisateur à reset').setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName('set-points')
      .setDescription('Définit les points d\'un utilisateur')
      .addUserOption(o => o.setName('utilisateur').setDescription('Utilisateur').setRequired(true))
      .addIntegerOption(o => o.setName('points').setDescription('Nouveau solde').setRequired(true).setMinValue(0))
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  if (interaction.user.id !== ADMIN_ID) {
    return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true })
  }

  await interaction.deferReply({ ephemeral: true })

  const sub        = interaction.options.getSubcommand()
  const targetUser = interaction.options.getUser('utilisateur', true)

  const { data: user } = await supabase
    .from('users')
    .select('id, total_points')
    .eq('discord_id', targetUser.id)
    .single()

  if (!user) return interaction.editReply('❌ Utilisateur introuvable en base.')

  if (sub === 'reset-user') {
    await supabase.from('bets').delete().eq('user_id', user.id)
    const { data: combos } = await supabase.from('combos').select('id').eq('user_id', user.id)
    if (combos?.length) {
      const comboIds = combos.map(c => c.id)
      await supabase.from('combo_legs').delete().in('combo_id', comboIds)
    }
    await supabase.from('combos').delete().eq('user_id', user.id)
    await supabase.from('user_boosts').delete().eq('user_id', user.id)
    await supabase.from('user_wildcards').delete().eq('user_id', user.id)

    // Re-seed wildcards and boosts
    await supabase.from('user_wildcards').insert([
      { user_id: user.id, wildcard_type: 'double' },
      { user_id: user.id, wildcard_type: 'insurance' },
      { user_id: user.id, wildcard_type: 'last_minute' },
    ])
    await supabase.from('user_boosts').insert([
      { user_id: user.id, boost_type: 'x15', phase: 'group' },
      { user_id: user.id, boost_type: 'x15', phase: 'group' },
      { user_id: user.id, boost_type: 'x15', phase: 'group' },
      { user_id: user.id, boost_type: 'x20_exact', phase: 'group' },
    ])

    await supabase.from('users').update({
      total_points:  10000,
      frozen_points: 0,
      bets_won:      0,
      total_bets:    0,
      total_combos:  0,
      combos_won:    0,
      duels_won:     0,
      duels_lost:    0,
      duels_streak:  0,
    }).eq('id', user.id)

    return interaction.editReply(`✅ **${targetUser.username}** remis à zéro — 10 000 pts, paris supprimés, wildcards et boosts réinitialisés.`)
  }

  if (sub === 'set-points') {
    const points = interaction.options.getInteger('points', true)
    await supabase.from('users').update({
      total_points:  points,
      frozen_points: 0,
    }).eq('id', user.id)
    return interaction.editReply(`✅ **${targetUser.username}** : solde défini à **${points.toLocaleString()} pts**.`)
  }
}
