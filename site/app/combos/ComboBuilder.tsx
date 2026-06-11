'use client'

import { useState } from 'react'
import { Shuffle, CheckCircle2, XCircle, X } from 'lucide-react'
import { getFlagUrl } from '@/lib/flags'

type Match = {
  id: string
  home_team: string
  away_team: string
  kickoff_at: string
  phase: string
  phase_multiplier: number
  odds_home: number | null
  odds_draw: number | null
  odds_away: number | null
  odds_btts_yes: number | null
  odds_btts_no: number | null
  odds_over25: number | null
  odds_under25: number | null
}

type Leg = {
  matchId: string
  matchLabel: string
  betType: string
  label: string
  odds: number
  predictionResult?: string
  predictionBool?: boolean
}

type BetOption = {
  betType: string; label: string; odds: number
  predictionResult?: string; predictionBool?: boolean
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('fr-FR', {
    weekday: 'short', day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
  })
}

function getOptions(match: Match): BetOption[] {
  const opts: BetOption[] = []
  if (match.odds_home)    opts.push({ betType: 'result',     label: `1 ${match.home_team}`, odds: match.odds_home,    predictionResult: 'home' })
  if (match.odds_draw)    opts.push({ betType: 'result',     label: 'X Nul',                odds: match.odds_draw,    predictionResult: 'draw' })
  if (match.odds_away)    opts.push({ betType: 'result',     label: `2 ${match.away_team}`, odds: match.odds_away,    predictionResult: 'away' })
  if (match.odds_btts_yes) opts.push({ betType: 'btts',      label: 'BTTS Oui',             odds: match.odds_btts_yes!, predictionBool: true  })
  if (match.odds_btts_no)  opts.push({ betType: 'btts',      label: 'BTTS Non',             odds: match.odds_btts_no!,  predictionBool: false })
  if (match.odds_over25)   opts.push({ betType: 'over_under', label: 'Over 2.5',            odds: match.odds_over25!,   predictionBool: true  })
  if (match.odds_under25)  opts.push({ betType: 'over_under', label: 'Under 2.5',           odds: match.odds_under25!,  predictionBool: false })
  return opts
}

export default function ComboBuilder({
  matches, availablePoints, isAuthenticated,
}: {
  matches: Match[]; availablePoints: number; isAuthenticated: boolean
}) {
  const [legs, setLegs]     = useState<Leg[]>([])
  const [stake, setStake]   = useState(200)
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<{ ok: boolean; message: string } | null>(null)

  const addedMatchIds = new Set(legs.map(l => l.matchId))
  const totalOdds    = legs.reduce((acc, l) => acc * l.odds, 1)
  const potentialWin = legs.length >= 2 ? Math.round(totalOdds * stake) : 0
  const stakeValid   = stake >= 100 && stake <= 1000 && stake <= availablePoints
  const canSubmit    = !loading && legs.length >= 2 && stakeValid

  function addLeg(match: Match, opt: BetOption) {
    if (addedMatchIds.has(match.id)) removeLeg(match.id)
    setLegs(prev => [...prev, {
      matchId: match.id,
      matchLabel: `${match.home_team} vs ${match.away_team}`,
      betType: opt.betType,
      label: opt.label,
      odds: opt.odds,
      predictionResult: opt.predictionResult,
      predictionBool: opt.predictionBool,
    }])
    setResult(null)
  }

  function removeLeg(matchId: string) {
    setLegs(prev => prev.filter(l => l.matchId !== matchId))
  }

  function isSelected(matchId: string, opt: BetOption) {
    return legs.some(l =>
      l.matchId === matchId &&
      l.betType === opt.betType &&
      l.predictionResult === opt.predictionResult &&
      l.predictionBool === opt.predictionBool
    )
  }

  async function handleSubmit() {
    setResult(null)
    if (legs.length < 2) return setResult({ ok: false, message: 'Minimum 2 sélections.' })
    if (!stakeValid)     return setResult({ ok: false, message: 'Mise invalide.' })
    setLoading(true)
    try {
      const res = await fetch('/api/combos/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legs: legs.map(l => ({
            matchId: l.matchId, betType: l.betType,
            predictionResult: l.predictionResult, predictionBool: l.predictionBool,
          })),
          stake,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResult({ ok: false, message: data.error ?? 'Erreur inconnue.' })
      } else {
        setResult({ ok: true, message: `Combiné placé ! Gain potentiel : ${data.potentialWin.toLocaleString('fr-FR')} pts` })
        setLegs([])
      }
    } catch {
      setResult({ ok: false, message: 'Erreur réseau.' })
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>Connecte-toi pour créer un combiné</p>
        <a
          href="/api/auth/login"
          className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl"
          style={{ background: '#5865F2', color: '#fff' }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
          </svg>
          Se connecter avec Discord
        </a>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">

      {/* ── Match list ── */}
      <div className="space-y-2.5">
        {matches.length === 0 && (
          <div
            className="rounded-2xl p-10 text-center"
            style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}
          >
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Aucun match disponible pour l'instant.</p>
          </div>
        )}
        {matches.map(match => {
          const opts   = getOptions(match)
          const hasLeg = addedMatchIds.has(match.id)
          const homeFlagUrl = getFlagUrl(match.home_team, '20x15')
          const awayFlagUrl = getFlagUrl(match.away_team, '20x15')
          return (
            <div
              key={match.id}
              className="relative rounded-2xl overflow-hidden transition-all duration-200"
              style={{
                background: 'var(--bg-2)',
                border: `1.5px solid ${hasLeg ? 'rgba(240,180,41,.45)' : 'var(--border)'}`,
                boxShadow: hasLeg ? '0 0 0 1px rgba(240,180,41,.08)' : 'none',
              }}
            >
              {/* Gold top bar when a leg is selected */}
              {hasLeg && (
                <div
                  className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{ background: 'linear-gradient(90deg, transparent, #F0B429 30%, #FFD060 70%, transparent)' }}
                />
              )}

              <div className="px-4 pt-4 pb-3.5">
                {/* Match header row */}
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    {homeFlagUrl && <img src={homeFlagUrl} alt="" width={16} height={12} className="rounded-sm shrink-0" />}
                    <span
                      className="font-display text-base leading-none"
                      style={{ color: 'var(--text)', letterSpacing: '.04em' }}
                    >
                      {match.home_team.toUpperCase()}
                    </span>
                    <span className="text-xs font-bold" style={{ color: 'var(--border-2)' }}>VS</span>
                    <span
                      className="font-display text-base leading-none"
                      style={{ color: 'var(--text)', letterSpacing: '.04em' }}
                    >
                      {match.away_team.toUpperCase()}
                    </span>
                    {awayFlagUrl && <img src={awayFlagUrl} alt="" width={16} height={12} className="rounded-sm shrink-0" />}
                  </div>
                  {hasLeg && (
                    <button
                      onClick={() => removeLeg(match.id)}
                      className="shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors"
                      style={{ background: 'rgba(239,68,68,.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,.2)' }}
                    >
                      <X className="w-2.5 h-2.5" />Retirer
                    </button>
                  )}
                </div>

                <p className="text-[10px] mb-3" style={{ color: 'var(--muted)' }}>
                  {formatDate(match.kickoff_at)}
                  {match.phase_multiplier > 1 && (
                    <span
                      className="ml-2 font-bold"
                      style={{ color: '#F0B429' }}
                    >
                      ×{match.phase_multiplier} bonus
                    </span>
                  )}
                </p>

                {/* Bet option pills */}
                <div className="flex flex-wrap gap-1.5">
                  {opts.map(opt => {
                    const sel = isSelected(match.id, opt)
                    return (
                      <button
                        key={`${opt.betType}-${opt.predictionResult ?? opt.predictionBool}`}
                        onClick={() => addLeg(match, opt)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
                        style={{
                          background: sel
                            ? 'linear-gradient(135deg, rgba(240,180,41,.2) 0%, rgba(240,180,41,.07) 100%)'
                            : 'var(--bg)',
                          border: `1.5px solid ${sel ? '#F0B429' : 'var(--border)'}`,
                          transform: sel ? 'translateY(-1px)' : 'none',
                          boxShadow: sel ? '0 4px 12px rgba(240,180,41,.12)' : 'none',
                        }}
                      >
                        <span
                          className="text-xs font-medium leading-none"
                          style={{ color: sel ? '#D8E6F3' : 'var(--muted)' }}
                        >
                          {opt.label}
                        </span>
                        <span className="font-mono text-xs font-bold" style={{ color: '#F0B429' }}>
                          ×{opt.odds.toFixed(2)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Combo panel ── */}
      <div className="lg:col-span-1">
        <div
          className="rounded-2xl overflow-hidden sticky top-[72px]"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}
        >
          {/* Panel header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ background: 'var(--bg-3)', borderBottom: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-2">
              <Shuffle className="w-4 h-4" style={{ color: '#F0B429' }} />
              <span className="font-display text-base tracking-[.06em]" style={{ color: 'var(--text)' }}>
                MON COMBINÉ
              </span>
            </div>
            <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
              {legs.length}<span style={{ color: 'var(--border-2)' }}>/10</span>
            </span>
          </div>

          <div className="p-4 space-y-4">

            {/* Legs or empty state */}
            {legs.length === 0 ? (
              <div
                className="rounded-xl p-5 text-center"
                style={{ background: 'var(--bg)', border: '1px dashed var(--border)' }}
              >
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  Clique sur une cote pour l'ajouter
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {legs.map((leg, i) => (
                  <div
                    key={leg.matchId}
                    className="rounded-xl px-3 py-2.5 group"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                  >
                    <p
                      className="text-[10px] mb-1 truncate"
                      style={{ color: 'var(--muted)' }}
                    >
                      {leg.matchLabel}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
                        {leg.label}
                      </span>
                      <span className="font-mono text-sm font-bold" style={{ color: '#F0B429' }}>
                        ×{leg.odds.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total odds + stake + submit when 2+ legs */}
            {legs.length >= 2 && (
              <>
                {/* Total odds */}
                <div
                  className="rounded-xl px-4 py-3 flex items-center justify-between"
                  style={{ background: 'rgba(240,180,41,.06)', border: '1px solid rgba(240,180,41,.18)' }}
                >
                  <span className="text-[10px] font-semibold tracking-widest" style={{ color: 'var(--muted)' }}>
                    COTE TOTALE
                  </span>
                  <span className="font-mono font-bold text-xl" style={{ color: '#F0B429' }}>
                    ×{totalOdds.toFixed(2)}
                  </span>
                </div>

                {/* Stake */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
                      Mise (100–1 000)
                    </span>
                    <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
                      {availablePoints.toLocaleString('fr-FR')} dispo
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    {[100, 200, 500, 1000].map(v => {
                      const active = stake === v
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setStake(Math.min(v, availablePoints, 1000))}
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
                    max={Math.min(1000, availablePoints)}
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
                      GAIN POTENTIEL
                    </p>
                    <div className="text-right">
                      <span className="font-display text-2xl" style={{ color: '#22C55E', letterSpacing: '.04em' }}>
                        +{potentialWin.toLocaleString('fr-FR')}
                      </span>
                      <p className="text-[9px] tracking-widest mt-0.5 uppercase" style={{ color: 'var(--muted)' }}>pts</p>
                    </div>
                  </div>
                )}
              </>
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
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full py-3.5 rounded-xl font-display text-lg tracking-[.08em] transition-all"
              style={{
                background: canSubmit
                  ? 'linear-gradient(135deg, #F0B429 0%, #FFD060 100%)'
                  : 'var(--bg)',
                color:  canSubmit ? '#07101E' : 'var(--muted)',
                border: `1.5px solid ${canSubmit ? '#F0B429' : 'var(--border)'}`,
                boxShadow: canSubmit ? '0 4px 20px rgba(240,180,41,.2)' : 'none',
              }}
              onMouseDown={(e: any) => { if (canSubmit) e.currentTarget.style.transform = 'scale(0.98)' }}
              onMouseUp={(e: any)   => { e.currentTarget.style.transform = 'none' }}
            >
              {loading ? 'Envoi…' :
                legs.length < 2
                  ? `Encore ${2 - legs.length} sélection${legs.length === 0 ? 's' : ''}`
                  : `CONFIRMER × ${totalOdds.toFixed(2)}`}
            </button>

          </div>
        </div>
      </div>

    </div>
  )
}
