'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { CircleDot } from 'lucide-react'

type NavUser = { username: string; avatar_url: string | null; total_points: number } | null

const LINKS = [
  { href: '/matchs',     label: 'Matchs'    },
  { href: '/groupes',    label: 'Groupes'   },
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
      className="sticky top-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(7,16,30,.96)' : 'rgba(7,16,30,.80)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${scrolled ? '#1A2F4A' : 'transparent'}`,
      }}
    >
      <nav className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">

        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5 shrink-0 mr-2">
          <CircleDot className="w-5 h-5" style={{ color: '#F0B429' }} />
          <span className="font-display text-2xl tracking-widest leading-none" style={{ color: '#F0B429' }}>
            CDM<span className="text-white opacity-70">26</span>
          </span>
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-0.5 flex-1">
          {LINKS.map(l => {
            const active = pathname === l.href || pathname.startsWith(l.href + '/')
            return (
              <a
                key={l.href} href={l.href}
                className="relative px-3 py-1.5 text-sm font-medium tracking-wide transition-colors rounded-md"
                style={{ color: active ? '#F0B429' : '#4A6280' }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = '#D8E6F3' }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = '#4A6280' }}
              >
                {l.label}
                {active && (
                  <span className="absolute bottom-0 left-3 right-3 h-px" style={{ background: '#F0B429' }} />
                )}
              </a>
            )
          })}
        </div>

        {/* Right — user or login */}
        <div className="ml-auto flex items-center gap-3 shrink-0">
          {user ? (
            <a
              href="/dashboard"
              className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: pathname === '/dashboard' ? 'rgba(240,180,41,.1)' : undefined }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(240,180,41,.08)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = pathname === '/dashboard' ? 'rgba(240,180,41,.1)' : ''}
            >
              {user.avatar_url
                ? <img src={user.avatar_url} alt="" className="w-6 h-6 rounded-full" style={{ outline: '1.5px solid rgba(240,180,41,.4)' }} />
                : <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#1A2F4A', color: '#F0B429' }}>{user.username[0].toUpperCase()}</span>
              }
              <span className="hidden lg:block text-sm font-medium max-w-[90px] truncate" style={{ color: '#D8E6F3' }}>{user.username}</span>
              <span className="font-mono text-xs font-semibold" style={{ color: '#F0B429' }}>
                {user.total_points.toLocaleString('fr-FR')}
              </span>
            </a>
          ) : (
            <a
              href="/api/auth/login"
              className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold px-4 py-1.5 rounded-lg transition-all"
              style={{ background: '#5865F2', color: '#fff' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#4752C4'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#5865F2'}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
              </svg>
              Discord
            </a>
          )}

          {/* Hamburger */}
          <button
            onClick={() => setOpen(o => !o)}
            className="md:hidden p-1.5 rounded-md transition-colors"
            style={{ color: '#4A6280' }}
            aria-label="Menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              {open
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden px-4 pb-4 pt-2 space-y-0.5" style={{ borderTop: '1px solid #1A2F4A', background: 'rgba(7,16,30,.98)' }}>
          {LINKS.map(l => {
            const active = pathname === l.href
            return (
              <a key={l.href} href={l.href}
                className="flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors"
                style={{ color: active ? '#F0B429' : '#4A6280', background: active ? 'rgba(240,180,41,.08)' : undefined }}>
                {l.label}
              </a>
            )
          })}
          <div className="pt-2" style={{ borderTop: '1px solid #1A2F4A' }}>
            {user ? (
              <>
                <a href="/dashboard" className="flex items-center justify-between px-3 py-2.5 rounded-md text-sm" style={{ color: '#D8E6F3' }}>
                  <span className="flex items-center gap-2">
                    {user.avatar_url
                      ? <img src={user.avatar_url} alt="" className="w-5 h-5 rounded-full" />
                      : <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs" style={{ background: '#1A2F4A', color: '#F0B429' }}>{user.username[0]}</span>}
                    {user.username}
                  </span>
                  <span className="font-mono text-xs" style={{ color: '#F0B429' }}>{user.total_points.toLocaleString('fr-FR')} pts</span>
                </a>
                <a href="/api/auth/logout" className="block px-3 py-2 text-xs rounded-md" style={{ color: '#4A6280' }}>Déconnexion</a>
              </>
            ) : (
              <a href="/api/auth/login" className="block px-3 py-2.5 text-sm font-semibold rounded-md" style={{ color: '#5865F2' }}>
                Se connecter avec Discord
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
