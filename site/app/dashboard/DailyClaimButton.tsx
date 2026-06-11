'use client'
import { useState } from 'react'
import { Gift, CheckCircle2, Loader2 } from 'lucide-react'

interface Props {
  alreadyClaimed: boolean
  points: number
}

export default function DailyClaimButton({ alreadyClaimed, points }: Props) {
  const [claimed, setClaimed] = useState(alreadyClaimed)
  const [loading, setLoading] = useState(false)
  const [earned, setEarned] = useState<number | null>(null)

  async function handleClaim() {
    if (claimed || loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/daily-claim', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setClaimed(true)
        setEarned(data.points)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="flex items-center justify-between rounded-2xl px-5 py-4"
      style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: claimed ? 'rgba(34,197,94,.1)' : 'rgba(240,180,41,.08)', border: `1px solid ${claimed ? 'rgba(34,197,94,.2)' : 'rgba(240,180,41,.2)'}` }}
        >
          {claimed
            ? <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--green)' }} />
            : <Gift className="w-5 h-5" style={{ color: 'var(--gold)' }} />
          }
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Bonus quotidien
          </p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            {claimed
              ? earned ? `+${earned.toLocaleString('fr-FR')} pts récupérés` : 'Déjà récupéré aujourd\'hui'
              : `+${points.toLocaleString('fr-FR')} pts disponibles`
            }
          </p>
        </div>
      </div>

      <button
        onClick={handleClaim}
        disabled={claimed || loading}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
        style={{
          background:  claimed ? 'rgba(34,197,94,.1)'     : 'rgba(240,180,41,.12)',
          border:      `1px solid ${claimed ? 'rgba(34,197,94,.25)' : 'rgba(240,180,41,.3)'}`,
          color:       claimed ? 'var(--green)'            : 'var(--gold)',
          cursor:      claimed ? 'default'                 : 'pointer',
          opacity:     claimed ? 0.7                       : 1,
        }}
      >
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {claimed ? 'Récupéré' : 'Récupérer'}
      </button>
    </div>
  )
}
