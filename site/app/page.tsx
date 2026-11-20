import { createClient } from '@/lib/supabase/server'
import { Calendar, Shuffle, Swords, Sun } from 'lucide-react'
import { FixtureRow, matchStatus } from '@/components/FixtureRow'

export default async function HomePage() {
  const supabase = await createClient()

  const [{ data: top10 }, { count: userCount }, { data: matches }] = await Promise.all([
    supabase.from('leaderboard_points').select('*').limit(10),
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('matches').select('*')
      .in('status', ['upcoming', 'live', 'finished'])
      .order('kickoff_at', { ascending: true }),
  ])

  const now      = new Date()
  const start    = new Date('2026-06-11T18:00:00Z')
  const end      = new Date('2026-07-19T19:00:00Z')
  const live     = now >= start && now < end
  const over     = now >= end
  const diffMs   = start.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  const diffHrs  = Math.floor((diffMs % 86400000) / 3600000)

  // L'affiche du moment : matchs en direct, sinon les prochains, sinon les derniers résultats
  const all      = matches ?? []
  const liveNow  = all.filter((m: any) => m.status === 'live')
  const upcoming = all.filter((m: any) => m.status === 'upcoming' && new Date(m.kickoff_at) > now)
  const finished = all.filter((m: any) => m.status === 'finished').reverse()
  const ahead    = [...liveNow, ...upcoming].slice(0, 5)
  const [boardTitle, board] = ahead.length
    ? [liveNow.length ? 'À l’affiche' : 'Prochains matchs', ahead]
    : ['Derniers résultats', finished.slice(0, 5)]

  const MODES = [
    { href: '/matchs',    Icon: Calendar, title: 'Matchs',         text: 'Paris simples sur tous les matchs du tournoi.', cta: 'Parier' },
    { href: '/combos',    Icon: Shuffle,  title: 'Combinés',       text: 'Assemble de 2 à 10 matchs dans un seul pari.',  cta: 'Créer un combiné' },
    { href: '/1v1',       Icon: Swords,   title: 'Duels 1v1',      text: 'Affronte un autre joueur en tête-à-tête.',      cta: 'Défier un joueur' },
    { href: '/quotidien', Icon: Sun,      title: 'Défi quotidien', text: 'Un nouveau défi chaque matin à 10h.',           cta: 'Participer' },
  ]

  return (
    <div className="space-y-12">

      {/* ── HERO : l'identité CDM 2026 + l'affiche du moment ── */}
      <section className="animate-fade-up" aria-labelledby="hero-title">
        <div
          className="rounded-lg overflow-hidden grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
          style={{ backgroundColor: 'var(--bg-2)', border: '1px solid var(--border)', borderLeft: '2px solid var(--gold)' }}
        >
          {/* Identité */}
          <div className="bg-stripes px-6 py-9 sm:px-10 sm:py-12 flex flex-col">
            {live ? (
              <span className="self-start inline-flex items-center gap-2 text-sm font-semibold px-3 py-1 rounded-full"
                style={{ background: 'rgba(34,197,94,.1)', color: 'var(--green)', border: '1px solid rgba(34,197,94,.3)' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--green)' }} aria-hidden="true" />
                Tournoi en cours
              </span>
            ) : over ? (
              <span className="self-start text-sm font-semibold px-3 py-1 rounded-full"
                style={{ background: 'var(--bg-3)', color: 'var(--muted)', border: '1px solid var(--border-2)' }}>
                Tournoi terminé
              </span>
            ) : (
              <span className="self-start text-sm font-semibold px-3 py-1 rounded-full"
                style={{ background: 'var(--gold-dim)', color: 'var(--gold)', border: '1px solid rgba(240,180,41,.3)' }}>
                {diffMs > 0 ? `Coup d’envoi dans ${diffDays} j ${diffHrs} h` : 'Coupe du Monde 2026'}
              </span>
            )}

            <h1 id="hero-title" className="font-display leading-[0.86] mt-6" style={{ fontSize: 'clamp(5rem, 12vw, 8rem)' }}>
              <span style={{ color: 'var(--gold)' }}>CDM</span>
              <br />
              <span style={{ color: 'var(--text)' }}>2026</span>
            </h1>

            <p className="mt-6 text-base sm:text-lg leading-relaxed max-w-[38ch]" style={{ color: 'var(--text)' }}>
              Pronostique la Coupe du Monde du 11 juin au 19 juillet&nbsp;: paris simples, combinés, duels 1v1 et défis quotidiens.
            </p>
            <p className="mt-2 text-sm leading-relaxed max-w-[44ch]" style={{ color: 'var(--muted)' }}>
              Tu démarres avec 10&nbsp;000 points virtuels. Aucun argent réel n’est en jeu.
            </p>

            <div className="flex flex-wrap gap-3 mt-8">
              <a href="/matchs" className="btn-gold">Voir les matchs</a>
              <a href="/api/auth/login" className="btn-discord">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                </svg>
                Se connecter avec Discord
              </a>
            </div>
          </div>

          {/* L'affiche */}
          <div className="flex flex-col border-t lg:border-t-0 lg:border-l" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
            <div className="flex items-baseline justify-between gap-4 px-4 sm:px-5 pt-5 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="font-display text-3xl leading-none" style={{ color: 'var(--text)' }}>{boardTitle}</h2>
              <a href="/matchs" className="text-sm font-semibold underline underline-offset-4 decoration-1" style={{ color: 'var(--gold)' }}>Tous les matchs</a>
            </div>
            {board.length ? (
              <ul>
                {board.map((m: any, i: number) => (
                  <FixtureRow key={m.id} match={m} status={matchStatus(m)} showDate compact last={i === board.length - 1} />
                ))}
              </ul>
            ) : (
              <div className="px-5 py-10 text-sm" style={{ color: 'var(--muted)' }}>
                <p className="font-semibold" style={{ color: 'var(--text)' }}>Aucun match programmé pour l’instant.</p>
                <p className="mt-1">Le calendrier se met à jour automatiquement toutes les 6 heures.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── MODES DE JEU ── */}
      <section aria-labelledby="modes-title">
        <h2 id="modes-title" className="font-display text-4xl leading-none mb-4" style={{ color: 'var(--text)' }}>Modes de jeu</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--bg-2)', gap: 1 }}>
          {MODES.map(({ href, Icon, title, text, cta }) => (
            <li key={href} style={{ outline: '1px solid var(--border)' }}>
              <a href={href} className="hover-bg-3 flex gap-4 p-5 h-full">
                <Icon className="w-5 h-5 mt-1 shrink-0" style={{ color: 'var(--gold)' }} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block font-display text-2xl leading-none" style={{ color: 'var(--text)' }}>{title}</span>
                  <span className="block mt-1.5 text-sm" style={{ color: 'var(--muted)' }}>{text}</span>
                  <span className="block mt-3 text-sm font-semibold" style={{ color: 'var(--gold)' }}>{cta}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* ── CLASSEMENT ── */}
      <section aria-labelledby="classement-title">
        <div className="flex items-baseline justify-between gap-4 mb-4">
          <h2 id="classement-title" className="font-display text-4xl leading-none" style={{ color: 'var(--text)' }}>Classement</h2>
          <a href="/classement" className="text-sm font-semibold underline underline-offset-4 decoration-1" style={{ color: 'var(--gold)' }}>
            {userCount ? `Voir les ${userCount} joueurs` : 'Voir le classement'}
          </a>
        </div>

        {top10?.length ? (
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--bg-2)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold" style={{ color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                  <th scope="col" className="pl-4 sm:pl-5 pr-2 py-2.5 w-12">Rang</th>
                  <th scope="col" className="px-2 py-2.5">Joueur</th>
                  <th scope="col" className="hidden sm:table-cell px-3 py-2.5 text-right">Paris</th>
                  <th scope="col" className="hidden sm:table-cell px-3 py-2.5 text-right">Réussite</th>
                  <th scope="col" className="pl-2 pr-4 sm:pr-5 py-2.5 text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {top10.map((row: any, i: number) => {
                  const medal = i === 0 ? '#F0B429' : i === 1 ? '#94A3B8' : i === 2 ? '#B08856' : null
                  return (
                    <tr key={row.id} className="hover-bg-3" style={{ borderBottom: i < top10.length - 1 ? '1px solid var(--border)' : undefined }}>
                      <td className="pl-4 sm:pl-5 pr-2 py-2.5">
                        <span className="font-display text-2xl leading-none tabular" style={{ color: medal ?? 'var(--muted)' }}>{i + 1}</span>
                      </td>
                      <td className="px-2 py-2.5">
                        <a href={`/profil/${row.username}`} className="inline-flex items-center gap-3 min-w-0 hover:underline underline-offset-4">
                          {row.avatar_url ? (
                            <img src={row.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0"
                              style={{ outline: medal ? `2px solid ${medal}` : '1px solid var(--border-2)', outlineOffset: '1px' }} />
                          ) : (
                            <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                              style={{ background: 'var(--bg-3)', color: medal ?? 'var(--muted)', border: `1px solid ${medal ?? 'var(--border-2)'}` }}>
                              {row.username?.[0]?.toUpperCase()}
                            </span>
                          )}
                          <span className="font-semibold text-[15px] truncate" style={{ color: 'var(--text)' }}>{row.username}</span>
                        </a>
                      </td>
                      <td className="hidden sm:table-cell px-3 py-2.5 text-right tabular" style={{ color: 'var(--muted)' }}>{row.total_bets}</td>
                      <td className="hidden sm:table-cell px-3 py-2.5 text-right tabular" style={{ color: 'var(--muted)' }}>{row.winrate}&nbsp;%</td>
                      <td className="pl-2 pr-4 sm:pr-5 py-2.5 text-right whitespace-nowrap">
                        <span className="font-semibold text-[15px] tabular" style={{ color: i === 0 ? 'var(--gold)' : 'var(--text)' }}>
                          {Number(row.total_points).toLocaleString('fr-FR')}
                        </span>
                        <span className="ml-1 text-xs" style={{ color: 'var(--muted)' }}>pts</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg py-12 px-6 text-center" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
            <p className="font-semibold" style={{ color: 'var(--text)' }}>Aucun joueur encore. Sois le premier.</p>
            <p className="mt-1 mb-5 text-sm" style={{ color: 'var(--muted)' }}>Connecte-toi avec Discord pour recevoir tes 10&nbsp;000 points et placer ton premier pari.</p>
            <a href="/api/auth/login" className="btn-discord">Se connecter avec Discord</a>
          </div>
        )}
      </section>
    </div>
  )
}
