import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, TextChannel } from 'discord.js'
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
  .addSubcommand(sub =>
    sub.setName('announce')
      .setDescription('Envoie l\'annonce officielle CDM 2026 dans le canal général')
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  if (interaction.user.id !== ADMIN_ID) {
    return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true })
  }

  await interaction.deferReply({ ephemeral: true })

  const sub = interaction.options.getSubcommand()

  if (sub === 'announce') {
    const channelId = process.env.DISCORD_GENERAL_CHANNEL_ID
    if (!channelId) return interaction.editReply('❌ `DISCORD_GENERAL_CHANNEL_ID` non configuré.')
    const channel = interaction.client.channels.cache.get(channelId) as TextChannel | undefined
    if (!channel) return interaction.editReply('❌ Canal général introuvable dans le cache.')

    const embedMain = new EmbedBuilder()
      .setColor(0xF0B429)
      .setTitle('🏆  CDM 2026 — Pronostics Officiels')
      .setDescription(
        '> La Coupe du Monde 2026 commence aujourd\'hui ! Rejoignez la compétition de pronostics, grimpez au classement et prouvez que vous êtes le meilleur pronostiqueur ⚽🔥\n\n' +
        '🌐 **Site officiel** : https://cdm-2026-phi.vercel.app'
      )
      .addFields(
        {
          name: '🚀 Démarrer en 30 secondes',
          value:
            '**1.** Rendez-vous sur le site\n' +
            '**2.** Connectez-vous avec votre compte **Discord**\n' +
            '**3.** Récupérez vos **10 000 pts** de départ\n' +
            '**4.** Pariez, combinez, défiez — et grimpez au classement !',
          inline: false,
        },
        {
          name: '💻 Commandes disponibles',
          value:
            '`/paris` — Parier sur un match (résultat, score exact, buteur…)\n' +
            '`/combo` — Créer un combiné 2-10 matchs\n' +
            '`/defi` — Lancer un duel 1v1 contre un ami\n' +
            '`/matchs` — Voir les prochains matchs et leurs cotes\n' +
            '`/classement` — Classement général des joueurs\n' +
            '`/profil` — Vos statistiques personnelles\n' +
            '`/tournoi` — Pronostiquer le vainqueur et le podium\n' +
            '`/award` — Pronostiquer les récompenses individuelles\n' +
            '`/quotidien` — Défi du jour (bonus quotidien)\n' +
            '`/boost` — Activer un boost sur votre prochain pari',
          inline: false,
        },
      )
      .setFooter({ text: 'Connexion via Discord OAuth · Données en temps réel' })
      .setTimestamp()

    const embedRules = new EmbedBuilder()
      .setColor(0x1D4ED8)
      .setTitle('📋 Règles & Système de points')
      .addFields(
        {
          name: '📐 Formule de gain',
          value: '```\nGain = Cote × Mise × Phase × Boost\n```',
          inline: false,
        },
        {
          name: '🌍 Multiplicateurs de phase',
          value:
            '`Phase de groupes` → **×1.0**\n' +
            '`Huitièmes de finale` → **×1.5**\n' +
            '`Quarts de finale` → **×2.0**\n' +
            '`Demi-finales` → **×2.5**\n' +
            '`Finale` → **×3.0**',
          inline: true,
        },
        {
          name: '💰 Limites de mise',
          value:
            'Minimum : **100 pts**\n' +
            'Simple : max **2 000 pts**\n' +
            'Combiné : max **1 000 pts**\n' +
            'Duel 1v1 : max **20 %** du solde\n' +
            'Capital de départ : **10 000 pts**',
          inline: true,
        },
        {
          name: '⚡ Wildcards — 3 par compétition',
          value:
            '**×2 Double** — Multiplie vos gains par 2\n' +
            '**Assurance** — Remboursé si score exact raté d\'1 but\n' +
            '**Dernière Minute** — Pariez jusqu\'à la 10ᵉ minute de jeu',
          inline: false,
        },
        {
          name: '🔥 Boosts — rechargés à chaque phase',
          value:
            '3× **Boost ×1.5** disponibles par phase\n' +
            '1× **Boost ×2.0 Score exact** disponible par phase',
          inline: false,
        },
      )
      .setFooter({ text: 'Les paris se ferment au coup d\'envoi de chaque match · Bonne chance à tous ! 🍀' })

    await channel.send({ embeds: [embedMain, embedRules] })
    return interaction.editReply('✅ Annonce officielle envoyée dans le canal général !')
  }

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
