import { createClient } from '@/lib/supabase/server'
import { Calendar, Shuffle, Swords, Sun } from 'lucide-react'

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

  return (
    <div className="space-y-10">

      {/* ── HERO ── asymmetric split */}
      <section className="animate-fade-up">
        <div
          className="relative overflow-hidden rounded-2xl bg-stripes"
          style={{ backgroundColor: 'var(--bg-2)', border: '1px solid var(--border)' }}
        >
          {/* Gold accent line — gradient fade top/bottom */}
          <div
            className="absolute inset-y-0 left-0 w-px pointer-events-none"
            style={{
              background: 'linear-gradient(to bottom, transparent 0%, var(--gold) 20%, var(--gold) 80%, transparent 100%)',
            }}
          />

          <div className="grid grid-cols-1 md:grid-cols-[55%_45%]">

            {/* LEFT — text */}
            <div className="relative z-10 flex flex-col justify-center px-8 py-12 md:px-12 md:py-14">

              {/* Status eyebrow */}
              <div className="mb-6">
                {live ? (
                  <span
                    className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full"
                    style={{
                      background: 'rgba(34,197,94,.1)',
                      color: '#22C55E',
                      border: '1px solid rgba(34,197,94,.2)',
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ background: '#22C55E' }}
                    />
                    TOURNOI EN COURS
                  </span>
                ) : over ? (
                  <span
                    className="inline-block text-xs font-semibold px-3 py-1.5 rounded-full"
                    style={{
                      background: 'rgba(74,98,128,.12)',
                      color: '#4A6280',
                      border: '1px solid #1A2F4A',
                    }}
                  >
                    TOURNOI TERMINE
                  </span>
                ) : (
                  <span
                    className="inline-block text-xs font-bold px-3 py-1.5 rounded-full tracking-wider"
                    style={{
                      background: 'rgba(240,180,41,.1)',
                      color: '#F0B429',
                      border: '1px solid rgba(240,180,41,.22)',
                    }}
                  >
                    FIFA WORLD CUP 2026
                  </span>
                )}
              </div>

              {/* Headline */}
              <h1
                className="font-display leading-[0.88] mb-5"
                style={{
                  fontSize: 'clamp(4.5rem, 12vw, 8rem)',
                  color: '#F0B429',
                  letterSpacing: '.03em',
                }}
              >
                CDM
                <br />
                <span
                  style={{
                    color: 'var(--text)',
                    WebkitTextStroke: '1px rgba(216,230,243,.2)',
                  }}
                >
                  2026
                </span>
              </h1>

              {/* Subtext */}
              <p
                className="text-sm leading-relaxed mb-6 max-w-[32ch]"
                style={{ color: 'var(--muted)' }}
              >
                Paris simples, combines, duels 1v1 et defis quotidiens. 11 juin au 19 juillet.
              </p>

              {/* Countdown */}
              {!live && !over && diffMs > 0 && (
                <div className="flex items-stretch gap-2 mb-8">
                  {[
                    { n: diffDays, l: 'JOURS' },
                    { n: diffHrs,  l: 'HEURES' },
                    { n: diffMins, l: 'MINS' },
                  ].map(({ n, l }) => (
                    <div
                      key={l}
                      className="flex flex-col items-center justify-center w-16 h-16 rounded-xl"
                      style={{
                        background: 'var(--bg-3)',
                        border: '1px solid var(--border-2)',
                      }}
                    >
                      <span
                        className="font-display tabular-nums text-2xl leading-none"
                        style={{ color: '#F0B429' }}
                      >
                        {String(n).padStart(2, '0')}
                      </span>
                      <span
                        className="text-[8px] tracking-[.14em] mt-1 uppercase"
                        style={{ color: 'var(--muted)' }}
                      >
                        {l}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* CTAs */}
              <div className="flex flex-wrap gap-3">
                <a
                  href="/matchs"
                  className="btn-gold inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl"
                  style={{ background: '#F0B429', color: '#07101E' }}
                >
                  Voir les matchs
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </a>
                <a
                  href="/api/auth/login"
                  className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
                  style={{
                    background: 'rgba(88,101,242,.15)',
                    color: '#818CF8',
                    border: '1px solid rgba(88,101,242,.25)',
                  }}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                  </svg>
                  Discord
                </a>
              </div>
            </div>

            {/* RIGHT — stadium image (desktop only) */}
            <div className="hidden md:block relative overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1672088491419-33f6f85a7c79?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                alt="Stade FIFA World Cup 2026"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ opacity: 0.5, mixBlendMode: 'luminosity' }}
              />
              {/* Fade left edge into bg */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(90deg, var(--bg-2) 0%, transparent 35%)',
                }}
              />
              {/* Fade bottom edge */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(to top, var(--bg-2) 0%, transparent 30%)',
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── BENTO FEATURES ── */}
      <section className="delay-1 animate-fade-up">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

          {/* Matchs — large, 2 rows on desktop */}
          <a
            href="/matchs"
            className="group relative overflow-hidden rounded-2xl md:row-span-2 min-h-[220px] md:min-h-0 flex flex-col justify-end p-6"
            style={{ border: '1px solid var(--border)' }}
          >
            <img
              src="https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              style={{ opacity: 0.38, mixBlendMode: 'luminosity' }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to top, rgba(13,26,46,1) 25%, rgba(13,26,46,.5) 65%, rgba(13,26,46,.1) 100%)',
              }}
            />
            <div
              className="absolute inset-0 rounded-2xl transition-opacity duration-300 opacity-0 group-hover:opacity-100"
              style={{ boxShadow: 'inset 0 0 0 1px rgba(240,180,41,.35)' }}
            />
            <div className="relative z-10">
              <Calendar className="w-6 h-6 mb-3" style={{ color: '#F0B429' }} />
              <p
                className="font-display text-4xl leading-none mb-1.5"
                style={{ color: 'var(--text)', letterSpacing: '.04em' }}
              >
                MATCHS
              </p>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                Paris simples sur tous les matchs du tournoi
              </p>
              <div
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold tracking-wider"
                style={{ color: '#F0B429' }}
              >
                PARIER MAINTENANT
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </a>

          {/* Combines */}
          <a
            href="/combos"
            className="group relative overflow-hidden rounded-2xl flex flex-col justify-end p-5 min-h-[140px]"
            style={{ backgroundColor: 'var(--bg-2)', border: '1px solid var(--border)' }}
          >
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                background:
                  'linear-gradient(135deg, rgba(88,101,242,.22) 0%, rgba(88,101,242,.04) 55%, transparent 100%)',
              }}
            />
            <div
              className="absolute inset-0 rounded-2xl transition-opacity duration-300 opacity-0 group-hover:opacity-100"
              style={{ boxShadow: 'inset 0 0 0 1px rgba(240,180,41,.35)' }}
            />
            <div className="relative z-10">
              <Shuffle className="w-5 h-5 mb-2" style={{ color: '#F0B429' }} />
              <p className="font-semibold text-sm mb-0.5" style={{ color: 'var(--text)' }}>
                Combines
              </p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Multi-selection 2-10 matchs
              </p>
            </div>
          </a>

          {/* Duels 1v1 */}
          <a
            href="/1v1"
            className="group relative overflow-hidden rounded-2xl flex flex-col justify-end p-5 min-h-[140px]"
            style={{ backgroundColor: 'var(--bg-2)', border: '1px solid var(--border)' }}
          >
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                background:
                  'linear-gradient(135deg, rgba(239,68,68,.16) 0%, rgba(239,68,68,.03) 55%, transparent 100%)',
              }}
            />
            <div
              className="absolute inset-0 rounded-2xl transition-opacity duration-300 opacity-0 group-hover:opacity-100"
              style={{ boxShadow: 'inset 0 0 0 1px rgba(240,180,41,.35)' }}
            />
            <div className="relative z-10">
              <Swords className="w-5 h-5 mb-2" style={{ color: '#F0B429' }} />
              <p className="font-semibold text-sm mb-0.5" style={{ color: 'var(--text)' }}>
                Duels 1v1
              </p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Defis en tete-a-tete
              </p>
            </div>
          </a>

          {/* Quotidien — full width */}
          <a
            href="/quotidien"
            className="group relative overflow-hidden rounded-2xl md:col-span-2 flex items-center gap-5 p-5 min-h-[90px]"
            style={{ backgroundColor: 'var(--bg-2)', border: '1px solid var(--border)' }}
          >
            <img
              src="https://images.unsplash.com/photo-1553778263-73a83bab9b0c?q=80&w=2071&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              style={{ opacity: 0.18, mixBlendMode: 'luminosity' }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(90deg, var(--bg-2) 20%, transparent 60%, var(--bg-2) 100%)',
              }}
            />
            <div
              className="absolute inset-0 rounded-2xl transition-opacity duration-300 opacity-0 group-hover:opacity-100"
              style={{ boxShadow: 'inset 0 0 0 1px rgba(240,180,41,.35)' }}
            />
            <div
              className="relative z-10 shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'rgba(240,180,41,.1)',
                border: '1px solid rgba(240,180,41,.18)',
              }}
            >
              <Sun className="w-5 h-5" style={{ color: '#F0B429' }} />
            </div>
            <div className="relative z-10 flex-1 min-w-0">
              <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                Defi Quotidien
              </p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Un nouveau defi chaque matin a 10h
              </p>
            </div>
            <div
              className="relative z-10 shrink-0 hidden sm:flex items-center gap-1.5 text-xs font-bold tracking-wider"
              style={{ color: '#F0B429' }}
            >
              PARTICIPER
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </a>

        </div>
      </section>

      {/* ── LEADERBOARD ── */}
      <section className="delay-2 animate-fade-up">
        <div className="flex items-baseline justify-between mb-5">
          <div className="flex items-baseline gap-3">
            <h2
              className="font-display text-3xl"
              style={{ color: 'var(--text)', letterSpacing: '.06em' }}
            >
              CLASSEMENT
            </h2>
            {userCount ? (
              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                {userCount} joueurs
              </span>
            ) : null}
          </div>
          <a
            href="/classement"
            className="text-xs font-bold tracking-widest"
            style={{ color: '#F0B429' }}
          >
            TOUT VOIR
          </a>
        </div>

        {top10?.length ? (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid var(--border)' }}
          >
            {top10.map((row: any, i: number) => {
              const medal = i === 0 ? '#F0B429' : i === 1 ? '#94A3B8' : i === 2 ? '#92734D' : null

              return (
                <a
                  key={row.id}
                  href={`/profil/${row.username}`}
                  className="hover-gold-bg flex items-center gap-4 px-5 py-4"
                  style={{
                    background: i % 2 === 0 ? 'var(--bg-2)' : 'var(--bg-3)',
                    borderBottom:
                      i < top10.length - 1 ? '1px solid var(--border)' : undefined,
                    transition: 'background .15s',
                  }}
                >
                  {/* Rank */}
                  <div className="w-7 shrink-0 text-center">
                    {medal ? (
                      <span
                        className="font-display leading-none"
                        style={{ fontSize: i === 0 ? '1.4rem' : '1.2rem', color: medal }}
                      >
                        {i + 1}
                      </span>
                    ) : (
                      <span
                        className="font-mono text-xs tabular-nums"
                        style={{ color: 'var(--muted)' }}
                      >
                        {i + 1}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="shrink-0">
                    {row.avatar_url ? (
                      <img
                        src={row.avatar_url}
                        alt=""
                        className="w-8 h-8 rounded-full"
                        style={{
                          outline: medal
                            ? `2px solid ${medal}`
                            : '1px solid var(--border-2)',
                          outlineOffset: '1px',
                        }}
                      />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{
                          background: 'var(--bg-3)',
                          color: medal ?? 'var(--muted)',
                          border: `1px solid ${medal ?? 'var(--border-2)'}`,
                        }}
                      >
                        {row.username?.[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Name + stats */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-semibold text-sm truncate"
                      style={{ color: 'var(--text)' }}
                    >
                      {row.username}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                      {row.total_bets} paris · {row.winrate}% WR
                    </p>
                  </div>

                  {/* Points */}
                  <div className="text-right shrink-0">
                    <p
                      className="font-mono font-bold text-sm tabular-nums"
                      style={{ color: i === 0 ? '#F0B429' : 'var(--text)' }}
                    >
                      {Number(row.total_points).toLocaleString('fr-FR')}
                    </p>
                    <p
                      className="text-[9px] tracking-widest uppercase mt-0.5"
                      style={{ color: 'var(--muted)' }}
                    >
                      pts
                    </p>
                  </div>
                </a>
              )
            })}
          </div>
        ) : (
          <div
            className="rounded-2xl p-14 text-center"
            style={{ backgroundColor: 'var(--bg-2)', border: '1px solid var(--border)' }}
          >
            <p className="font-display text-5xl mb-3" style={{ color: 'var(--border-2)' }}>
              00
            </p>
            <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>
              Aucun joueur encore. Sois le premier.
            </p>
            <a
              href="/api/auth/login"
              className="btn-discord inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl"
              style={{ background: '#5865F2', color: '#fff' }}
            >
              Se connecter
            </a>
          </div>
        )}
      </section>
    </div>
  )
}
