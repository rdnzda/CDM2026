'use client'

import { useState, useMemo } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'

type Match = {
  id: string; home_team: string; away_team: string; phase_multiplier: number
  odds_home: number|null; odds_draw: number|null; odds_away: number|null
  odds_btts_yes: number|null; odds_btts_no: number|null
  odds_over25: number|null; odds_under25: number|null
  odds_red_card_yes: number|null; odds_et_yes: number|null
}
type ExactOdd  = { id: string; score_home: number; score_away: number; odds: number }
type ScorerOdd = { id: string; player_name: string; team: string; odds: number }
type Tab = '1x2' | 'score' | 'buteur' | 'speciaux'

function getResultFromScore(h: number, a: number): 'home' | 'draw' | 'away' {
  if (h > a) return 'home'
  if (h < a) return 'away'
  return 'draw'
}

export default function BetForm({ match, exactScoreOdds, scorerOdds, isAuthenticated, availablePoints }: {
  match: Match; exactScoreOdds: ExactOdd[]; scorerOdds: ScorerOdd[]
  isAuthenticated: boolean; availablePoints: number
}) {
  const [predResult, setPredResult]         = useState<'home'|'draw'|'away'|null>(null)
  const [selectedScore, setSelectedScore]   = useState<{ h: number; a: number }|null>(null)
  const [selectedScorer, setSelectedScorer] = useState<string|null>(null)
  const [scorerQuery, setScorerQuery]       = useState('')
  const [scoreFilter, setScoreFilter]       = useState<'all'|'home'|'draw'|'away'>('all')
  const [stake, setStake]                   = useState(200)
  const [loading, setLoading]               = useState(false)
  const [feedback, setFeedback]             = useState<{ ok: boolean; msg: string }|null>(null)
  const [specialSel, setSpecialSel]         = useState<string|null>(null)
  const [specialLoading, setSpecialLoading] = useState(false)
  const [specialFeedback, setSpecialFeedback] = useState<{ ok: boolean; msg: string }|null>(null)

  const specials = [
    { k: 'btts_yes',  l: 'BTTS Oui',     bt: 'btts',       pb: true,  odds: match.odds_btts_yes  },
    { k: 'btts_no',   l: 'BTTS Non',     bt: 'btts',       pb: false, odds: match.odds_btts_no   },
    { k: 'over25',    l: 'Over 2.5',     bt: 'over_under', pb: true,  odds: match.odds_over25    },
    { k: 'under25',   l: 'Under 2.5',    bt: 'over_under', pb: false, odds: match.odds_under25   },
    { k: 'red_yes',   l: 'Carton rouge', bt: 'red_card',   pb: true,  odds: match.odds_red_card_yes },
    { k: 'et_yes',    l: 'Prolongations',bt: 'extra_time', pb: true,  odds: match.odds_et_yes    },
  ].filter(s => s.odds)

  const TABS: { id: Tab; label: string }[] = [
    { id: '1x2',      label: '1X2'      },
    { id: 'score',    label: 'Score'    },
    { id: 'buteur',   label: 'Buteur'   },
    { id: 'speciaux', label: 'Spéciaux' },
  ].filter(t =>
    t.id === '1x2'      ? !!(match.odds_home || match.odds_draw || match.odds_away) :
    t.id === 'score'    ? exactScoreOdds.length > 0 :
    t.id === 'buteur'   ? true :
    specials.length > 0
  ) as { id: Tab; label: string }[]

  const [activeTab, setActiveTab] = useState<Tab>(TABS[0]?.id ?? '1x2')

  // --- derived ---
  const baseOdds = predResult === 'home' ? match.odds_home
    : predResult === 'draw' ? match.odds_draw
    : predResult === 'away' ? match.odds_away : null

  const scoreOdds = selectedScore
    ? exactScoreOdds.find(o => o.score_home === selectedScore.h && o.score_away === selectedScore.a)?.odds ?? null
    : null

  const scorerOddsVal = selectedScorer
    ? scorerOdds.find(o => o.player_name === selectedScorer)?.odds ?? null
    : null

  let combinedOdds: number | null = baseOdds
  if (baseOdds) {
    if (scoreOdds) combinedOdds = scoreOdds
    if (scorerOddsVal) combinedOdds = (combinedOdds ?? baseOdds) * scorerOddsVal
  }

  const hasBonus = !!(scoreOdds || scorerOddsVal)
  const betType  = hasBonus ? 'result_combo' : 'result'
  const selSpecial = specials.find(s => s.k === specialSel)

  const activeOdds = activeTab === 'speciaux' ? (selSpecial?.odds ?? null) : combinedOdds
  const gain = activeOdds && stake >= 100
    ? Math.round(Number(activeOdds) * stake * match.phase_multiplier)
    : null
  const baseGain = baseOdds && stake >= 100
    ? Math.round(baseOdds * stake * match.phase_multiplier)
    : null

  const canBet = isAuthenticated && stake >= 100 && stake <= 2000 && stake <= availablePoints && (
    activeTab === 'speciaux' ? !!selSpecial :
    activeTab === 'score'    ? !!selectedScore :
    activeTab === 'buteur'   ? (!!predResult && !!selectedScorer) :
    !!predResult
  )

  const filteredScores = useMemo(() => {
    if (scoreFilter === 'all') return exactScoreOdds
    return exactScoreOdds.filter(o => getResultFromScore(o.score_home, o.score_away) === scoreFilter)
  }, [exactScoreOdds, scoreFilter])

  const filteredScorers = useMemo(() => {
    if (!scorerQuery.trim()) return scorerOdds
    return scorerOdds.filter(o => o.player_name.toLowerCase().includes(scorerQuery.toLowerCase()))
  }, [scorerOdds, scorerQuery])

  function handleResultClick(val: 'home' | 'draw' | 'away') {
    setPredResult(val)
    if (selectedScore && getResultFromScore(selectedScore.h, selectedScore.a) !== val) setSelectedScore(null)
    setFeedback(null)
  }

  function handleScoreClick(o: ExactOdd) {
    setSelectedScore({ h: o.score_home, a: o.score_away })
    setPredResult(getResultFromScore(o.score_home, o.score_away))
    setFeedback(null)
  }

  async function submitSpecial() {
    if (!selSpecial) return
    setSpecialLoading(true); setSpecialFeedback(null)
    try {
      const res = await fetch('/api/bets/place', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: match.id, stake, betType: selSpecial.bt, predictionBool: selSpecial.pb }),
      })
      const data = await res.json()
      if (!res.ok) setSpecialFeedback({ ok: false, msg: data.error ?? 'Erreur.' })
      else { setSpecialFeedback({ ok: true, msg: `Pari placé — gain max : ${data.pointsIfWon?.toLocaleString('fr-FR')} pts` }); setSpecialSel(null) }
    } catch { setSpecialFeedback({ ok: false, msg: 'Erreur réseau.' }) }
    finally { setSpecialLoading(false) }
  }

  async function submitMain(e: React.FormEvent) {
    e.preventDefault()
    setFeedback(null)
    if (!predResult) return setFeedback({ ok: false, msg: 'Choisis un résultat.' })
    const body: Record<string, unknown> = { matchId: match.id, stake, betType, predictionResult: predResult }
    if (selectedScore) { body.predictionScoreHome = selectedScore.h; body.predictionScoreAway = selectedScore.a }
    if (selectedScorer) body.predictionScorer = selectedScorer
    setLoading(true)
    try {
      const res  = await fetch('/api/bets/place', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) setFeedback({ ok: false, msg: data.error ?? 'Erreur.' })
      else {
        setFeedback({ ok: true, msg: `Pari placé — gain max : ${data.pointsIfWon?.toLocaleString('fr-FR')} pts` })
        setPredResult(null); setSelectedScore(null); setSelectedScorer(null); setScorerQuery('')
      }
    } catch { setFeedback({ ok: false, msg: 'Erreur réseau.' }) }
    finally { setLoading(false) }
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
        <p className="mb-4 text-sm" style={{ color: 'var(--muted)' }}>Connecte-toi pour parier</p>
        <a href="/api/auth/login" className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl" style={{ background: '#5865F2', color: '#fff' }}>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
          </svg>
          Se connecter avec Discord
        </a>
      </div>
    )
  }

  // Shared stake block rendered inside each tab
  const StakeBlock = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>Mise (100–2 000)</span>
        <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
          {availablePoints.toLocaleString('fr-FR')} dispo
        </span>
      </div>
      <div className="flex gap-1.5">
        {[100, 200, 500, 1000, 2000].map(v => {
          const active = stake === v
          return (
            <button key={v} type="button"
              onClick={() => setStake(Math.min(v, availablePoints, 2000))}
              className="flex-1 py-2 rounded-lg text-[11px] font-bold transition-all"
              style={{
                background: active ? 'rgba(240,180,41,.15)' : 'var(--bg)',
                border: `1.5px solid ${active ? '#F0B429' : 'var(--border)'}`,
                color: active ? '#F0B429' : 'var(--muted)',
              }}>
              {v >= 1000 ? `${v / 1000}k` : v}
            </button>
          )
        })}
      </div>
      <input
        type="number" min={100} max={Math.min(2000, availablePoints)} value={stake}
        onChange={e => setStake(Number(e.target.value))}
        className="w-full px-4 py-2.5 rounded-xl font-mono text-sm outline-none"
        style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', color: 'var(--text)', transition: 'border-color .15s' }}
        onFocus={(e: any) => e.target.style.borderColor = '#F0B429'}
        onBlur={(e: any) => e.target.style.borderColor = 'var(--border)'}
      />
    </div>
  )

  const GainBlock = ({ isSpecial }: { isSpecial?: boolean }) => {
    if (!gain) return null
    const color = isSpecial ? '#22C55E' : hasBonus ? '#F0B429' : '#22C55E'
    const bg    = isSpecial ? 'rgba(34,197,94,.05)'  : hasBonus ? 'rgba(240,180,41,.05)' : 'rgba(34,197,94,.05)'
    const bdr   = isSpecial ? 'rgba(34,197,94,.2)'   : hasBonus ? 'rgba(240,180,41,.2)'  : 'rgba(34,197,94,.2)'
    return (
      <div className="rounded-xl px-4 py-3.5 flex items-center justify-between"
        style={{ background: bg, border: `1px solid ${bdr}` }}>
        <div>
          <p className="text-[10px] font-semibold tracking-widest" style={{ color: 'var(--muted)' }}>
            {hasBonus && !isSpecial ? 'SI TOUT CORRECT' : 'GAIN POTENTIEL'}
          </p>
          {hasBonus && !isSpecial && baseGain && gain !== baseGain && (
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>
              résultat seul : +{baseGain.toLocaleString('fr-FR')}
            </p>
          )}
        </div>
        <div className="text-right">
          <span className="font-display text-2xl" style={{ color, letterSpacing: '.04em' }}>
            +{gain.toLocaleString('fr-FR')}
          </span>
          <p className="text-[9px] tracking-widest mt-0.5 uppercase" style={{ color: 'var(--muted)' }}>pts</p>
        </div>
      </div>
    )
  }

  const FeedbackBlock = ({ fb }: { fb: { ok: boolean; msg: string } | null }) => {
    if (!fb) return null
    return (
      <div className="px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2"
        style={{
          background: fb.ok ? 'rgba(34,197,94,.08)' : 'rgba(239,68,68,.08)',
          border: `1px solid ${fb.ok ? 'rgba(34,197,94,.2)' : 'rgba(239,68,68,.2)'}`,
          color: fb.ok ? '#22C55E' : '#EF4444',
        }}>
        {fb.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
        {fb.msg}
      </div>
    )
  }

  const SubmitButton = ({ disabled, loading: l, label }: { disabled: boolean; loading: boolean; label: string }) => (
    <button
      type="submit"
      disabled={disabled || l}
      className="w-full py-3.5 rounded-xl font-display text-lg tracking-[.08em] transition-all"
      style={{
        background:  !disabled && !l ? 'linear-gradient(135deg, #F0B429 0%, #FFD060 100%)' : 'var(--bg)',
        color:       !disabled && !l ? '#07101E' : 'var(--muted)',
        border:      `1.5px solid ${!disabled && !l ? '#F0B429' : 'var(--border)'}`,
        boxShadow:   !disabled && !l ? '0 4px 20px rgba(240,180,41,.2)' : 'none',
      }}
      onMouseDown={(e: any) => { if (!disabled && !l) e.currentTarget.style.transform = 'scale(0.98)' }}
      onMouseUp={(e: any) => { e.currentTarget.style.transform = 'none' }}
    >
      {l ? 'Envoi…' : label}
    </button>
  )

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>

      {/* Tab bar */}
      <div className="flex" style={{ borderBottom: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className="relative flex-1 py-3.5 text-xs font-semibold tracking-wider transition-colors"
            style={{ color: activeTab === t.id ? '#F0B429' : 'var(--muted)', background: 'transparent' }}
          >
            {t.label}
            {activeTab === t.id && (
              <span
                className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full"
                style={{ background: '#F0B429' }}
              />
            )}
          </button>
        ))}
      </div>

      <div className="p-5">

        {/* ── 1X2 ── */}
        {activeTab === '1x2' && (
          <form onSubmit={submitMain} className="space-y-5">
            <div className="grid grid-cols-3 gap-2.5">
              {([
                { val: 'home' as const, label: match.home_team, odds: match.odds_home },
                { val: 'draw' as const, label: 'Nul',           odds: match.odds_draw },
                { val: 'away' as const, label: match.away_team, odds: match.odds_away },
              ] as const).map(o => {
                if (!o.odds) return null
                const active = predResult === o.val
                return (
                  <button
                    key={o.val}
                    type="button"
                    onClick={() => handleResultClick(o.val)}
                    className="relative flex flex-col items-center gap-2.5 pt-5 pb-4 px-2 rounded-xl overflow-hidden transition-all"
                    style={{
                      background: active
                        ? 'linear-gradient(160deg, rgba(240,180,41,.2) 0%, rgba(240,180,41,.06) 100%)'
                        : 'var(--bg)',
                      border: `1.5px solid ${active ? '#F0B429' : 'var(--border)'}`,
                      transform: active ? 'translateY(-2px)' : 'none',
                      boxShadow: active ? '0 8px 28px rgba(240,180,41,.12)' : 'none',
                    }}
                  >
                    {active && (
                      <span
                        className="absolute top-0 left-0 right-0 h-[2px]"
                        style={{ background: 'linear-gradient(90deg, transparent, #F0B429, transparent)' }}
                      />
                    )}
                    <span
                      className="text-[10px] font-semibold text-center leading-tight w-full px-1 truncate uppercase tracking-wide"
                      style={{ color: active ? '#D8E6F3' : 'var(--muted)' }}
                    >
                      {o.label}
                    </span>
                    <span className="font-mono font-bold text-xl leading-none" style={{ color: '#F0B429' }}>
                      ×{Number(o.odds).toFixed(2)}
                    </span>
                    {active && (
                      <span
                        className="text-[8px] font-bold tracking-[.14em] uppercase px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(240,180,41,.2)', color: '#F0B429' }}
                      >
                        CHOISI
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
              <StakeBlock />
            </div>

            {predResult && <GainBlock />}
            <FeedbackBlock fb={feedback} />
            <SubmitButton
              disabled={!canBet}
              loading={loading}
              label={combinedOdds ? `PARIER × ${combinedOdds.toFixed(2)}` : 'PARIER'}
            />
          </form>
        )}

        {/* ── SCORE ── */}
        {activeTab === 'score' && (
          <form onSubmit={submitMain} className="space-y-4">
            <div className="flex gap-1.5">
              {(['all', 'home', 'draw', 'away'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setScoreFilter(f)}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                  style={{
                    background: scoreFilter === f ? 'rgba(240,180,41,.15)' : 'var(--bg)',
                    border: `1.5px solid ${scoreFilter === f ? '#F0B429' : 'var(--border)'}`,
                    color: scoreFilter === f ? '#F0B429' : 'var(--muted)',
                  }}
                >
                  {f === 'all' ? 'Tous' : f === 'home' ? '1' : f === 'draw' ? 'X' : '2'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-1.5 max-h-52 overflow-y-auto pr-0.5">
              {filteredScores.map(o => {
                const isSel = selectedScore?.h === o.score_home && selectedScore?.a === o.score_away
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => handleScoreClick(o)}
                    className="rounded-xl py-3 text-center transition-all"
                    style={{
                      background: isSel
                        ? 'linear-gradient(160deg, rgba(240,180,41,.2) 0%, rgba(240,180,41,.06) 100%)'
                        : 'var(--bg)',
                      border: `1.5px solid ${isSel ? '#F0B429' : 'var(--border)'}`,
                      transform: isSel ? 'scale(1.04)' : 'none',
                    }}
                  >
                    <p className="font-mono font-bold text-sm" style={{ color: isSel ? '#F0B429' : 'var(--text)' }}>
                      {o.score_home}–{o.score_away}
                    </p>
                    <p className="font-mono text-[10px] mt-0.5" style={{ color: isSel ? '#F0B429' : 'var(--muted)' }}>
                      ×{o.odds.toFixed(2)}
                    </p>
                  </button>
                )
              })}
            </div>

            {selectedScore && (
              <button
                type="button"
                onClick={() => { setSelectedScore(null); setPredResult(null) }}
                className="text-[10px] w-full text-center py-0.5 opacity-50 hover:opacity-100 transition-opacity"
                style={{ color: 'var(--muted)' }}
              >
                Retirer la sélection
              </button>
            )}

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
              <StakeBlock />
            </div>
            {selectedScore && <GainBlock />}
            <FeedbackBlock fb={feedback} />
            <SubmitButton
              disabled={!canBet}
              loading={loading}
              label={scoreOdds ? `PARIER × ${scoreOdds.toFixed(2)}` : 'PARIER'}
            />
          </form>
        )}

        {/* ── BUTEUR ── */}
        {activeTab === 'buteur' && (
          <form onSubmit={submitMain} className="space-y-4">

            {/* Compact result picker */}
            <div>
              <p className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>
                Résultat
              </p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { val: 'home' as const, label: match.home_team, odds: match.odds_home },
                  { val: 'draw' as const, label: 'Nul',           odds: match.odds_draw },
                  { val: 'away' as const, label: match.away_team, odds: match.odds_away },
                ] as const).map(o => {
                  if (!o.odds) return null
                  const active = predResult === o.val
                  return (
                    <button
                      key={o.val}
                      type="button"
                      onClick={() => handleResultClick(o.val)}
                      className="relative flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl overflow-hidden transition-all"
                      style={{
                        background: active ? 'rgba(240,180,41,.15)' : 'var(--bg)',
                        border: `1.5px solid ${active ? '#F0B429' : 'var(--border)'}`,
                        transform: active ? 'translateY(-1px)' : 'none',
                      }}
                    >
                      {active && (
                        <span
                          className="absolute top-0 left-0 right-0 h-[2px]"
                          style={{ background: 'linear-gradient(90deg, transparent, #F0B429, transparent)' }}
                        />
                      )}
                      <span
                        className="text-[10px] font-semibold truncate w-full text-center uppercase tracking-wide"
                        style={{ color: active ? 'var(--text)' : 'var(--muted)' }}
                      >
                        {o.label}
                      </span>
                      <span className="font-mono text-sm font-bold leading-none" style={{ color: '#F0B429' }}>
                        ×{Number(o.odds).toFixed(2)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Scorer search */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <p className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>
                Buteur
              </p>
            </div>

            <input
              type="text"
              value={scorerQuery}
              onChange={e => setScorerQuery(e.target.value)}
              placeholder="Rechercher un joueur…"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', color: 'var(--text)', transition: 'border-color .15s' }}
              onFocus={(e: any) => e.target.style.borderColor = '#F0B429'}
              onBlur={(e: any) => e.target.style.borderColor = 'var(--border)'}
            />

            {scorerOdds.length === 0 ? (
              <div
                className="rounded-xl px-4 py-6 text-center text-xs"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)' }}
              >
                Les cotes buteurs ne sont pas encore disponibles pour ce match.
              </div>
            ) : filteredScorers.length === 0 ? (
              <div className="text-center py-4 text-xs" style={{ color: 'var(--muted)' }}>
                Aucun joueur trouvé.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-0.5">
                {filteredScorers.map(o => {
                  const isSel = selectedScorer === o.player_name
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => { setSelectedScorer(isSel ? null : o.player_name); setFeedback(null) }}
                      className="flex items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all"
                      style={{
                        background: isSel ? 'rgba(240,180,41,.1)' : 'var(--bg)',
                        border: `1.5px solid ${isSel ? '#F0B429' : 'var(--border)'}`,
                      }}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>{o.player_name}</p>
                        <p className="text-[10px]" style={{ color: 'var(--muted)' }}>{o.team}</p>
                      </div>
                      <span className="font-mono text-sm font-bold ml-2 shrink-0" style={{ color: '#F0B429' }}>
                        ×{o.odds.toFixed(2)}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {selectedScorer && (
              <button
                type="button"
                onClick={() => { setSelectedScorer(null); setScorerQuery('') }}
                className="text-[10px] w-full text-center py-0.5 opacity-50 hover:opacity-100 transition-opacity"
                style={{ color: 'var(--muted)' }}
              >
                Retirer le buteur
              </button>
            )}

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
              <StakeBlock />
            </div>
            {predResult && selectedScorer && <GainBlock />}
            <FeedbackBlock fb={feedback} />
            <SubmitButton
              disabled={!canBet}
              loading={loading}
              label={combinedOdds ? `PARIER × ${combinedOdds.toFixed(2)}` : 'PARIER'}
            />
          </form>
        )}

        {/* ── SPÉCIAUX ── */}
        {activeTab === 'speciaux' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-2">
              {specials.map(s => {
                const active = specialSel === s.k
                return (
                  <button
                    key={s.k}
                    type="button"
                    onClick={() => { setSpecialSel(active ? null : s.k); setSpecialFeedback(null) }}
                    className="relative flex flex-col items-center gap-2 py-4 px-3 rounded-xl overflow-hidden transition-all"
                    style={{
                      background: active
                        ? 'linear-gradient(160deg, rgba(240,180,41,.2) 0%, rgba(240,180,41,.06) 100%)'
                        : 'var(--bg)',
                      border: `1.5px solid ${active ? '#F0B429' : 'var(--border)'}`,
                      transform: active ? 'translateY(-1px)' : 'none',
                      boxShadow: active ? '0 6px 20px rgba(240,180,41,.1)' : 'none',
                    }}
                  >
                    {active && (
                      <span
                        className="absolute top-0 left-0 right-0 h-[2px]"
                        style={{ background: 'linear-gradient(90deg, transparent, #F0B429, transparent)' }}
                      />
                    )}
                    <span className="text-[11px] font-semibold" style={{ color: active ? '#D8E6F3' : 'var(--muted)' }}>
                      {s.l}
                    </span>
                    <span className="font-mono font-bold text-xl leading-none" style={{ color: '#F0B429' }}>
                      ×{Number(s.odds).toFixed(2)}
                    </span>
                  </button>
                )
              })}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
              <StakeBlock />
            </div>
            {selSpecial && <GainBlock isSpecial />}
            <FeedbackBlock fb={specialFeedback} />

            <button
              type="button"
              disabled={!selSpecial || specialLoading}
              onClick={submitSpecial}
              className="w-full py-3.5 rounded-xl font-display text-lg tracking-[.08em] transition-all"
              style={{
                background: selSpecial && !specialLoading ? 'linear-gradient(135deg, #F0B429 0%, #FFD060 100%)' : 'var(--bg)',
                color:  selSpecial && !specialLoading ? '#07101E' : 'var(--muted)',
                border: `1.5px solid ${selSpecial && !specialLoading ? '#F0B429' : 'var(--border)'}`,
                boxShadow: selSpecial && !specialLoading ? '0 4px 20px rgba(240,180,41,.2)' : 'none',
              }}
              onMouseDown={(e: any) => { if (selSpecial && !specialLoading) e.currentTarget.style.transform = 'scale(0.98)' }}
              onMouseUp={(e: any) => { e.currentTarget.style.transform = 'none' }}
            >
              {specialLoading ? 'Envoi…' : selSpecial ? `PARIER × ${Number(selSpecial.odds).toFixed(2)}` : 'PARIER'}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
