import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import { supabase } from '../services/supabase'
import { errorEmbed } from '../utils/embeds'
import { getOrCreateUser, checkBalance } from '../utils/validators'
import { EmbedBuilder, Colors } from 'discord.js'
import { formatPoints } from '../utils/formatters'

export const data = new SlashCommandBuilder()
  .setName('defi')
  .setDescription('Défis 1v1')
  .addSubcommand(s =>
    s.setName('lancer')
      .setDescription('Lancer un défi 1v1')
      .addUserOption(o => o.setName('adversaire').setDescription('Ton adversaire').setRequired(true))
      .addIntegerOption(o => o.setName('mise').setDescription('Mise (max 20% du solde)').setRequired(true).setMinValue(100))
  )
  .addSubcommand(s =>
    s.setName('accepter')
      .setDescription('Accepter un défi')
      .addStringOption(o => o.setName('id').setDescription('ID du défi').setRequired(true))
  )
  .addSubcommand(s =>
    s.setName('refuser')
      .setDescription('Refuser un défi')
      .addStringOption(o => o.setName('id').setDescription('ID du défi').setRequired(true))
  )
  .addSubcommand(s => s.setName('liste').setDescription('Voir tes défis en cours'))

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true })
  const sub = interaction.options.getSubcommand()
  const user = await getOrCreateUser(interaction.user.id, interaction.user.username)
  if (!user) return interaction.editReply({ embeds: [errorEmbed('Profil introuvable.')] })

  if (sub === 'lancer') {
    const target = interaction.options.getUser('adversaire', true)
    const stake = interaction.options.getInteger('mise', true)
    const maxStake = Math.floor((user.total_points - user.frozen_points) * 0.2)
    if (stake > maxStake) return interaction.editReply({ embeds: [errorEmbed(`Mise max : ${formatPoints(maxStake)} (20% du solde disponible).`)] })
    const balErr = checkBalance(user, stake)
    if (balErr) return interaction.editReply({ embeds: [errorEmbed(balErr)] })

    const opponent = await getOrCreateUser(target.id, target.username)
    if (!opponent) return interaction.editReply({ embeds: [errorEmbed('Adversaire introuvable.')] })

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    const { data: challenge } = await supabase.from('challenges').insert({
      challenger_id: user.id,
      opponent_id: opponent.id,
      stake,
      expires_at: expiresAt,
    }).select().single()

    await supabase.from('users').update({ frozen_points: user.frozen_points + stake }).eq('id', user.id)

    try {
      const dmUser = await interaction.client.users.fetch(target.id)
      await dmUser.send(`⚔️ **${interaction.user.username}** te défie en 1v1 !\nMise : **${formatPoints(stake)}**\nID : \`${challenge?.id}\`\nUtilise \`/defi accepter ${challenge?.id}\` (valable 1h)`)
    } catch {}

    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(Colors.Orange).setTitle('⚔️ Défi lancé !').setDescription(`Défi envoyé à **${target.username}**. Il a 1h pour accepter.`)] })
  }

  if (sub === 'accepter') {
    const id = interaction.options.getString('id', true)
    const { data: challenge } = await supabase.from('challenges').select('*, users!challenges_opponent_id_fkey(*)').eq('id', id).eq('opponent_id', user.id).eq('status', 'pending').single()
    if (!challenge) return interaction.editReply({ embeds: [errorEmbed('Défi introuvable ou expiré.')] })
    if (new Date(challenge.expires_at) < new Date()) {
      await supabase.from('challenges').update({ status: 'expired' }).eq('id', id)
      return interaction.editReply({ embeds: [errorEmbed('Ce défi a expiré.')] })
    }
    const balErr = checkBalance(user, challenge.stake)
    if (balErr) return interaction.editReply({ embeds: [errorEmbed(balErr)] })

    await supabase.from('challenges').update({ status: 'accepted' }).eq('id', id)
    await supabase.from('users').update({ frozen_points: user.frozen_points + challenge.stake }).eq('id', user.id)

    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(Colors.Green).setTitle('✅ Défi accepté !').setDescription(`Mise gelée : ${formatPoints(challenge.stake)}`)] })
  }

  if (sub === 'refuser') {
    const id = interaction.options.getString('id', true)
    const { data: challenge } = await supabase.from('challenges').select('*').eq('id', id).eq('opponent_id', user.id).eq('status', 'pending').single()
    if (!challenge) return interaction.editReply({ embeds: [errorEmbed('Défi introuvable.')] })

    await supabase.from('challenges').update({ status: 'refused' }).eq('id', id)
    // Unfreeze challenger's stake
    const { data: challenger } = await supabase.from('users').select('*').eq('id', challenge.challenger_id).single()
    if (challenger) await supabase.from('users').update({ frozen_points: Math.max(0, challenger.frozen_points - challenge.stake) }).eq('id', challenge.challenger_id)

    return interaction.editReply('Défi refusé.')
  }

  if (sub === 'liste') {
    const { data: challenges } = await supabase
      .from('challenges')
      .select('*, challenger:users!challenges_challenger_id_fkey(username), opponent:users!challenges_opponent_id_fkey(username)')
      .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false })
      .limit(5)

    if (!challenges?.length) return interaction.editReply('Aucun défi actif.')
    const lines = challenges.map((c: any) => `• ${(c.challenger as any).username} vs ${(c.opponent as any).username} — ${formatPoints(c.stake)} — ${c.status}`)
    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(Colors.Blue).setTitle('⚔️ Tes défis').setDescription(lines.join('\n'))] })
  }
}
