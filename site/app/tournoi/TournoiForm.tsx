'use client'

import { useState, useRef, useEffect } from 'react'
import { Lock, Trophy, Award, Star, CheckCircle2, XCircle, Footprints, X, ChevronDown } from 'lucide-react'
import { getFlagUrl } from '@/lib/flags'

type Team = string
type Player = { player_name: string; team: string }

type ExistingPredictions = {
  podium: { first_team: string; second_team: string; third_team: string } | null
  boot:   { player_name: string; team: string } | null
  ball:   { player_name: string; team: string } | null
}

const LOCK         = new Date('2026-06-14T22:00:00Z')
const MEDAL_COLOR  = ['#F0B429', '#94A3B8', '#92734D'] as const
const MEDAL_BG     = ['rgba(240,180,41,.1)', 'rgba(148,163,184,.07)', 'rgba(146,115,77,.09)'] as const
const MEDAL_LABEL  = ['1er', '2ème', '3ème'] as const

// ── TeamSelect combobox ────────────────────────────────────────────────────
function TeamSelect({ index, value, onSelect, onClear, teams, exclude }: {
  index: number
  value: string        // committed team name ('' when empty)
  onSelect: (team: string) => void
  onClear: () => void
  teams: Team[]
  exclude: string[]
}) {
  const [query, setQuery]   = useState('')
  const [open, setOpen]     = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const isSelected = !!value
  const color      = MEDAL_COLOR[index]
  const flagUrl    = isSelected ? getFlagUrl(value, '20x15') : null
  const available  = teams.filter(t => !exclude.includes(t))

  const filtered = query.trim()
    ? available.filter(t => t.toLowerCase().includes(query.toLowerCase()))
    : available

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function commit(team: string) {
    onSelect(team)
    setQuery('')
    setOpen(false)
  }

  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
      style={{
        background: isSelected ? MEDAL_BG[index] : 'var(--bg)',
        border: `1.5px solid ${isSelected ? color : 'var(--border)'}`,
      }}
    >
      {/* Rank badge */}
      <div
        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: isSelected ? MEDAL_BG[index] : 'var(--bg-3)', border: `1px solid ${color}` }}
      >
        <span className="font-display text-sm leading-none" style={{ color }}>
          {index + 1}
        </span>
      </div>

      {/* Combobox */}
      <div ref={ref} className="flex-1 relative min-w-0">
        {isSelected ? (
          /* Chip */
          <div className="flex items-center gap-2 min-w-0">
            {flagUrl && <img src={flagUrl} alt="" width={20} height={15} className="rounded-sm shrink-0" />}
            <span className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{value}</span>
            <button
              type="button" onClick={onClear}
              className="ml-auto shrink-0 p-0.5 rounded-md transition-opacity opacity-50 hover:opacity-100"
              style={{ color: 'var(--muted)' }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1">
              <input
                value={query}
                onChange={e => { setQuery(e.target.value); setOpen(true) }}
                onFocus={() => setOpen(true)}
                placeholder={`Équipe ${MEDAL_LABEL[index]}…`}
                className="flex-1 bg-transparent text-sm outline-none min-w-0"
                style={{ color: 'var(--text)' }}
              />
              <ChevronDown
                className="w-3.5 h-3.5 shrink-0 cursor-pointer"
                style={{ color: 'var(--muted)' }}
                onClick={() => setOpen(o => !o)}
              />
            </div>
            {open && filtered.length > 0 && (
              <div
                className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-auto z-20"
                style={{
                  background: 'var(--bg-3)',
                  border: '1px solid var(--border)',
                  maxHeight: '11rem',
                  boxShadow: '0 8px 24px rgba(0,0,0,.4)',
                }}
              >
                {filtered.map(t => {
                  const fl = getFlagUrl(t, '20x15')
                  return (
                    <button
                      key={t}
                      type="button"
                      onMouseDown={() => commit(t)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--bg-2)]"
                      style={{ color: 'var(--text)' }}
                    >
                      {fl
                        ? <img src={fl} alt="" width={18} height={13} className="rounded-sm shrink-0" />
                        : <span className="w-[18px] shrink-0" />
                      }
                      {t}
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── PlayerCombobox ─────────────────────────────────────────────────────────
function PlayerCombobox({ label, icon, playerName, team, onSelect, onClear, players }: {
  label: string
  icon: React.ReactNode
  playerName: string   // committed
  team: string         // committed
  onSelect: (p: Player) => void
  onClear: () => void
  players: Player[]
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const isSelected = !!playerName
  const flagUrl    = team ? getFlagUrl(team, '20x15') : null

  const filtered = query.trim()
    ? players.filter(p => p.player_name.toLowerCase().includes(query.toLowerCase())).slice(0, 40)
    : players.slice(0, 30)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function commit(p: Player) {
    onSelect(p)
    setQuery('')
    setOpen(false)
  }

  return (
    <div
      className="rounded-xl p-4 space-y-3 transition-all"
      style={{
        background: isSelected ? 'rgba(240,180,41,.05)' : 'var(--bg)',
        border: `1.5px solid ${isSelected ? 'rgba(240,180,41,.28)' : 'var(--border)'}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[10px] font-bold tracking-[.14em] uppercase" style={{ color: '#F0B429' }}>
          {label}
        </span>
        {isSelected && (
          <span
            className="ml-auto text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(240,180,41,.15)', color: '#F0B429', border: '1px solid rgba(240,180,41,.2)' }}
          >
            DÉFINI
          </span>
        )}
      </div>

      {/* Combobox */}
      <div ref={ref} className="relative">
        {isSelected ? (
          /* Selected chip */
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}
          >
            {flagUrl && <img src={flagUrl} alt="" width={20} height={15} className="rounded-sm shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text)' }}>{playerName}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>{team}</p>
            </div>
            <button
              type="button" onClick={onClear}
              className="shrink-0 p-0.5 rounded-md transition-opacity opacity-50 hover:opacity-100"
              style={{ color: 'var(--muted)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); setOpen(true) }}
              onFocus={(e: any) => { setOpen(true); e.target.style.borderColor = '#F0B429' }}
              placeholder={`Rechercher — ${label}…`}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background: 'var(--bg-3)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                transition: 'border-color .15s',
              }}
              onBlur={(e: any) => e.target.style.borderColor = 'var(--border)'}
            />
            {open && filtered.length > 0 && (
              <div
                className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-auto z-20"
                style={{
                  background: 'var(--bg-3)',
                  border: '1px solid var(--border)',
                  maxHeight: '13rem',
                  boxShadow: '0 8px 24px rgba(0,0,0,.4)',
                }}
              >
                {filtered.map(p => {
                  const fl = getFlagUrl(p.team, '20x15')
                  return (
                    <button
                      key={p.player_name}
                      type="button"
                      onMouseDown={() => commit(p)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-2)]"
                    >
                      {fl
                        ? <img src={fl} alt="" width={18} height={13} className="rounded-sm shrink-0" />
                        : <span className="w-[18px] shrink-0" />
                      }
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-tight truncate" style={{ color: 'var(--text)' }}>
                          {p.player_name}
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--muted)' }}>{p.team}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Main form ──────────────────────────────────────────────────────────────
export default function TournoiForm({
  teams, players, existing, isAuthenticated,
}: {
  teams: Team[]; players: Player[]; existing: ExistingPredictions; isAuthenticated: boolean
}) {
  const locked = new Date() >= LOCK

  const [first,       setFirst]       = useState(existing.podium?.first_team  ?? '')
  const [second,      setSecond]      = useState(existing.podium?.second_team ?? '')
  const [third,       setThird]       = useState(existing.podium?.third_team  ?? '')
  const [bootPlayer,  setBootPlayer]  = useState(existing.boot?.player_name ?? '')
  const [bootTeam,    setBootTeam]    = useState(existing.boot?.team ?? '')
  const [ballPlayer,  setBallPlayer]  = useState(existing.ball?.player_name ?? '')
  const [ballTeam,    setBallTeam]    = useState(existing.ball?.team ?? '')
  const [loading,     setLoading]     = useState(false)
  const [result,      setResult]      = useState<{ ok: boolean; message: string } | null>(null)
  const [saved,       setSaved]       = useState(!!existing.podium)

  const deadline = LOCK.toLocaleString('fr-FR', {
    day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setResult(null)
    if (!first || !second || !third)   return setResult({ ok: false, message: 'Complète le podium.' })
    if (!bootPlayer || !bootTeam)      return setResult({ ok: false, message: 'Complète le Golden Boot.' })
    if (!ballPlayer || !ballTeam)      return setResult({ ok: false, message: 'Complète le Golden Ball.' })
    setLoading(true)
    try {
      const res = await fetch('/api/tournoi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstTeam: first, secondTeam: second, thirdTeam: third,
          goldenBoot: { playerName: bootPlayer, team: bootTeam },
          goldenBall: { playerName: ballPlayer, team: ballTeam },
        }),
      })
      const data = await res.json()
      if (!res.ok) setResult({ ok: false, message: data.error ?? 'Erreur inconnue.' })
      else { setResult({ ok: true, message: 'Prédictions enregistrées !' }); setSaved(true) }
    } catch { setResult({ ok: false, message: 'Erreur réseau.' }) }
    finally { setLoading(false) }
  }

  // ── Not logged in ──
  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>Connecte-toi pour faire tes prédictions</p>
        <a href="/api/auth/login" className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl" style={{ background: '#5865F2', color: '#fff' }}>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
          </svg>
          Se connecter avec Discord
        </a>
      </div>
    )
  }

  // ── Locked, no predictions ──
  if (locked && !saved) {
    return (
      <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
        <Lock className="w-7 h-7 mx-auto mb-4" style={{ color: 'var(--border-2)' }} />
        <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>Les prédictions tournoi sont fermées</p>
        <p className="text-xs" style={{ color: 'var(--border-2)' }}>depuis le {deadline}</p>
      </div>
    )
  }

  // ── Locked + saved — read-only summary ──
  if (locked && saved) {
    const podiumTeams = [first, second, third]
    const awards = [
      { label: 'Golden Boot', player: bootPlayer, team: bootTeam },
      { label: 'Golden Ball', player: ballPlayer, team: ballTeam },
    ]
    return (
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-5 py-3" style={{ background: 'var(--bg-3)', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5" style={{ color: 'var(--muted)' }} />
            <span className="text-[10px] font-bold tracking-[.14em] uppercase" style={{ color: 'var(--muted)' }}>Verrouillé</span>
          </div>
          <span className="text-[10px]" style={{ color: 'var(--muted)' }}>Résultats calculés en fin de tournoi</span>
        </div>
        <div className="grid grid-cols-3" style={{ borderBottom: '1px solid var(--border)' }}>
          {podiumTeams.map((team, i) => (
            <div key={i} className="flex flex-col items-center gap-2 py-5 px-2" style={{ borderRight: i < 2 ? '1px solid var(--border)' : 'none' }}>
              <span className="font-display text-2xl leading-none" style={{ color: MEDAL_COLOR[i] }}>{i + 1}</span>
              {getFlagUrl(team, '40x30') && <img src={getFlagUrl(team, '40x30')!} alt="" width={28} height={21} className="rounded-sm" />}
              <span className="text-xs font-semibold text-center leading-tight" style={{ color: 'var(--text)' }}>{team}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2">
          {awards.map((a, i) => (
            <div key={a.label} className="px-5 py-4" style={{ borderRight: i === 0 ? '1px solid var(--border)' : 'none' }}>
              <p className="text-[9px] font-bold tracking-[.14em] uppercase mb-2" style={{ color: 'var(--muted)' }}>{a.label}</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{a.player}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {getFlagUrl(a.team, '20x15') && <img src={getFlagUrl(a.team, '20x15')!} alt="" width={14} height={10} className="rounded-sm" />}
                <p className="text-xs" style={{ color: 'var(--muted)' }}>{a.team}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Editable form ──
  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Deadline chip */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(240,180,41,.08)', color: '#F0B429', border: '1px solid rgba(240,180,41,.2)' }}>
          Fermeture le {deadline}
        </span>
        {saved && <span className="text-[10px]" style={{ color: 'var(--muted)' }}>Modifiable jusqu'à la clôture</span>}
      </div>

      {/* Podium card */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 px-5 py-3" style={{ background: 'var(--bg-3)', borderBottom: '1px solid var(--border)' }}>
          <Trophy className="w-4 h-4" style={{ color: '#F0B429' }} />
          <span className="font-display text-base tracking-[.06em]" style={{ color: 'var(--text)' }}>PODIUM FINAL</span>
        </div>
        <div className="p-4 space-y-2">
          <TeamSelect index={0} value={first}  onSelect={setFirst}  onClear={() => setFirst('')}  teams={teams} exclude={[second, third]} />
          <TeamSelect index={1} value={second} onSelect={setSecond} onClear={() => setSecond('')} teams={teams} exclude={[first,  third]} />
          <TeamSelect index={2} value={third}  onSelect={setThird}  onClear={() => setThird('')}  teams={teams} exclude={[first,  second]} />
        </div>
      </div>

      {/* Awards card */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 px-5 py-3" style={{ background: 'var(--bg-3)', borderBottom: '1px solid var(--border)' }}>
          <Award className="w-4 h-4" style={{ color: '#F0B429' }} />
          <span className="font-display text-base tracking-[.06em]" style={{ color: 'var(--text)' }}>PRIX INDIVIDUELS</span>
        </div>
        <div className="p-4 space-y-3">
          <PlayerCombobox
            label="Golden Boot"
            icon={<Footprints className="w-3.5 h-3.5" style={{ color: '#F0B429' }} />}
            playerName={bootPlayer} team={bootTeam}
            onSelect={p => { setBootPlayer(p.player_name); setBootTeam(p.team) }}
            onClear={() => { setBootPlayer(''); setBootTeam('') }}
            players={players}
          />
          <PlayerCombobox
            label="Golden Ball"
            icon={<Star className="w-3.5 h-3.5" style={{ color: '#F0B429' }} />}
            playerName={ballPlayer} team={ballTeam}
            onSelect={p => { setBallPlayer(p.player_name); setBallTeam(p.team) }}
            onClear={() => { setBallPlayer(''); setBallTeam('') }}
            players={players}
          />
        </div>
      </div>

      {/* Feedback */}
      {result && (
        <div className="px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2"
          style={{
            background: result.ok ? 'rgba(34,197,94,.08)' : 'rgba(239,68,68,.08)',
            border: `1px solid ${result.ok ? 'rgba(34,197,94,.2)' : 'rgba(239,68,68,.2)'}`,
            color: result.ok ? '#22C55E' : '#EF4444',
          }}>
          {result.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
          {result.message}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 rounded-xl font-display text-lg tracking-[.08em] transition-all"
        style={{
          background: !loading ? 'linear-gradient(135deg, #F0B429 0%, #FFD060 100%)' : 'var(--bg-3)',
          color:  !loading ? '#07101E' : 'var(--muted)',
          border: `1.5px solid ${!loading ? '#F0B429' : 'var(--border)'}`,
          boxShadow: !loading ? '0 4px 20px rgba(240,180,41,.2)' : 'none',
        }}
        onMouseDown={(e: any) => { if (!loading) e.currentTarget.style.transform = 'scale(0.98)' }}
        onMouseUp={(e: any) => { e.currentTarget.style.transform = 'none' }}
      >
        {loading ? 'Enregistrement…' : saved ? 'METTRE À JOUR' : 'ENREGISTRER'}
      </button>

    </form>
  )
}
