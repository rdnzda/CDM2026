'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, Trophy, Ban } from 'lucide-react'

type Daily = {
  id: string
  challenge_type: 'exact_score' | 'scorer' | 'combo_3'
  reward_first: number
  reward_second: number
  reward_third: number
  reward_correct: number
  match: {
    home_team: string
    away_team: string
    kickoff_at: string
  }
}

type ExistingEntry = {
  prediction_score_home: number | null
  prediction_score_away: number | null
  prediction_scorer: string | null
  status: string
  points_won: number
} | null

const TYPE_DESC: Record<string, string> = {
  exact_score: 'Prédit le score exact du match. Plus difficile = plus de points.',
  scorer:      "Prédit le nom d'un buteur du match.",
  combo_3:     'Prédit 3 résultats (ex: "France gagne, BTTS oui, Over 2.5"). Format libre.',
}

export default function QuotidienForm({
  daily, existing, isAuthenticated,
}: {
  daily: Daily; existing: ExistingEntry; isAuthenticated: boolean
}) {
  const [scoreHome, setScoreHome] = useState<number | ''>(existing?.prediction_score_home ?? '')
  const [scoreAway, setScoreAway] = useState<number | ''>(existing?.prediction_score_away ?? '')
  const [scorer, setScorer]       = useState(existing?.prediction_scorer ?? '')
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState<{ ok: boolean; message: string } | null>(null)
  const [done, setDone]           = useState(!!existing)

  const kickoff = new Date(daily.match.kickoff_at)
  const locked  = new Date() >= kickoff

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setResult(null)

    const body: Record<string, unknown> = { dailyChallengeId: daily.id }

    if (daily.challenge_type === 'exact_score') {
      if (scoreHome === '' || scoreAway === '') return setResult({ ok: false, message: 'Entre le score complet.' })
      body.predictionScoreHome = Number(scoreHome)
      body.predictionScoreAway = Number(scoreAway)
    } else {
      if (!scorer.trim()) return setResult({ ok: false, message: 'La prédiction est vide.' })
      body.predictionScorer = scorer.trim()
    }

    setLoading(true)
    try {
      const res = await fetch('/api/quotidien/participer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) setResult({ ok: false, message: data.error })
      else { setResult({ ok: true, message: 'Participation enregistrée !' }); setDone(true) }
    } catch { setResult({ ok: false, message: 'Erreur réseau.' }) }
    finally { setLoading(false) }
  }

  if (!isAuthenticated) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 text-center">
        <p className="text-slate-400 mb-4">Connecte-toi pour participer au défi</p>
        <a href="/api/auth/login" className="inline-block bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold px-6 py-2 rounded-lg transition-colors">
          Se connecter avec Discord
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="bg-slate-800 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Ta prédiction</h2>
        {done && !locked && (
          <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded-full">Déjà soumise</span>
        )}
      </div>

      <p className="text-sm text-slate-400">{TYPE_DESC[daily.challenge_type]}</p>

      {daily.challenge_type === 'exact_score' && (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs text-slate-400 mb-1 block">{daily.match.home_team}</label>
            <input
              type="number" min={0} max={20}
              value={scoreHome}
              onChange={e => setScoreHome(e.target.value === '' ? '' : Number(e.target.value))}
              disabled={locked || (done && !result)}
              className="w-full bg-slate-700 rounded-lg px-3 py-3 text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
            />
          </div>
          <span className="text-slate-400 text-xl mt-5">–</span>
          <div className="flex-1">
            <label className="text-xs text-slate-400 mb-1 block">{daily.match.away_team}</label>
            <input
              type="number" min={0} max={20}
              value={scoreAway}
              onChange={e => setScoreAway(e.target.value === '' ? '' : Number(e.target.value))}
              disabled={locked || (done && !result)}
              className="w-full bg-slate-700 rounded-lg px-3 py-3 text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
            />
          </div>
        </div>
      )}

      {(daily.challenge_type === 'scorer' || daily.challenge_type === 'combo_3') && (
        <textarea
          value={scorer}
          onChange={e => setScorer(e.target.value)}
          disabled={locked || (done && !result)}
          rows={daily.challenge_type === 'combo_3' ? 3 : 1}
          placeholder={daily.challenge_type === 'scorer' ? 'Ex: Mbappé' : 'Ex: France gagne, BTTS oui, Over 2.5'}
          className="w-full bg-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 resize-none"
        />
      )}

      {result && (
        <div className={`rounded-lg px-4 py-2.5 text-sm font-medium flex items-center gap-2 ${result.ok ? 'bg-green-900/40 border border-green-500/50 text-green-400' : 'bg-red-900/40 border border-red-500/50 text-red-400'}`}>
          {result.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
          {result.message}
        </div>
      )}

      {existing?.status === 'won' && (
        <div className="bg-green-900/30 border border-green-500/30 rounded-lg px-4 py-2.5 text-sm text-green-400 font-medium flex items-center gap-2">
          <Trophy className="w-4 h-4 shrink-0" />
          Gagné — +{existing.points_won.toLocaleString('fr-FR')} pts
        </div>
      )}

      {locked ? (
        <p className="text-center text-slate-500 text-sm flex items-center justify-center gap-1.5">
          <Ban className="w-3.5 h-3.5" />Le match a commencé — participations fermées.
        </p>
      ) : done ? (
        <p className="text-center text-slate-500 text-sm">Les points seront attribués à la fin du match.</p>
      ) : (
        <button type="submit" disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-600 disabled:text-slate-400 text-white font-bold py-3 rounded-lg transition-colors">
          {loading ? 'Envoi...' : 'Participer'}
        </button>
      )}
    </form>
  )
}
