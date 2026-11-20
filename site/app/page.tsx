import { createClient } from '@/lib/supabase/server'
import { ArrowRight } from 'lucide-react'

export default async function HomePage() {
  const supabase = await createClient()

  const [{ data: top10 }, { count: userCount }] = await Promise.all([
    supabase.from('leaderboard_points').select('*').limit(10),
    supabase.from('users').select('id', { count: 'exact', head: true }),
  ])

  const now      = new Date()
  const start    = new Date('2026-06-11T18:00:00Z')
  const end      = new Date('2026-07-19T19:00:00Z')
  const live     = now >= start && now < end
  const over     = now >= end
  const diffMs   = start.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  const diffHrs  = Math.floor((diffMs % 86400000) / 3600000)
  const diffMins = Math.floor((diffMs % 3600000) / 60000)

  const PROGRAMME = [
    { n: '01', href: '/matchs',    title: 'Matchs',         text: 'Paris simples sur tous les matchs du tournoi', cta: 'Parier maintenant' },
    { n: '02', href: '/combos',    title: 'Combinés',       text: 'Multi-sélection 2-10 matchs',                  cta: 'Voir'          },
    { n: '03', href: '/1v1',       title: 'Duels 1v1',      text: 'Défis en tête-à-tête',                          cta: 'Voir'              },
    { n: '04', href: '/quotidien', title: 'Défi quotidien', text: 'Un nouveau défi chaque matin à 10h',            cta: 'Participer'        },
  ]

  return (
    <div className="space-y-14">

      {/* ── COUVERTURE ── programme de match */}
      <section className="animate-fade-up" aria-labelledby="hero-title">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pb-3 text-sm font-semibold" style={{ borderBottom: '1px solid var(--border-2)' }}>
          <span style={{ color: 'var(--muted)' }}>Coupe du Monde 2026 · Canada · Mexique · États-Unis</span>
          {live ? (
            <span className="inline-flex items-center gap-2 font-display text-base px-2 py-0.5" style={{ background: 'var(--host-red)', color: '#fff', borderRadius: 2 }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#fff' }} aria-hidden="true" />
              Tournoi en cours
            </span>
          ) : over ? (
            <span className="font-display text-base px-2 py-0.5" style={{ border: '1px solid var(--border-2)', color: 'var(--muted)', borderRadius: 2 }}>
              Tournoi terminé
            </span>
          ) : (
            <span className="font-display text-base px-2 py-0.5" style={{ background: 'var(--gold)', color: '#111311', borderRadius: 2 }}>
              FIFA World Cup 2026
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 lg:gap-12 pt-6 lg:pt-8">
          <div className="min-w-0">
            <h1 id="hero-title" className="font-display leading-[0.82]" style={{ fontSize: 'clamp(5rem, 25vw, 11.5rem)', color: 'var(--text)' }}>
              CDM <span style={{ color: 'var(--gold)' }}>2026</span>
            </h1>
            <p className="mt-5 text-lg sm:text-xl leading-snug max-w-[34ch]" style={{ color: 'var(--text)' }}>
              Paris simples, combinés, duels 1v1 et défis quotidiens. 11 juin au 19 juillet.
            </p>
            <p className="mt-3 text-sm font-semibold inline-flex items-center gap-2" style={{ color: 'var(--muted)' }}>
              <span className="inline-block w-3 h-3" style={{ background: 'var(--host-green)' }} aria-hidden="true" />
              Points virtuels uniquement, aucun argent réel.
            </p>
            <div className="flex flex-wrap gap-3 mt-7">
              <a href="/matchs" className="btn-primary">
                Voir les matchs
                <ArrowRight className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
              </a>
              <a href="/api/auth/login" className="btn-ghost">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                </svg>
                Se connecter avec Discord
              </a>
            </div>
          </div>

          {/* Tableau d'affichage */}
          <aside aria-label="Infos tournoi" className="self-start" style={{ background: '#0A0B0A', border: '1px solid var(--border-2)', borderRadius: 2 }}>
            {!live && !over && diffMs > 0 ? (
              <div className="p-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <p className="text-sm font-semibold mb-2" style={{ color: 'var(--muted)' }}>Coup d’envoi dans</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { n: diffDays, l: 'jours' },
                    { n: diffHrs,  l: 'heures' },
                    { n: diffMins, l: 'min' },
                  ].map(({ n, l }) => (
                    <div key={l} className="text-center py-2" style={{ background: 'var(--bg-2)', borderRadius: 2 }}>
                      <span className="block font-display text-5xl leading-none tabular" style={{ color: 'var(--gold)' }}>
                        {String(n).padStart(2, '0')}
                      </span>
                      <span className="block text-xs mt-1" style={{ color: 'var(--muted)' }}>{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <dl className="text-sm">
              {[
                { k: 'Match d’ouverture', v: '11 juin' },
                { k: 'Finale',            v: '19 juillet' },
                { k: 'Capital de départ', v: '10 000 pts' },
                ...(userCount ? [{ k: 'Joueurs inscrits', v: String(userCount) }] : []),
              ].map((r, i, arr) => (
                <div key={r.k} className="flex items-baseline justify-between gap-4 px-4 py-2.5" style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : undefined }}>
                  <dt style={{ color: 'var(--muted)' }}>{r.k}</dt>
                  <dd className="font-display text-xl leading-none tabular" style={{ color: 'var(--text)' }}>{r.v}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      </section>

      {/* ── AU PROGRAMME ── */}
      <section aria-labelledby="programme-title">
        <div className="section-head mb-4">
          <h2 id="programme-title" className="font-display text-3xl sm:text-4xl leading-none">Au programme</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ borderTop: '1px solid var(--border-2)', borderLeft: '1px solid var(--border-2)' }}>
          {PROGRAMME.map(item => (
            <a
              key={item.href}
              href={item.href}
              className="hover-bg-3 group flex gap-4 p-5 sm:p-6"
              style={{ borderRight: '1px solid var(--border-2)', borderBottom: '1px solid var(--border-2)' }}
            >
              <span className="font-display text-4xl sm:text-5xl leading-none tabular shrink-0" style={{ color: 'var(--gold)' }}>{item.n}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-2xl sm:text-3xl leading-none" style={{ color: 'var(--text)' }}>{item.title}</span>
                <span className="block mt-1.5 text-[15px]" style={{ color: 'var(--muted)' }}>{item.text}</span>
                <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold underline-offset-4 group-hover:underline" style={{ color: 'var(--text)' }}>
                  {item.cta}
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} aria-hidden="true" />
                </span>
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* ── CLASSEMENT ── */}
      <section aria-labelledby="classement-title">
        <div className="section-head mb-4 justify-between">
          <div className="flex items-baseline gap-3">
            <h2 id="classement-title" className="font-display text-3xl sm:text-4xl leading-none">Classement</h2>
            {userCount ? (
              <span className="text-sm" style={{ color: 'var(--muted)' }}>{userCount} joueurs</span>
            ) : null}
          </div>
          <a href="/classement" className="inline-flex items-center gap-1 text-sm font-bold underline underline-offset-4" style={{ color: 'var(--text)' }}>
            Tout voir <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden="true" />
          </a>
        </div>

        {top10?.length ? (
          <ol style={{ borderTop: '1px solid var(--border-2)' }}>
            {top10.map((row: any, i: number) => {
              const medal = i === 0 ? '#F4C430' : i === 1 ? '#C9CDD3' : i === 2 ? '#C08A57' : null
              return (
                <li key={row.id}>
                  <a
                    href={`/profil/${row.username}`}
                    className="hover-bg-3 grid grid-cols-[2.5rem_2rem_1fr_auto] sm:grid-cols-[3rem_2.25rem_1fr_6rem_7rem] items-center gap-3 sm:gap-4 px-2 sm:px-3 py-2.5"
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <span
                      className="font-display text-2xl leading-none text-center tabular py-1"
                      style={medal ? { background: medal, color: '#111311', borderRadius: 2 } : { color: 'var(--muted)' }}
                    >
                      {i + 1}
                    </span>
                    {row.avatar_url ? (
                      <img src={row.avatar_url} alt="" className="w-8 h-8 sm:w-9 sm:h-9 object-cover" style={{ borderRadius: 2 }} />
                    ) : (
                      <span className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center font-display text-lg" style={{ background: 'var(--bg-3)', color: 'var(--text)', borderRadius: 2 }}>
                        {row.username?.[0]?.toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block font-semibold text-[15px] truncate" style={{ color: 'var(--text)' }}>{row.username}</span>
                      <span className="block sm:hidden text-xs" style={{ color: 'var(--muted)' }}>{row.total_bets} paris · {row.winrate}% WR</span>
                    </span>
                    <span className="hidden sm:block text-sm text-right tabular" style={{ color: 'var(--muted)' }}>
                      {row.total_bets} paris · {row.winrate}%
                    </span>
                    <span className="text-right">
                      <span className="font-display text-2xl leading-none tabular" style={{ color: i === 0 ? 'var(--gold)' : 'var(--text)' }}>
                        {Number(row.total_points).toLocaleString('fr-FR')}
                      </span>
                      <span className="ml-1 text-xs" style={{ color: 'var(--muted)' }}>pts</span>
                    </span>
                  </a>
                </li>
              )
            })}
          </ol>
        ) : (
          <div className="py-12 px-6 text-center" style={{ border: '1px dashed var(--border-2)' }}>
            <p className="font-display text-6xl leading-none mb-3 tabular" style={{ color: 'var(--border-2)' }}>0 – 0</p>
            <p className="text-base mb-5" style={{ color: 'var(--muted)' }}>Aucun joueur encore. Sois le premier.</p>
            <a href="/api/auth/login" className="btn-login">Se connecter</a>
          </div>
        )}
      </section>
    </div>
  )
}
