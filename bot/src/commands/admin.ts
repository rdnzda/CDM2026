import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, TextChannel } from 'discord.js'
import { supabase } from '../services/supabase'
import { forcePostMatchResults } from '../services/notifications'

const ADMIN_ID = '574503884987564044'

const KNOCKOUT_PHASES = ['round_of_32', 'round_of_16', 'quarter', 'semi', 'final'] as const

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
      .setDescription('Envoie l\'annonce officielle CDM 2026')
      .addChannelOption(o =>
        o.setName('canal')
          .setDescription('Canal cible (défaut : canal général configuré)')
          .setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub.setName('post-results')
      .setDescription('Force l\'envoi du résultat d\'un match dans le salon résultats')
      .addStringOption(o =>
        o.setName('match-id')
          .setDescription('ID du match (laisse vide pour le dernier match terminé)')
          .setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub.setName('grant-boosts')
      .setDescription('Distribue les boosts d\'une phase éliminatoire à tous les joueurs')
      .addStringOption(o =>
        o.setName('phase')
          .setDescription('Phase cible')
          .setRequired(true)
          .addChoices(
            { name: '32es de finale (×1.25)', value: 'round_of_32' },
            { name: '8es de finale (×1.5)',   value: 'round_of_16' },
            { name: 'Quarts de finale (×2.0)', value: 'quarter'     },
            { name: 'Demi-finales (×2.5)',     value: 'semi'        },
            { name: 'Finale (×3.0)',           value: 'final'       },
          )
      )
  )
  .addSubcommand(sub =>
    sub.setName('announce-knockout')
      .setDescription('Annonce la transition vers la phase à élimination directe')
      .addChannelOption(o =>
        o.setName('canal')
          .setDescription('Canal cible (défaut : canal général configuré)')
          .setRequired(false)
      )
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  if (interaction.user.id !== ADMIN_ID) {
    return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true })
  }

  await interaction.deferReply({ ephemeral: true })

  const sub = interaction.options.getSubcommand()

  if (sub === 'announce') {
    const picked    = interaction.options.getChannel('canal')
    const channelId = picked?.id ?? process.env.DISCORD_GENERAL_CHANNEL_ID
    if (!channelId) return interaction.editReply('❌ Précise un canal ou configure `DISCORD_GENERAL_CHANNEL_ID`.')
    const channel = await interaction.client.channels.fetch(channelId).catch(() => null) as TextChannel | null
    if (!channel) return interaction.editReply('❌ Canal introuvable ou bot sans accès.')

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

    if (!channel.isTextBased()) return interaction.editReply('❌ Ce canal ne supporte pas les messages.')

    try {
      await channel.send({ embeds: [embedMain, embedRules] })
    } catch (err: any) {
      return interaction.editReply(`❌ Impossible d'envoyer dans ce canal : \`${err?.message ?? err}\``)
    }
    return interaction.editReply('✅ Annonce officielle envoyée !')
  }

  if (sub === 'announce-knockout') {
    const picked    = interaction.options.getChannel('canal')
    const channelId = picked?.id ?? process.env.DISCORD_GENERAL_CHANNEL_ID
    if (!channelId) return interaction.editReply('❌ Précise un canal ou configure `DISCORD_GENERAL_CHANNEL_ID`.')
    const channel = await interaction.client.channels.fetch(channelId).catch(() => null) as TextChannel | null
    if (!channel || !channel.isTextBased()) return interaction.editReply('❌ Canal introuvable.')

    const embedMain = new EmbedBuilder()
      .setColor(0xF0B429)
      .setTitle('⚡  Phase à élimination directe — Nouveau système !')
      .setDescription(
        '> À partir de demain, la **phase à élimination directe** de la CDM 2026 commence.\n' +
        '> Le système de paris change complètement. Voici ce qu\'il faut savoir.\n\n' +
        '📊 Les points accumulés pendant la **phase de groupes** vous ont permis de creuser un écart — ' +
        'cet avantage reste intact et comptera jusqu\'au bout de la compétition. ' +
        'Chaque point gagné en groupes pèse dans la course au titre de meilleur pronostiqueur !\n\n' +
        '🌐 **Tableau des éliminatoires** : https://cdm-2026-phi.vercel.app/bracket'
      )
      .addFields(
        {
          name: '💰 Conversion des soldes (÷100)',
          value:
            'Tous les soldes sont divisés par 100 pour coller à la nouvelle échelle :\n' +
            '```\n200 000 pts  →  2 000 pts\n 50 000 pts  →    500 pts\n 10 000 pts  →    100 pts\n```' +
            'Le classement et les écarts restent **strictement identiques** — c\'est juste un changement d\'échelle.',
          inline: false,
        },
        {
          name: '🎯 Prédictions gratuites — plus de mise',
          value:
            'On ne parie plus des points, on en **gagne** en prédisant correctement :\n\n' +
            '🏆 **Vainqueur** — bonne prédiction du résultat → **+200 pts**\n' +
            '🎯 **Score exact** — bonne prédiction du score final → **+300 pts**\n' +
            '⚽ **Buteur** — un joueur marque bien → **+150 pts**\n\n' +
            '_Tu peux prédire les 3 sur le même match et cumuler jusqu\'à **+650 pts** !_',
          inline: false,
        },
        {
          name: '🔥 Ce qui reste actif',
          value:
            '**Boosts ×1.5 et ×2.0** — toujours disponibles, multiplient les points gagnés\n' +
            '(3× boost ×1.5 + 1× boost ×2.0 score exact distribués pour chaque phase)',
          inline: false,
        },
        {
          name: '🎁 Boost de rattrapage — solde < 300 pts',
          value:
            'Les joueurs avec **moins de 300 pts** recevront exceptionnellement un **boost ×1.5 supplémentaire** ' +
            'pour leur permettre de remonter dans la compétition. Personne n\'est encore éliminé !',
          inline: false,
        },
        {
          name: '❌ Ce qui disparaît en éliminatoires',
          value: 'Combinés · Wildcards · Défis 1v1 · Paris spéciaux (BTTS, Over/Under…)',
          inline: false,
        },
      )
      .setFooter({ text: 'Nouvelle saison, nouvelles règles — que le meilleur pronostiqueur gagne ! 🏆' })
      .setTimestamp()

    try {
      await channel.send({ content: '@everyone', embeds: [embedMain] })
    } catch (err: any) {
      return interaction.editReply(`❌ Impossible d'envoyer : \`${err?.message ?? err}\``)
    }
    return interaction.editReply('✅ Annonce phase éliminatoire envoyée !')
  }

  if (sub === 'post-results') {
    const matchId = interaction.options.getString('match-id') ?? undefined
    const result  = await forcePostMatchResults(interaction.client, matchId)
    return interaction.editReply(result)
  }

  if (sub === 'grant-boosts') {
    const phase = interaction.options.getString('phase', true)
    const supabaseUrl = process.env.SUPABASE_URL!
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!

    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/grant-phase-boosts`, {
        method:  'POST',
        headers: {
          Authorization:  `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phase }),
      })
      const data = await res.json() as { granted?: number; skipped?: number; error?: string }
      if (!res.ok) return interaction.editReply(`❌ Erreur : ${data.error ?? 'inconnue'}`)
      return interaction.editReply(
        `✅ Boosts **${phase}** distribués — **${data.granted}** joueurs crédités, ${data.skipped} déjà équipés.`
      )
    } catch (err: any) {
      return interaction.editReply(`❌ Erreur réseau : ${err?.message ?? err}`)
    }
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
