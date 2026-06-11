'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Check } from 'lucide-react'

interface Props {
  challengeId: string
  isChallenger: boolean
}

export default function ChallengeActions({ challengeId, isChallenger }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCancel = async () => {
    if (!confirm('Annuler ce défi ?')) return
    setLoading(true)
    setError('')
    const res = await fetch(`/api/challenges/${challengeId}/cancel`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    router.refresh()
  }

  const handleRespond = async (action: 'accept' | 'refuse') => {
    setLoading(true)
    setError('')
    const res = await fetch('/api/1v1/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId, action }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    router.refresh()
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0 ml-3">
      {error && <span className="text-red-400 text-[10px] max-w-[100px] truncate">{error}</span>}
      {isChallenger ? (
        <button onClick={handleCancel} disabled={loading}
          className="p-1.5 rounded-lg transition-colors"
          style={{ background: 'rgba(239,68,68,.1)', color: '#EF4444' }}
          title="Annuler le défi">
          <X className="w-3 h-3" />
        </button>
      ) : (
        <>
          <button onClick={() => handleRespond('accept')} disabled={loading}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors"
            style={{ background: 'rgba(34,197,94,.15)', color: '#22C55E' }}>
            <Check className="w-3 h-3" />Accepter
          </button>
          <button onClick={() => handleRespond('refuse')} disabled={loading}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors"
            style={{ background: 'rgba(239,68,68,.1)', color: '#EF4444' }}>
            <X className="w-3 h-3" />Refuser
          </button>
        </>
      )}
    </div>
  )
}
