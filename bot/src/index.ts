import 'dotenv/config'
import { Client, GatewayIntentBits, Collection, REST, Routes } from 'discord.js'

// Commands
import * as paris      from './commands/paris'
import * as combo      from './commands/combo'
import * as defi       from './commands/defi'
import * as tournoi    from './commands/tournoi'
import * as award      from './commands/award'
import * as classement from './commands/classement'
import * as profil     from './commands/profil'
import * as matchs     from './commands/matchs'
import * as boost      from './commands/boost'
import * as quotidien  from './commands/quotidien'
import * as admin      from './commands/admin'

const commands = [paris, combo, defi, tournoi, award, classement, profil, matchs, boost, quotidien, admin]

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

const commandCollection = new Collection<string, any>()
for (const cmd of commands) commandCollection.set(cmd.data.name, cmd)

client.once('ready', () => {
  console.log(`✅ Bot connecté en tant que ${client.user?.tag}`)
})

client.on('interactionCreate', async interaction => {
  if (interaction.isAutocomplete()) {
    const cmd = commandCollection.get(interaction.commandName)
    if (cmd?.autocomplete) {
      try { await cmd.autocomplete(interaction) } catch {}
    }
    return
  }

  if (!interaction.isChatInputCommand()) return
  const cmd = commandCollection.get(interaction.commandName)
  if (!cmd) return
  try {
    await cmd.execute(interaction)
  } catch (err) {
    console.error(`Erreur dans /${interaction.commandName}:`, err)
    const msg = { content: '❌ Une erreur est survenue.', ephemeral: true }
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg)
    } else {
      await interaction.reply(msg)
    }
  }
})

// Deploy slash commands
async function deployCommands() {
  const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN!)
  const body = commands.map(c => c.data.toJSON())
  console.log('📡 Déploiement des slash commands...')
  await rest.put(
    Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID!, process.env.DISCORD_GUILD_ID!),
    { body }
  )
  console.log('✅ Slash commands déployées.')
}

deployCommands()
  .then(() => client.login(process.env.DISCORD_BOT_TOKEN!))
  .catch(console.error)
