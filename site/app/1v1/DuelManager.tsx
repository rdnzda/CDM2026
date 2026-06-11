'use client'

import { useState } from 'react'
import { Swords, CheckCircle2, XCircle, Timer, X } from 'lucide-react'

type User = { id: string; username: string; avatar_url: string | null; total_points: number }

type Challenge = {
  id: string
  stake: number
  status: string
  expires_at: string
  created_at: string
  challenger: { id: string; username: string; avatar_url: string | null }
  opponent:   { id: string; username: string; avatar_url: string | null }
}

function Avatar({ user, size = 'sm' }: {
  user: { username: string; avatar_url: string | null }
  size?: 'sm' | 'md'
}) {
  const dim = size === 'md' ? 'w-9 h-9' : 'w-7 h-7'
  return user.avatar_url
    ? (
      <img
        src={user.avatar_url}
        alt=""
        className={`${dim} rounded-full shrink-0`}
        style={{ outline: '1.5px solid var(--border-2)', outlineOffset: '1px' }}
      />
    ) : (
      <span
        className={`${dim} rounded-full shrink-0 inline-flex items-center justify-center text-xs font-bold`}
        style={{ background: 'var(--bg-3)', color: '#F0B429', border: '1px solid var(--border-2)' }}
      >
        {user.username[0].toUpperCase()}
      </span>
    )
}

function timeLeft(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'Expiré'
  const m = Math.floor(diff / 60000)
  return m > 0 ? `${m} min` : '< 1 min'
}

export default function DuelManager({
  me, users, incoming, outgoing, availablePoints,
}: {
  me: { id: string; total_points: number; frozen_points: number }
  users: User[]
  incoming: Challenge[]
  outgoing: Challenge[]
  availablePoints: number
}) {
  const [tab, setTab]             = useState<'new' | 'incoming' | 'outgoing'>('new')
  const [search, setSearch]       = useState('')
  const [opponent, setOpponent]   = useState<User | null>(null)
  const [stake, setStake]         = useState(200)
  const [loading, setLoading]     = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionError, setActionError]     = useState<string | null>(null)
  const [result, setResult]       = useState<{ ok: boolean; message: string } | null>(null)
  const [incomingList, setIncomingList]   = useState(incoming)

  const maxStake   = Math.floor(availablePoints * 0.2)
  const stakeValid = stake >= 100 && stake <= maxStake && stake <= availablePoints
  const canSend    = !!opponent && stakeValid && !loading

  const filtered = search.length >= 2
    ? users.filter(u => u.id !== me.id && u.username.toLowerCase().includes(search.toLowerCase())).slice(0, 8)
    : []

  async function createChallenge() {
    if (!opponent || !stakeValid) return
    setResult(null)
    setLoading(true)
    try {
      const res = await fetch('/api/1v1/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opponentId: opponent.id, stake }),
      })
      const data = await res.json()
      if (!res.ok) setResult({ ok: false, message: data.error })
      else {
        setResult({ ok: true, message: `Défi envoyé à ${opponent.username} — valable 1h.` })
        setOpponent(null)
        setSearch('')
      }
    } catch { setResult({ ok: false, message: 'Erreur réseau.' }) }
    finally { setLoading(false) }
  }

  async function respond(challengeId: string, action: 'accept' | 'refuse') {
    setActionLoading(challengeId + action)
    setActionError(null)
    try {
      const res = await fetch('/api/1v1/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, action }),
      })
      const data = await res.json()
      if (res.ok) {
        setIncomingList(prev => prev.filter(c => c.id !== challengeId))
      } else {
        setActionError(data.error ?? 'Erreur.')
      }
    } catch { setActionError('Erreur réseau.') }
    finally { setActionLoading(null) }
  }

  const TABS = [
    { key: 'new'      as const, label: 'Nouveau',  badge: 0 },
    { key: 'incoming' as const, label: 'Reçus',    badge: incomingList.length },
    { key: 'outgoing' as const, label: 'Envoyés',  badge: outgoing.length },
  ]

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}
    >
      {/* Tab bar */}
      <div className="flex" style={{ borderBottom: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setResult(null); setActionError(null) }}
            className="relative flex-1 flex items-center justify-center gap-1.5 py-3.5 text-xs font-semibold tracking-wider transition-colors"
            style={{ color: tab === t.key ? '#F0B429' : 'var(--muted)' }}
          >
            {t.label}
            {t.badge > 0 && (
              <span
                className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                style={{ background: '#EF4444', color: '#fff' }}
              >
                {t.badge}
              </span>
            )}
            {tab === t.key && (
              <span
                className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full"
                style={{ background: '#F0B429' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-5">

        {/* ── NOUVEAU DÉFI ── */}
        {tab === 'new' && (
          <div className="space-y-5">

            {/* Search */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
                Adversaire
              </p>
              <div className="relative">
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setOpponent(null); setResult(null) }}
                  placeholder="Tape un pseudo…"
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{
                    background: 'var(--bg)',
                    border: '1.5px solid var(--border)',
                    color: 'var(--text)',
                    transition: 'border-color .15s',
                  }}
                  onFocus={(e: any) => e.target.style.borderColor = '#F0B429'}
                  onBlur={(e: any)  => e.target.style.borderColor = opponent ? '#F0B429' : 'var(--border)'}
                />
              </div>

              {/* Dropdown */}
              {filtered.length > 0 && !opponent && (
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid var(--border)' }}
                >
                  {filtered.map(u => (
                    <button
                      key={u.id}
                      onClick={() => { setOpponent(u); setSearch(u.username) }}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors"
                      style={{ background: 'var(--bg)' }}
                      onMouseEnter={(e: any) => e.currentTarget.style.background = 'var(--bg-3)'}
                      onMouseLeave={(e: any) => e.currentTarget.style.background = 'var(--bg)'}
                    >
                      <span className="flex items-center gap-2">
                        <Avatar user={u} />
                        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{u.username}</span>
                      </span>
                      <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
                        {u.total_points.toLocaleString('fr-FR')} pts
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected opponent */}
              {opponent && (
                <div
                  className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{
                    background: 'rgba(240,180,41,.06)',
                    border: '1.5px solid rgba(240,180,41,.3)',
                  }}
                >
                  <span className="flex items-center gap-2">
                    <Avatar user={opponent} />
                    <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{opponent.username}</span>
                    <span className="font-mono text-xs ml-1" style={{ color: 'var(--muted)' }}>
                      {opponent.total_points.toLocaleString('fr-FR')} pts
                    </span>
                  </span>
                  <button
                    onClick={() => { setOpponent(null); setSearch('') }}
                    className="p-1 rounded-lg transition-colors"
                    style={{ color: 'var(--muted)' }}
                    onMouseEnter={(e: any) => e.currentTarget.style.color = 'var(--text)'}
                    onMouseLeave={(e: any) => e.currentTarget.style.color = 'var(--muted)'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Stake — only shown once opponent selected */}
            {opponent && (
              <div className="space-y-5">
                <div
                  className="space-y-3"
                  style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
                      Mise
                    </span>
                    <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
                      Max {maxStake.toLocaleString('fr-FR')} pts (20%)
                    </span>
                  </div>

                  <div className="flex gap-1.5">
                    {[100, 200, 500, 1000].filter(v => v <= maxStake).map(v => {
                      const active = stake === v
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setStake(v)}
                          className="flex-1 py-2 rounded-lg text-[11px] font-bold transition-all"
                          style={{
                            background: active ? 'rgba(240,180,41,.15)' : 'var(--bg)',
                            border: `1.5px solid ${active ? '#F0B429' : 'var(--border)'}`,
                            color: active ? '#F0B429' : 'var(--muted)',
                          }}
                        >
                          {v >= 1000 ? '1k' : v}
                        </button>
                      )
                    })}
                  </div>

                  <input
                    type="number"
                    min={100}
                    max={maxStake}
                    value={stake}
                    onChange={e => setStake(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl font-mono text-sm outline-none"
                    style={{
                      background: 'var(--bg)',
                      border: '1.5px solid var(--border)',
                      color: 'var(--text)',
                      transition: 'border-color .15s',
                    }}
                    onFocus={(e: any) => e.target.style.borderColor = '#F0B429'}
                    onBlur={(e: any)  => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>

                {/* Gain preview */}
                {stakeValid && (
                  <div
                    className="rounded-xl px-4 py-3.5 flex items-center justify-between"
                    style={{ background: 'rgba(34,197,94,.05)', border: '1px solid rgba(34,197,94,.2)' }}
                  >
                    <p className="text-[10px] font-semibold tracking-widest" style={{ color: 'var(--muted)' }}>
                      GAIN SI VICTOIRE
                    </p>
                    <div className="text-right">
                      <span className="font-display text-2xl" style={{ color: '#22C55E', letterSpacing: '.04em' }}>
                        +{stake.toLocaleString('fr-FR')}
                      </span>
                      <p className="text-[9px] tracking-widest mt-0.5 uppercase" style={{ color: 'var(--muted)' }}>pts</p>
                    </div>
                  </div>
                )}

                {/* Feedback */}
                {result && (
                  <div
                    className="px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2"
                    style={{
                      background: result.ok ? 'rgba(34,197,94,.08)' : 'rgba(239,68,68,.08)',
                      border: `1px solid ${result.ok ? 'rgba(34,197,94,.2)' : 'rgba(239,68,68,.2)'}`,
                      color: result.ok ? '#22C55E' : '#EF4444',
                    }}
                  >
                    {result.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                    {result.message}
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={createChallenge}
                  disabled={!canSend}
                  className="w-full py-3.5 rounded-xl font-display text-lg tracking-[.08em] transition-all"
                  style={{
                    background: canSend
                      ? 'linear-gradient(135deg, #F0B429 0%, #FFD060 100%)'
                      : 'var(--bg)',
                    color:  canSend ? '#07101E' : 'var(--muted)',
                    border: `1.5px solid ${canSend ? '#F0B429' : 'var(--border)'}`,
                    boxShadow: canSend ? '0 4px 20px rgba(240,180,41,.2)' : 'none',
                  }}
                  onMouseDown={(e: any) => { if (canSend) e.currentTarget.style.transform = 'scale(0.98)' }}
                  onMouseUp={(e: any)   => { e.currentTarget.style.transform = 'none' }}
                >
                  {loading
                    ? 'Envoi…'
                    : `DÉFIER ${opponent.username.toUpperCase()}`}
                </button>
              </div>
            )}

            {/* Empty state — no opponent selected yet */}
            {!opponent && search.length < 2 && (
              <div
                className="rounded-xl p-6 text-center"
                style={{ background: 'var(--bg)', border: '1px dashed var(--border)' }}
              >
                <Swords className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--border-2)' }} />
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  Tape au moins 2 lettres pour chercher un adversaire
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── REÇUS ── */}
        {tab === 'incoming' && (
          <div className="space-y-3">
            {actionError && (
              <div
                className="px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2"
                style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', color: '#EF4444' }}
              >
                <XCircle className="w-4 h-4 shrink-0" />{actionError}
              </div>
            )}

            {incomingList.length === 0 ? (
              <div
                className="rounded-xl p-8 text-center"
                style={{ background: 'var(--bg)', border: '1px dashed var(--border)' }}
              >
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Aucun défi reçu.</p>
              </div>
            ) : (
              incomingList.map(c => (
                <div
                  key={c.id}
                  className="rounded-2xl overflow-hidden"
                  style={{ background: 'var(--bg)', border: '1px solid rgba(239,68,68,.25)' }}
                >
                  {/* Red top beam */}
                  <div
                    className="h-[2px]"
                    style={{ background: 'linear-gradient(90deg, transparent, #EF4444, transparent)' }}
                  />

                  <div className="p-4 space-y-4">
                    {/* Challenger row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Avatar user={c.challenger} size="md" />
                        <div>
                          <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                            {c.challenger.username}
                          </p>
                          <p className="text-[10px]" style={{ color: 'var(--muted)' }}>te défie</p>
                        </div>
                      </div>
                      <span
                        className="flex items-center gap-1 text-[10px] font-semibold"
                        style={{ color: 'var(--muted)' }}
                      >
                        <Timer className="w-3 h-3" />{timeLeft(c.expires_at)}
                      </span>
                    </div>

                    {/* Stake display */}
                    <div
                      className="rounded-xl py-4 text-center"
                      style={{ background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.18)' }}
                    >
                      <p
                        className="font-display text-3xl leading-none mb-1"
                        style={{ color: '#EF4444', letterSpacing: '.06em' }}
                      >
                        {c.stake.toLocaleString('fr-FR')}
                      </p>
                      <p
                        className="text-[10px] tracking-[.14em] uppercase"
                        style={{ color: 'var(--muted)' }}
                      >
                        pts en jeu de chaque côté
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => respond(c.id, 'accept')}
                        disabled={!!actionLoading}
                        className="flex-1 py-3 rounded-xl font-display text-base tracking-[.06em] transition-all"
                        style={{
                          background: 'linear-gradient(135deg, #22C55E 0%, #4ADE80 100%)',
                          color: '#07101E',
                          border: '1.5px solid #22C55E',
                          boxShadow: '0 4px 16px rgba(34,197,94,.2)',
                          opacity: actionLoading ? 0.6 : 1,
                        }}
                        onMouseDown={(e: any) => { if (!actionLoading) e.currentTarget.style.transform = 'scale(0.98)' }}
                        onMouseUp={(e: any) => { e.currentTarget.style.transform = 'none' }}
                      >
                        {actionLoading === c.id + 'accept' ? '…' : 'ACCEPTER'}
                      </button>
                      <button
                        onClick={() => respond(c.id, 'refuse')}
                        disabled={!!actionLoading}
                        className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all"
                        style={{
                          background: 'var(--bg-3)',
                          color: 'var(--muted)',
                          border: '1.5px solid var(--border)',
                          opacity: actionLoading ? 0.6 : 1,
                        }}
                      >
                        {actionLoading === c.id + 'refuse' ? '…' : 'Refuser'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── ENVOYÉS ── */}
        {tab === 'outgoing' && (
          <div className="space-y-2.5">
            {outgoing.length === 0 ? (
              <div
                className="rounded-xl p-8 text-center"
                style={{ background: 'var(--bg)', border: '1px dashed var(--border)' }}
              >
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Aucun défi envoyé.</p>
              </div>
            ) : (
              outgoing.map(c => {
                const accepted = c.status === 'accepted'
                return (
                  <div
                    key={c.id}
                    className="rounded-2xl overflow-hidden"
                    style={{
                      background: 'var(--bg)',
                      border: `1px solid ${accepted ? 'rgba(34,197,94,.25)' : 'var(--border)'}`,
                    }}
                  >
                    {accepted && (
                      <div
                        className="h-[2px]"
                        style={{ background: 'linear-gradient(90deg, transparent, #22C55E, transparent)' }}
                      />
                    )}
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <Avatar user={c.opponent} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                          {c.opponent.username}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="font-mono text-xs font-bold" style={{ color: '#F0B429' }}>
                            {c.stake.toLocaleString('fr-FR')} pts
                          </span>
                          <span
                            className="text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full"
                            style={{
                              background: accepted ? 'rgba(34,197,94,.1)' : 'rgba(240,180,41,.1)',
                              color: accepted ? '#22C55E' : '#F0B429',
                              border: `1px solid ${accepted ? 'rgba(34,197,94,.2)' : 'rgba(240,180,41,.2)'}`,
                            }}
                          >
                            {accepted
                              ? 'ACCEPTÉ'
                              : `EN ATTENTE · ${timeLeft(c.expires_at)}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

      </div>
    </div>
  )
}
