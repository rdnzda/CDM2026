'use client'

import { useState, useMemo } from 'react'
import { CheckCircle2, XCircle, Zap, Shield, Clock3 } from 'lucide-react'

type Match = {
  id: string; home_team: string; away_team: string; phase: string; phase_multiplier: number
  odds_home: number|null; odds_draw: number|null; odds_away: number|null
  odds_btts_yes: number|null; odds_btts_no: number|null
  odds_over25: number|null; odds_under25: number|null
  odds_red_card_yes: number|null; odds_et_yes: number|null
}
type ExactOdd  = { id: string; score_home: number; score_away: number; odds: number }
type ScorerOdd = { id: string; player_name: string; team: string; odds: number }
type Boost     = { id: string; boost_type: 'x15' | 'x20_exact'; phase: string }
type Wildcard  = { id: string; type: 'double' | 'insurance' | 'last_minute' }
type Tab = '1x2' | 'score' | 'buteur' | 'speciaux'

const KNOCKOUT_POINTS: Record<string, number> = { result: 200, exact_score: 300, scorer: 150 }

function getResultFromScore(h: number, a: number): 'home' | 'draw' | 'away' {
  if (h > a) return 'home'
  if (h < a) return 'away'
  return 'draw'
}

export default function BetForm({ match, exactScoreOdds, scorerOdds, isAuthenticated, availablePoints, userBoosts, userWildcards }: {
  match: Match; exactScoreOdds: ExactOdd[]; scorerOdds: ScorerOdd[]
  isAuthenticated: boolean; availablePoints: number; userBoosts: Boost[]; userWildcards: Wildcard[]
}) {
  const isKnockout = match.phase !== 'group'

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
        <p className="mb-4 text-sm" style={{ color: 'var(--muted)' }}>Connecte-toi pour prédire</p>
        <a href="/api/auth/login" className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl" style={{ background: '#5865F2', color: '#fff' }}>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
          </svg>
          Se connecter avec Discord
        </a>
      </div>
    )
  }

  return isKnockout
    ? <KnockoutForm match={match} scorerOdds={scorerOdds} userBoosts={userBoosts} />
    : <GroupForm match={match} exactScoreOdds={exactScoreOdds} scorerOdds={scorerOdds}
        availablePoints={availablePoints} userBoosts={userBoosts} userWildcards={userWildcards} />
}

// ══════════════════════════════════════════════════════
// KNOCKOUT FORM — prédictions libres, points fixes
// ══════════════════════════════════════════════════════
function KnockoutForm({ match, scorerOdds, userBoosts }: {
  match: Match; scorerOdds: ScorerOdd[]; userBoosts: Boost[]
}) {
  const [resultPred,  setResultPred]  = useState<'home'|'draw'|'away'|null>(null)
  const [manualH,     setManualH]     = useState(1)
  const [manualA,     setManualA]     = useState(0)
  const [scorerQuery, setScorerQuery] = useState('')
  const [scorerPred,  setScorerPred]  = useState<string|null>(null)

  const [boostId,  setBoostId]  = useState<string|null>(null)
  const [feedback, setFeedback] = useState<Record<string, { ok: boolean; msg: string }>>({})
  const [loading,  setLoading]  = useState<string|null>(null)

  const filteredScorers = useMemo(() =>
    !scorerQuery.trim() ? scorerOdds : scorerOdds.filter(o => o.player_name.toLowerCase().includes(scorerQuery.toLowerCase()))
  , [scorerOdds, scorerQuery])

  const boost = userBoosts.find(b => b.id === boostId) ?? null
  const boostMult = boost?.boost_type === 'x20_exact' ? 2.0 : boost?.boost_type === 'x15' ? 1.5 : 1.0

  async function submit(betType: string, extra: Record<string, unknown> = {}) {
    setLoading(betType)
    const activeBoostId = betType === 'exact_score' ? boostId : (boost?.boost_type === 'x15' ? boostId : null)
    try {
      const res = await fetch('/api/bets/place', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: match.id, betType, ...extra, ...(activeBoostId ? { boostId: activeBoostId } : {}) }),
      })
      const data = await res.json()
      if (!res.ok) setFeedback(f => ({ ...f, [betType]: { ok: false, msg: data.error ?? 'Erreur.' } }))
      else {
        setFeedback(f => ({ ...f, [betType]: { ok: true, msg: `Prédiction enregistrée — +${data.pointsIfWon} pts si correct !` } }))
        if (betType === 'result') setResultPred(null)
        if (betType === 'scorer') { setScorerPred(null); setScorerQuery('') }
        setBoostId(null)
      }
    } catch { setFeedback(f => ({ ...f, [betType]: { ok: false, msg: 'Erreur réseau.' } })) }
    finally { setLoading(null) }
  }

  const scoreResult = getResultFromScore(manualH, manualA)
  const x20Available = userBoosts.some(b => b.boost_type === 'x20_exact' && !boostId?.startsWith(b.id))
  const x15Available = userBoosts.filter(b => b.boost_type === 'x15')

  const FeedbackBlock = ({ type }: { type: string }) => {
    const fb = feedback[type]
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

  const BoostPicker = ({ types }: { types: Array<'x15'|'x20_exact'> }) => {
    const available = userBoosts.filter(b => types.includes(b.boost_type as any))
    if (!available.length) return null
    return (
      <div className="flex flex-wrap gap-1.5">
        {available.map(b => {
          const active = boostId === b.id
          const label = b.boost_type === 'x20_exact' ? '×2.0 Score exact' : '×1.5 Boost'
          return (
            <button key={b.id} type="button"
              onClick={() => setBoostId(active ? null : b.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
              style={{
                background: active ? 'rgba(240,180,41,.2)' : 'rgba(240,180,41,.07)',
                border: `1.5px solid ${active ? '#F0B429' : 'rgba(240,180,41,.3)'}`,
                color: active ? '#F0B429' : 'rgba(200,160,40,.9)',
              }}>
              <Zap className="w-3 h-3" />{label}
            </button>
          )
        })}
      </div>
    )
  }

  const pts = (type: string) => Math.round(KNOCKOUT_POINTS[type] * (
    type === 'exact_score' && boost?.boost_type === 'x20_exact' ? 2.0
    : type !== 'exact_score' && boost?.boost_type === 'x15' ? 1.5
    : 1.0
  ))

  return (
    <div className="space-y-3">

      {/* Header info */}
      <div className="rounded-xl px-4 py-3 flex items-center gap-3"
        style={{ background: 'rgba(240,180,41,.06)', border: '1px solid rgba(240,180,41,.15)' }}>
        <Zap className="w-4 h-4 shrink-0" style={{ color: '#F0B429' }} />
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          Phase éliminatoire — prédictions gratuites. Aucune mise : tu gagnes des points si tu as raison, tu n'en perds pas si tu as tort.
        </p>
      </div>

      {/* ── Prédiction Vainqueur ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--text)' }}>Vainqueur</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>Prédit le résultat du match</p>
          </div>
          <span className="font-display text-2xl" style={{ color: '#22C55E' }}>+{pts('result')}</span>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-2.5">
            {([
              { val: 'home' as const, label: match.home_team, odds: match.odds_home },
              { val: 'draw' as const, label: 'Nul',           odds: match.odds_draw },
              { val: 'away' as const, label: match.away_team, odds: match.odds_away },
            ]).map(o => {
              if (!o.odds) return null
              const active = resultPred === o.val
              return (
                <button key={o.val} type="button" onClick={() => { setResultPred(active ? null : o.val); setFeedback(f => ({ ...f, result: null as any })) }}
                  className="relative flex flex-col items-center gap-2 pt-4 pb-3.5 px-2 rounded-xl overflow-hidden transition-all"
                  style={{
                    background: active ? 'linear-gradient(160deg, rgba(34,197,94,.15) 0%, rgba(34,197,94,.05) 100%)' : 'var(--bg)',
                    border: `1.5px solid ${active ? '#22C55E' : 'var(--border)'}`,
                    transform: active ? 'translateY(-2px)' : 'none',
                  }}>
                  {active && <span className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #22C55E, transparent)' }} />}
                  <span className="text-[10px] font-semibold text-center leading-tight w-full px-1 truncate uppercase tracking-wide" style={{ color: active ? '#D8E6F3' : 'var(--muted)' }}>
                    {o.label}
                  </span>
                  <span className="font-mono text-[11px] font-bold" style={{ color: 'var(--muted)' }}>×{Number(o.odds).toFixed(2)}</span>
                  {active && <span className="text-[8px] font-bold tracking-[.14em] uppercase px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,.2)', color: '#22C55E' }}>CHOISI</span>}
                </button>
              )
            })}
          </div>
          <BoostPicker types={['x15']} />
          <FeedbackBlock type="result" />
          <button type="button" disabled={!resultPred || loading === 'result'}
            onClick={() => resultPred && submit('result', { predictionResult: resultPred })}
            className="w-full py-3 rounded-xl font-display text-base tracking-[.06em] transition-all"
            style={{
              background: resultPred && loading !== 'result' ? 'linear-gradient(135deg, #22C55E 0%, #4ADE80 100%)' : 'var(--bg)',
              color:  resultPred && loading !== 'result' ? '#07101E' : 'var(--muted)',
              border: `1.5px solid ${resultPred && loading !== 'result' ? '#22C55E' : 'var(--border)'}`,
              boxShadow: resultPred && loading !== 'result' ? '0 4px 20px rgba(34,197,94,.2)' : 'none',
            }}>
            {loading === 'result' ? 'Envoi…' : resultPred ? `PRÉDIRE — +${pts('result')} pts` : 'CHOISIR UN RÉSULTAT'}
          </button>
        </div>
      </div>

      {/* ── Prédiction Score exact ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--text)' }}>Score exact</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>Prédit le score final</p>
          </div>
          <span className="font-display text-2xl" style={{ color: '#F0B429' }}>+{pts('exact_score')}</span>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-xl p-4" style={{ background: 'var(--bg)', border: '1.5px solid var(--border)' }}>
            <div className="flex items-center justify-center gap-8">
              <div className="flex flex-col items-center gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide truncate max-w-[80px] text-center" style={{ color: 'var(--muted)' }}>{match.home_team}</p>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setManualH(Math.max(0, manualH - 1))}
                    className="w-8 h-8 rounded-lg font-bold text-lg flex items-center justify-center" style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', color: 'var(--text)' }}>−</button>
                  <span className="font-display text-3xl w-8 text-center" style={{ color: '#F0B429' }}>{manualH}</span>
                  <button type="button" onClick={() => setManualH(Math.min(15, manualH + 1))}
                    className="w-8 h-8 rounded-lg font-bold text-lg flex items-center justify-center" style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', color: 'var(--text)' }}>+</button>
                </div>
              </div>
              <span className="font-display text-2xl" style={{ color: 'var(--border-2)' }}>:</span>
              <div className="flex flex-col items-center gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide truncate max-w-[80px] text-center" style={{ color: 'var(--muted)' }}>{match.away_team}</p>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setManualA(Math.max(0, manualA - 1))}
                    className="w-8 h-8 rounded-lg font-bold text-lg flex items-center justify-center" style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', color: 'var(--text)' }}>−</button>
                  <span className="font-display text-3xl w-8 text-center" style={{ color: '#F0B429' }}>{manualA}</span>
                  <button type="button" onClick={() => setManualA(Math.min(15, manualA + 1))}
                    className="w-8 h-8 rounded-lg font-bold text-lg flex items-center justify-center" style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', color: 'var(--text)' }}>+</button>
                </div>
              </div>
            </div>
            <p className="text-xs font-semibold text-center mt-3" style={{ color: 'var(--muted)' }}>
              {manualH > manualA ? match.home_team : manualH < manualA ? match.away_team : 'Match nul'}
            </p>
          </div>
          <BoostPicker types={['x15', 'x20_exact']} />
          <FeedbackBlock type="exact_score" />
          <button type="button" disabled={loading === 'exact_score'}
            onClick={() => submit('exact_score', { predictionScoreHome: manualH, predictionScoreAway: manualA })}
            className="w-full py-3 rounded-xl font-display text-base tracking-[.06em] transition-all"
            style={{
              background: loading !== 'exact_score' ? 'linear-gradient(135deg, #F0B429 0%, #FFD060 100%)' : 'var(--bg)',
              color:  loading !== 'exact_score' ? '#07101E' : 'var(--muted)',
              border: `1.5px solid ${loading !== 'exact_score' ? '#F0B429' : 'var(--border)'}`,
              boxShadow: loading !== 'exact_score' ? '0 4px 20px rgba(240,180,41,.2)' : 'none',
            }}>
            {loading === 'exact_score' ? 'Envoi…' : `PRÉDIRE ${manualH}–${manualA} — +${pts('exact_score')} pts`}
          </button>
        </div>
      </div>

      {/* ── Prédiction Buteur ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--text)' }}>Buteur</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>Prédit un buteur du match</p>
          </div>
          <span className="font-display text-2xl" style={{ color: '#60A5FA' }}>+{pts('scorer')}</span>
        </div>
        <div className="p-5 space-y-3">
          <input type="text" value={scorerQuery} onChange={e => setScorerQuery(e.target.value)}
            placeholder="Rechercher un joueur…"
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', color: 'var(--text)', transition: 'border-color .15s' }}
            onFocus={(e: any) => e.target.style.borderColor = '#60A5FA'}
            onBlur={(e: any) => e.target.style.borderColor = 'var(--border)'}
          />

          {scorerOdds.length === 0 ? (
            <div className="rounded-xl px-4 py-6 text-center text-xs" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
              Les buteurs ne sont pas encore disponibles pour ce match.
            </div>
          ) : filteredScorers.length === 0 ? (
            <div className="text-center py-4 text-xs" style={{ color: 'var(--muted)' }}>Aucun joueur trouvé.</div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-0.5">
              {filteredScorers.map(o => {
                const isSel = scorerPred === o.player_name
                return (
                  <button key={o.id} type="button"
                    onClick={() => { setScorerPred(isSel ? null : o.player_name); setFeedback(f => ({ ...f, scorer: null as any })) }}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all"
                    style={{ background: isSel ? 'rgba(96,165,250,.1)' : 'var(--bg)', border: `1.5px solid ${isSel ? '#60A5FA' : 'var(--border)'}` }}>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>{o.player_name}</p>
                      <p className="text-[10px]" style={{ color: 'var(--muted)' }}>{o.team}</p>
                    </div>
                    <span className="font-mono text-xs font-bold ml-2 shrink-0" style={{ color: 'var(--muted)' }}>×{o.odds.toFixed(2)}</span>
                  </button>
                )
              })}
            </div>
          )}

          <BoostPicker types={['x15']} />
          <FeedbackBlock type="scorer" />
          <button type="button" disabled={!scorerPred || loading === 'scorer'}
            onClick={() => scorerPred && submit('scorer', { predictionScorer: scorerPred })}
            className="w-full py-3 rounded-xl font-display text-base tracking-[.06em] transition-all"
            style={{
              background: scorerPred && loading !== 'scorer' ? 'linear-gradient(135deg, #60A5FA 0%, #93C5FD 100%)' : 'var(--bg)',
              color:  scorerPred && loading !== 'scorer' ? '#07101E' : 'var(--muted)',
              border: `1.5px solid ${scorerPred && loading !== 'scorer' ? '#60A5FA' : 'var(--border)'}`,
              boxShadow: scorerPred && loading !== 'scorer' ? '0 4px 20px rgba(96,165,250,.2)' : 'none',
            }}>
            {loading === 'scorer' ? 'Envoi…' : scorerPred ? `PRÉDIRE ${scorerPred} — +${pts('scorer')} pts` : 'CHOISIR UN JOUEUR'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// GROUP FORM — ancien système avec mise (inchangé)
// ══════════════════════════════════════════════════════
function GroupForm({ match, exactScoreOdds, scorerOdds, availablePoints, userBoosts, userWildcards }: {
  match: Match; exactScoreOdds: ExactOdd[]; scorerOdds: ScorerOdd[]
  availablePoints: number; userBoosts: Boost[]; userWildcards: Wildcard[]
}) {
  const [predResult, setPredResult]         = useState<'home'|'draw'|'away'|null>(null)
  const [selectedScore, setSelectedScore]   = useState<{ h: number; a: number }|null>(null)
  const [selectedScorer, setSelectedScorer] = useState<string|null>(null)
  const [scorerQuery, setScorerQuery]       = useState('')
  const [scoreFilter, setScoreFilter]       = useState<'all'|'home'|'draw'|'away'>('all')
  const [manualH, setManualH]               = useState(1)
  const [manualA, setManualA]               = useState(0)
  const [stake, setStake]                   = useState(200)
  const [selectedBoostId, setSelectedBoostId] = useState<string|null>(null)
  const [selectedWildcardId, setSelectedWildcardId] = useState<string|null>(null)
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

  const hasBasicOdds = !!(match.odds_home || match.odds_draw || match.odds_away)
  const TABS: { id: Tab; label: string }[] = [
    { id: '1x2',      label: '1X2'      },
    { id: 'score',    label: 'Score'    },
    { id: 'buteur',   label: 'Buteur'   },
    { id: 'speciaux', label: 'Spéciaux' },
  ].filter(t =>
    t.id === '1x2'      ? hasBasicOdds :
    t.id === 'score'    ? hasBasicOdds :
    t.id === 'buteur'   ? true :
    specials.length > 0
  ) as { id: Tab; label: string }[]

  const [activeTab, setActiveTab] = useState<Tab>(TABS[0]?.id ?? '1x2')

  const baseOdds = predResult === 'home' ? match.odds_home : predResult === 'draw' ? match.odds_draw : predResult === 'away' ? match.odds_away : null
  const scoreOdds = selectedScore ? exactScoreOdds.find(o => o.score_home === selectedScore.h && o.score_away === selectedScore.a)?.odds ?? null : null
  const scorerOddsVal = selectedScorer ? scorerOdds.find(o => o.player_name === selectedScorer)?.odds ?? null : null
  const hasBonus = !!(selectedScore || scorerOddsVal)

  let combinedOdds: number | null = baseOdds
  if (baseOdds) {
    if (scoreOdds) combinedOdds = scoreOdds
    if (scorerOddsVal) combinedOdds = (combinedOdds ?? baseOdds) * scorerOddsVal
  }

  const selSpecial = specials.find(s => s.k === specialSel)
  const selectedBoost = userBoosts.find(b => b.id === selectedBoostId) ?? null
  const boostMultiplier = selectedBoost?.boost_type === 'x15' ? 1.5 : selectedBoost?.boost_type === 'x20_exact' ? 2.0 : 1.0
  const selectedWildcard = userWildcards.find(w => w.id === selectedWildcardId) ?? null
  const wildcardDoubleMultiplier = selectedWildcard?.type === 'double' ? 2.0 : 1.0

  const activeOdds = activeTab === 'speciaux' ? (selSpecial?.odds ?? null) : combinedOdds
  const gain = activeOdds && stake >= 100 ? Math.round(Number(activeOdds) * stake * match.phase_multiplier * boostMultiplier * wildcardDoubleMultiplier) : null
  const baseGain = baseOdds && stake >= 100 ? Math.round(baseOdds * stake * match.phase_multiplier * boostMultiplier * wildcardDoubleMultiplier) : null

  const canBet = stake >= 100 && stake <= 2000 && stake <= availablePoints && (
    activeTab === 'speciaux' ? !!selSpecial :
    activeTab === 'score'    ? !!selectedScore :
    activeTab === 'buteur'   ? (!!predResult && !!selectedScorer) :
    !!predResult
  )

  const filteredScores = useMemo(() => scoreFilter === 'all' ? exactScoreOdds : exactScoreOdds.filter(o => getResultFromScore(o.score_home, o.score_away) === scoreFilter), [exactScoreOdds, scoreFilter])
  const filteredScorers = useMemo(() => !scorerQuery.trim() ? scorerOdds : scorerOdds.filter(o => o.player_name.toLowerCase().includes(scorerQuery.toLowerCase())), [scorerOdds, scorerQuery])

  function handleResultClick(val: 'home'|'draw'|'away') { setPredResult(val); if (selectedScore && getResultFromScore(selectedScore.h, selectedScore.a) !== val) setSelectedScore(null); setFeedback(null) }
  function handleScoreClick(o: ExactOdd) { setSelectedScore({ h: o.score_home, a: o.score_away }); setPredResult(getResultFromScore(o.score_home, o.score_away)); setManualH(o.score_home); setManualA(o.score_away); setFeedback(null) }
  function handleManualScore(h: number, a: number) { const ch = Math.max(0, Math.min(15, h)); const ca = Math.max(0, Math.min(15, a)); setManualH(ch); setManualA(ca); setSelectedScore({ h: ch, a: ca }); setPredResult(getResultFromScore(ch, ca)); setFeedback(null) }
  function clearBoost() { setSelectedBoostId(null); setSelectedWildcardId(null) }

  async function submitSpecial() {
    if (!selSpecial) return
    setSpecialLoading(true); setSpecialFeedback(null)
    try {
      const payload: Record<string, unknown> = { matchId: match.id, stake, betType: selSpecial.bt, predictionBool: selSpecial.pb }
      if (selectedBoostId) payload.boostId = selectedBoostId
      if (selectedWildcardId) payload.wildcardId = selectedWildcardId
      const res = await fetch('/api/bets/place', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) setSpecialFeedback({ ok: false, msg: data.error ?? 'Erreur.' })
      else { setSpecialFeedback({ ok: true, msg: `Pari placé — gain max : ${data.pointsIfWon?.toLocaleString('fr-FR')} pts` }); setSpecialSel(null); clearBoost() }
    } catch { setSpecialFeedback({ ok: false, msg: 'Erreur réseau.' }) }
    finally { setSpecialLoading(false) }
  }

  async function submitMain(e: React.FormEvent) {
    e.preventDefault(); setFeedback(null)
    if (!predResult) return setFeedback({ ok: false, msg: 'Choisis un résultat.' })
    const bt = (selectedScore || (selectedScorer && predResult)) ? 'result_combo' : 'result'
    const body: Record<string, unknown> = { matchId: match.id, stake, betType: bt, predictionResult: predResult }
    if (selectedScore) { body.predictionScoreHome = selectedScore.h; body.predictionScoreAway = selectedScore.a }
    if (selectedScorer) body.predictionScorer = selectedScorer
    if (selectedBoostId) body.boostId = selectedBoostId
    if (selectedWildcardId) body.wildcardId = selectedWildcardId
    setLoading(true)
    try {
      const res = await fetch('/api/bets/place', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) setFeedback({ ok: false, msg: data.error ?? 'Erreur.' })
      else { setFeedback({ ok: true, msg: `Pari placé — gain max : ${data.pointsIfWon?.toLocaleString('fr-FR')} pts` }); setPredResult(null); setSelectedScore(null); setSelectedScorer(null); setScorerQuery(''); setManualH(1); setManualA(0); clearBoost() }
    } catch { setFeedback({ ok: false, msg: 'Erreur réseau.' }) }
    finally { setLoading(false) }
  }

  const BoostBlock = () => {
    if (userBoosts.length === 0) return null
    const isExactScoreTab = activeTab === 'score' || (activeTab === '1x2' && !!selectedScore)
    const visibleBoosts = userBoosts.filter(b => b.boost_type === 'x15' || isExactScoreTab)
    if (visibleBoosts.length === 0) return null
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1.5"><Zap className="w-3 h-3" style={{ color: '#F0B429' }} /><span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>Bonus disponibles</span></div>
        <div className="flex flex-wrap gap-1.5">
          {visibleBoosts.map(b => {
            const active = selectedBoostId === b.id; const label = b.boost_type === 'x20_exact' ? '×2.0 Score exact' : '×1.5 Boost'
            return (
              <button key={b.id} type="button" onClick={() => setSelectedBoostId(active ? null : b.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                style={{ background: active ? 'rgba(240,180,41,.2)' : 'rgba(240,180,41,.07)', border: `1.5px solid ${active ? '#F0B429' : 'rgba(240,180,41,.3)'}`, color: active ? '#F0B429' : 'rgba(200,160,40,.9)' }}>
                <Zap className="w-3 h-3" />{label}
              </button>
            )
          })}
        </div>
        {selectedBoost && <p className="text-[10px]" style={{ color: 'var(--muted)' }}>{selectedBoost.boost_type === 'x20_exact' ? 'Multiplie ×2.0 tes gains (score exact requis)' : 'Multiplie ×1.5 tes gains potentiels'}</p>}
      </div>
    )
  }

  const WildcardBlock = () => {
    const isExactScoreTab = activeTab === 'score' || (activeTab === '1x2' && !!selectedScore)
    const visibleWildcards = userWildcards.filter(w => w.type !== 'insurance' || isExactScoreTab)
    if (visibleWildcards.length === 0) return null
    const ICONS: Record<Wildcard['type'], any> = { double: Zap, insurance: Shield, last_minute: Clock3 }
    const LABELS: Record<Wildcard['type'], string> = { double: '×2 Double', insurance: 'Assurance', last_minute: 'Dernière Minute' }
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1.5"><Shield className="w-3 h-3" style={{ color: '#60A5FA' }} /><span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>Wildcards disponibles</span></div>
        <div className="flex flex-wrap gap-1.5">
          {visibleWildcards.map(w => {
            const active = selectedWildcardId === w.id; const Icon = ICONS[w.type]
            return (
              <button key={w.id} type="button" onClick={() => setSelectedWildcardId(active ? null : w.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                style={{ background: active ? 'rgba(96,165,250,.2)' : 'rgba(96,165,250,.07)', border: `1.5px solid ${active ? '#60A5FA' : 'rgba(96,165,250,.3)'}`, color: active ? '#60A5FA' : 'rgba(120,160,220,.9)' }}>
                <Icon className="w-3 h-3" />{LABELS[w.type]}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const StakeBlock = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>Mise (100–2 000)</span>
        <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>{availablePoints.toLocaleString('fr-FR')} dispo</span>
      </div>
      <div className="flex gap-1.5">
        {[100, 200, 500, 1000, 2000].map(v => {
          const active = stake === v
          return (
            <button key={v} type="button" onClick={() => setStake(Math.min(v, availablePoints, 2000))}
              className="flex-1 py-2 rounded-lg text-[11px] font-bold transition-all"
              style={{ background: active ? 'rgba(240,180,41,.15)' : 'var(--bg)', border: `1.5px solid ${active ? '#F0B429' : 'var(--border)'}`, color: active ? '#F0B429' : 'var(--muted)' }}>
              {v >= 1000 ? `${v / 1000}k` : v}
            </button>
          )
        })}
      </div>
      <input type="number" min={100} max={Math.min(2000, availablePoints)} value={stake}
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
      <div className="rounded-xl px-4 py-3.5 flex items-center justify-between" style={{ background: bg, border: `1px solid ${bdr}` }}>
        <div>
          <p className="text-[10px] font-semibold tracking-widest" style={{ color: 'var(--muted)' }}>{hasBonus && !isSpecial ? 'SI TOUT CORRECT' : 'GAIN POTENTIEL'}</p>
          {hasBonus && !isSpecial && baseGain && gain !== baseGain && <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>résultat seul : +{baseGain.toLocaleString('fr-FR')}</p>}
          {boostMultiplier > 1 && <p className="text-[10px] mt-0.5 font-semibold" style={{ color: '#F0B429' }}>boost ×{boostMultiplier} inclus</p>}
        </div>
        <div className="text-right">
          <span className="font-display text-2xl" style={{ color, letterSpacing: '.04em' }}>+{gain.toLocaleString('fr-FR')}</span>
          <p className="text-[9px] tracking-widest mt-0.5 uppercase" style={{ color: 'var(--muted)' }}>pts</p>
        </div>
      </div>
    )
  }

  const FeedbackBlock = ({ fb }: { fb: { ok: boolean; msg: string } | null }) => {
    if (!fb) return null
    return (
      <div className="px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2"
        style={{ background: fb.ok ? 'rgba(34,197,94,.08)' : 'rgba(239,68,68,.08)', border: `1px solid ${fb.ok ? 'rgba(34,197,94,.2)' : 'rgba(239,68,68,.2)'}`, color: fb.ok ? '#22C55E' : '#EF4444' }}>
        {fb.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
        {fb.msg}
      </div>
    )
  }

  const SubmitButton = ({ disabled, loading: l, label }: { disabled: boolean; loading: boolean; label: string }) => (
    <button type="submit" disabled={disabled || l}
      className="w-full py-3.5 rounded-xl font-display text-lg tracking-[.08em] transition-all"
      style={{
        background: !disabled && !l ? 'linear-gradient(135deg, #F0B429 0%, #FFD060 100%)' : 'var(--bg)',
        color: !disabled && !l ? '#07101E' : 'var(--muted)',
        border: `1.5px solid ${!disabled && !l ? '#F0B429' : 'var(--border)'}`,
        boxShadow: !disabled && !l ? '0 4px 20px rgba(240,180,41,.2)' : 'none',
      }}
      onMouseDown={(e: any) => { if (!disabled && !l) e.currentTarget.style.transform = 'scale(0.98)' }}
      onMouseUp={(e: any) => { e.currentTarget.style.transform = 'none' }}>
      {l ? 'Envoi…' : label}
    </button>
  )

  const ManualScoreBlock = () => {
    const resultLabel = manualH > manualA ? match.home_team : manualH < manualA ? match.away_team : 'Match nul'
    const activeOddsForScore = scoreOdds ?? (selectedScore ? (predResult === 'home' ? match.odds_home : predResult === 'away' ? match.odds_away : match.odds_draw) : null)
    return (
      <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--bg)', border: '1.5px solid var(--border)' }}>
        <p className="text-[10px] font-semibold tracking-widest uppercase text-center" style={{ color: 'var(--muted)' }}>
          {exactScoreOdds.length > 0 ? 'OU ENTRER UN SCORE' : 'SCORE PRÉDIT'}
        </p>
        <div className="flex items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide truncate max-w-[80px] text-center" style={{ color: 'var(--muted)' }}>{match.home_team}</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => handleManualScore(manualH - 1, manualA)} className="w-8 h-8 rounded-lg font-bold text-lg flex items-center justify-center transition-all" style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', color: 'var(--text)' }}>−</button>
              <span className="font-display text-3xl w-8 text-center" style={{ color: '#F0B429' }}>{manualH}</span>
              <button type="button" onClick={() => handleManualScore(manualH + 1, manualA)} className="w-8 h-8 rounded-lg font-bold text-lg flex items-center justify-center transition-all" style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', color: 'var(--text)' }}>+</button>
            </div>
          </div>
          <span className="font-display text-2xl" style={{ color: 'var(--border-2)' }}>:</span>
          <div className="flex flex-col items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide truncate max-w-[80px] text-center" style={{ color: 'var(--muted)' }}>{match.away_team}</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => handleManualScore(manualH, manualA - 1)} className="w-8 h-8 rounded-lg font-bold text-lg flex items-center justify-center transition-all" style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', color: 'var(--text)' }}>−</button>
              <span className="font-display text-3xl w-8 text-center" style={{ color: '#F0B429' }}>{manualA}</span>
              <button type="button" onClick={() => handleManualScore(manualH, manualA + 1)} className="w-8 h-8 rounded-lg font-bold text-lg flex items-center justify-center transition-all" style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', color: 'var(--text)' }}>+</button>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2">
          <p className="text-xs font-semibold text-center" style={{ color: 'var(--muted)' }}>{resultLabel}</p>
          {activeOddsForScore && <span className="font-mono text-xs font-bold" style={{ color: '#F0B429' }}>×{Number(activeOddsForScore).toFixed(2)}{scoreOdds ? ' (score exact)' : ' (résultat)'}</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
      <div className="flex" style={{ borderBottom: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
            className="relative flex-1 py-3.5 text-xs font-semibold tracking-wider transition-colors"
            style={{ color: activeTab === t.id ? '#F0B429' : 'var(--muted)', background: 'transparent' }}>
            {t.label}
            {activeTab === t.id && <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full" style={{ background: '#F0B429' }} />}
          </button>
        ))}
      </div>

      <div className="p-5">
        {activeTab === '1x2' && (
          <form onSubmit={submitMain} className="space-y-5">
            <div className="grid grid-cols-3 gap-2.5">
              {([{ val: 'home' as const, label: match.home_team, odds: match.odds_home }, { val: 'draw' as const, label: 'Nul', odds: match.odds_draw }, { val: 'away' as const, label: match.away_team, odds: match.odds_away }] as const).map(o => {
                if (!o.odds) return null; const active = predResult === o.val
                return (
                  <button key={o.val} type="button" onClick={() => handleResultClick(o.val)}
                    className="relative flex flex-col items-center gap-2.5 pt-5 pb-4 px-2 rounded-xl overflow-hidden transition-all"
                    style={{ background: active ? 'linear-gradient(160deg, rgba(240,180,41,.2) 0%, rgba(240,180,41,.06) 100%)' : 'var(--bg)', border: `1.5px solid ${active ? '#F0B429' : 'var(--border)'}`, transform: active ? 'translateY(-2px)' : 'none', boxShadow: active ? '0 8px 28px rgba(240,180,41,.12)' : 'none' }}>
                    {active && <span className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #F0B429, transparent)' }} />}
                    <span className="text-[10px] font-semibold text-center leading-tight w-full px-1 truncate uppercase tracking-wide" style={{ color: active ? '#D8E6F3' : 'var(--muted)' }}>{o.label}</span>
                    <span className="font-mono font-bold text-xl leading-none" style={{ color: '#F0B429' }}>×{Number(o.odds).toFixed(2)}</span>
                    {active && <span className="text-[8px] font-bold tracking-[.14em] uppercase px-2 py-0.5 rounded-full" style={{ background: 'rgba(240,180,41,.2)', color: '#F0B429' }}>CHOISI</span>}
                  </button>
                )
              })}
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }} className="space-y-4">
              <BoostBlock /><WildcardBlock /><StakeBlock />
            </div>
            {predResult && <GainBlock />}
            <FeedbackBlock fb={feedback} />
            <SubmitButton disabled={!canBet} loading={loading} label={combinedOdds ? `PARIER × ${combinedOdds.toFixed(2)}` : 'PARIER'} />
          </form>
        )}

        {activeTab === 'score' && (
          <form onSubmit={submitMain} className="space-y-4">
            {exactScoreOdds.length > 0 && (
              <>
                <div className="flex gap-1.5">
                  {(['all', 'home', 'draw', 'away'] as const).map(f => (
                    <button key={f} type="button" onClick={() => setScoreFilter(f)}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                      style={{ background: scoreFilter === f ? 'rgba(240,180,41,.15)' : 'var(--bg)', border: `1.5px solid ${scoreFilter === f ? '#F0B429' : 'var(--border)'}`, color: scoreFilter === f ? '#F0B429' : 'var(--muted)' }}>
                      {f === 'all' ? 'Tous' : f === 'home' ? '1' : f === 'draw' ? 'X' : '2'}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pr-0.5">
                  {filteredScores.map(o => {
                    const isSel = selectedScore?.h === o.score_home && selectedScore?.a === o.score_away
                    return (
                      <button key={o.id} type="button" onClick={() => handleScoreClick(o)}
                        className="rounded-xl py-3 text-center transition-all"
                        style={{ background: isSel ? 'linear-gradient(160deg, rgba(240,180,41,.2) 0%, rgba(240,180,41,.06) 100%)' : 'var(--bg)', border: `1.5px solid ${isSel ? '#F0B429' : 'var(--border)'}`, transform: isSel ? 'scale(1.04)' : 'none' }}>
                        <p className="font-mono font-bold text-sm" style={{ color: isSel ? '#F0B429' : 'var(--text)' }}>{o.score_home}–{o.score_away}</p>
                        <p className="font-mono text-[10px] mt-0.5" style={{ color: isSel ? '#F0B429' : 'var(--muted)' }}>×{o.odds.toFixed(2)}</p>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
            <ManualScoreBlock />
            {selectedScore && <button type="button" onClick={() => { setSelectedScore(null); setPredResult(null); setManualH(1); setManualA(0) }} className="text-[10px] w-full text-center py-0.5 opacity-50 hover:opacity-100 transition-opacity" style={{ color: 'var(--muted)' }}>Retirer la sélection</button>}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }} className="space-y-4">
              <BoostBlock /><WildcardBlock /><StakeBlock />
            </div>
            {selectedScore && <GainBlock />}
            <FeedbackBlock fb={feedback} />
            <SubmitButton disabled={!canBet} loading={loading} label={!selectedScore ? 'CHOISIR UN SCORE' : scoreOdds ? `PARIER × ${scoreOdds.toFixed(2)}` : combinedOdds ? `PARIER × ${combinedOdds.toFixed(2)}` : 'PARIER'} />
          </form>
        )}

        {activeTab === 'buteur' && (
          <form onSubmit={submitMain} className="space-y-4">
            <div>
              <p className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Résultat</p>
              <div className="grid grid-cols-3 gap-2">
                {([{ val: 'home' as const, label: match.home_team, odds: match.odds_home }, { val: 'draw' as const, label: 'Nul', odds: match.odds_draw }, { val: 'away' as const, label: match.away_team, odds: match.odds_away }] as const).map(o => {
                  if (!o.odds) return null; const active = predResult === o.val
                  return (
                    <button key={o.val} type="button" onClick={() => handleResultClick(o.val)}
                      className="relative flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl overflow-hidden transition-all"
                      style={{ background: active ? 'rgba(240,180,41,.15)' : 'var(--bg)', border: `1.5px solid ${active ? '#F0B429' : 'var(--border)'}`, transform: active ? 'translateY(-1px)' : 'none' }}>
                      {active && <span className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #F0B429, transparent)' }} />}
                      <span className="text-[10px] font-semibold truncate w-full text-center uppercase tracking-wide" style={{ color: active ? 'var(--text)' : 'var(--muted)' }}>{o.label}</span>
                      <span className="font-mono text-sm font-bold leading-none" style={{ color: '#F0B429' }}>×{Number(o.odds).toFixed(2)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <p className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Buteur</p>
            </div>
            <input type="text" value={scorerQuery} onChange={e => setScorerQuery(e.target.value)} placeholder="Rechercher un joueur…"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', color: 'var(--text)', transition: 'border-color .15s' }}
              onFocus={(e: any) => e.target.style.borderColor = '#F0B429'}
              onBlur={(e: any) => e.target.style.borderColor = 'var(--border)'}
            />
            {scorerOdds.length === 0 ? (
              <div className="rounded-xl px-4 py-6 text-center text-xs" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)' }}>Les cotes buteurs ne sont pas encore disponibles.</div>
            ) : filteredScorers.length === 0 ? (
              <div className="text-center py-4 text-xs" style={{ color: 'var(--muted)' }}>Aucun joueur trouvé.</div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-0.5">
                {filteredScorers.map(o => {
                  const isSel = selectedScorer === o.player_name
                  return (
                    <button key={o.id} type="button" onClick={() => { setSelectedScorer(isSel ? null : o.player_name); setFeedback(null) }}
                      className="flex items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all"
                      style={{ background: isSel ? 'rgba(240,180,41,.1)' : 'var(--bg)', border: `1.5px solid ${isSel ? '#F0B429' : 'var(--border)'}` }}>
                      <div className="min-w-0"><p className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>{o.player_name}</p><p className="text-[10px]" style={{ color: 'var(--muted)' }}>{o.team}</p></div>
                      <span className="font-mono text-sm font-bold ml-2 shrink-0" style={{ color: '#F0B429' }}>×{o.odds.toFixed(2)}</span>
                    </button>
                  )
                })}
              </div>
            )}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }} className="space-y-4">
              <BoostBlock /><WildcardBlock /><StakeBlock />
            </div>
            {predResult && selectedScorer && <GainBlock />}
            <FeedbackBlock fb={feedback} />
            <SubmitButton disabled={!canBet} loading={loading} label={combinedOdds && predResult && selectedScorer ? `PARIER × ${combinedOdds.toFixed(2)}` : 'PARIER'} />
          </form>
        )}

        {activeTab === 'speciaux' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-2">
              {specials.map(s => {
                const active = specialSel === s.k
                return (
                  <button key={s.k} type="button" onClick={() => { setSpecialSel(active ? null : s.k); setSpecialFeedback(null) }}
                    className="relative flex flex-col items-center gap-2 py-4 px-3 rounded-xl overflow-hidden transition-all"
                    style={{ background: active ? 'linear-gradient(160deg, rgba(240,180,41,.2) 0%, rgba(240,180,41,.06) 100%)' : 'var(--bg)', border: `1.5px solid ${active ? '#F0B429' : 'var(--border)'}`, transform: active ? 'translateY(-1px)' : 'none' }}>
                    {active && <span className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #F0B429, transparent)' }} />}
                    <span className="text-[11px] font-semibold" style={{ color: active ? '#D8E6F3' : 'var(--muted)' }}>{s.l}</span>
                    <span className="font-mono font-bold text-xl leading-none" style={{ color: '#F0B429' }}>×{Number(s.odds).toFixed(2)}</span>
                  </button>
                )
              })}
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }} className="space-y-4">
              <BoostBlock /><WildcardBlock /><StakeBlock />
            </div>
            {selSpecial && <GainBlock isSpecial />}
            <FeedbackBlock fb={specialFeedback} />
            <button type="button" disabled={!selSpecial || specialLoading} onClick={submitSpecial}
              className="w-full py-3.5 rounded-xl font-display text-lg tracking-[.08em] transition-all"
              style={{ background: selSpecial && !specialLoading ? 'linear-gradient(135deg, #F0B429 0%, #FFD060 100%)' : 'var(--bg)', color: selSpecial && !specialLoading ? '#07101E' : 'var(--muted)', border: `1.5px solid ${selSpecial && !specialLoading ? '#F0B429' : 'var(--border)'}` }}
              onMouseDown={(e: any) => { if (selSpecial && !specialLoading) e.currentTarget.style.transform = 'scale(0.98)' }}
              onMouseUp={(e: any) => { e.currentTarget.style.transform = 'none' }}>
              {specialLoading ? 'Envoi…' : selSpecial ? `PARIER × ${Number(selSpecial.odds).toFixed(2)}` : 'PARIER'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
