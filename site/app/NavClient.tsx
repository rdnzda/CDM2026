'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { CircleDot } from 'lucide-react'

type NavUser = { username: string; avatar_url: string | null; total_points: number } | null

const LINKS = [
  { href: '/matchs',     label: 'Matchs'    },
  { href: '/groupes',    label: 'Groupes'   },
  { href: '/bracket',    label: 'Bracket'   },
  { href: '/combos',     label: 'Combinés'  },
  { href: '/1v1',        label: '1v1'       },
  { href: '/quotidien',  label: 'Quotidien' },
  { href: '/tournoi',    label: 'Tournoi'   },
  { href: '/classement', label: 'Classement'},
]

export default function NavClient({ user }: { user: NavUser }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: scrolled ? 'rgba(7,16,30,.97)' : 'var(--bg)',
        borderBottom: `1px solid ${scrolled ? 'var(--border-2)' : 'var(--border)'}`,
      }}
    >
      <nav className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-5" aria-label="Navigation principale">

        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5 shrink-0 mr-2" aria-label="CDM 2026 — accueil">
          <CircleDot className="w-5 h-5" style={{ color: 'var(--gold)' }} aria-hidden="true" />
          <span className="font-display text-2xl leading-none" style={{ color: 'var(--gold)', letterSpacing: '.08em' }}>
            CDM<span style={{ color: 'var(--text)', opacity: .75 }}>26</span>
          </span>
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-stretch self-stretch flex-1">
          {LINKS.map(l => {
            const active = pathname === l.href || pathname.startsWith(l.href + '/')
            return (
              <a
                key={l.href} href={l.href}
                aria-current={active ? 'page' : undefined}
                className="nav-link relative flex items-center px-2 lg:px-3 text-sm font-medium"
                data-active={active || undefined}
              >
                {l.label}
              </a>
            )
          })}
        </div>

        {/* Right — user or login */}
        <div className="ml-auto flex items-center gap-3 shrink-0">
          {user ? (
            <a
              href="/dashboard"
              className="hidden sm:flex items-center gap-2.5 pl-1.5 pr-3 py-1 rounded-md hover-bg-3"
              style={{ border: '1px solid var(--border)', background: pathname === '/dashboard' ? 'var(--bg-3)' : undefined }}
            >
              {user.avatar_url
                ? <img src={user.avatar_url} alt="" className="w-6 h-6 rounded-full" style={{ outline: '1.5px solid rgba(240,180,41,.4)' }} />
                : <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--border)', color: 'var(--gold)' }}>{user.username[0].toUpperCase()}</span>
              }
              <span className="hidden lg:block text-sm font-semibold max-w-[90px] truncate" style={{ color: 'var(--text)' }}>{user.username}</span>
              <span className="font-mono text-xs font-semibold" style={{ color: 'var(--gold)' }}>
                {user.total_points.toLocaleString('fr-FR')}
                <span className="ml-1 text-xs font-semibold" style={{ color: 'var(--muted)' }}>pts</span>
              </span>
            </a>
          ) : (
            <a href="/api/auth/login" className="btn-discord hidden sm:inline-flex !py-1.5 !px-4">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
              </svg>
              Se connecter
            </a>
          )}

          {/* Hamburger */}
          <button
            onClick={() => setOpen(o => !o)}
            className="md:hidden p-2 rounded-md"
            style={{ color: 'var(--text)', border: '1px solid var(--border)' }}
            aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={open}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              {open
                ? <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden px-4 pb-4 pt-1" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
          <div className="grid grid-cols-2">
            {LINKS.map(l => {
              const active = pathname === l.href || pathname.startsWith(l.href + '/')
              return (
                <a key={l.href} href={l.href}
                  aria-current={active ? 'page' : undefined}
                  className="text-[15px] font-medium py-2.5 pl-3"
                  style={{
                    color: active ? 'var(--gold)' : 'var(--text)',
                    borderLeft: `2px solid ${active ? 'var(--gold)' : 'transparent'}`,
                    borderBottom: '1px solid var(--border)',
                  }}>
                  {l.label}
                </a>
              )
            })}
          </div>
          <div className="pt-3">
            {user ? (
              <>
                <a href="/dashboard" className="flex items-center justify-between py-2.5 text-sm" style={{ color: 'var(--text)' }}>
                  <span className="flex items-center gap-2 font-semibold">
                    {user.avatar_url
                      ? <img src={user.avatar_url} alt="" className="w-6 h-6 rounded-full" style={{ outline: '1.5px solid rgba(240,180,41,.4)' }} />
                      : <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--border)', color: 'var(--gold)' }}>{user.username[0]}</span>}
                    {user.username}
                  </span>
                  <span className="font-mono text-sm font-bold" style={{ color: 'var(--gold)' }}>{user.total_points.toLocaleString('fr-FR')} pts</span>
                </a>
                <a href="/api/auth/logout" className="inline-block py-2 text-sm underline underline-offset-4" style={{ color: 'var(--muted)' }}>Déconnexion</a>
              </>
            ) : (
              <a href="/api/auth/login" className="btn-discord w-full justify-center">
                Se connecter avec Discord
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
