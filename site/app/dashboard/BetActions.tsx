'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, X, Check } from 'lucide-react'

interface Props {
  betId: string
  stake: number
  lockedAt: string
}

export default function BetActions({ betId, stake, lockedAt }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [newStake, setNewStake] = useState(stake)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (new Date() >= new Date(lockedAt)) return null

  const handleCancel = async () => {
    if (!confirm('Annuler ce pari définitivement ?')) return
    setLoading(true)
    setError('')
    const res = await fetch(`/api/bets/${betId}/cancel`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    router.refresh()
  }

  const handleSave = async () => {
    if (newStake === stake) { setEditing(false); return }
    setLoading(true)
    setError('')
    const res = await fetch(`/api/bets/${betId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stake: newStake }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setEditing(false)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-1 shrink-0 ml-3">
      {error && <span className="text-red-400 text-[10px] mr-1 max-w-[100px] truncate">{error}</span>}
      {editing ? (
        <>
          <input
            type="number" min={100} max={2000} step={50}
            value={newStake}
            onChange={e => setNewStake(Number(e.target.value))}
            className="w-20 text-xs text-center rounded-lg px-2 py-1.5 font-mono"
            style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
          <button onClick={handleSave} disabled={loading}
            className="p-1.5 rounded-lg transition-colors"
            style={{ background: 'rgba(34,197,94,.15)', color: '#22C55E' }}>
            <Check className="w-3 h-3" />
          </button>
          <button onClick={() => { setEditing(false); setNewStake(stake) }}
            className="p-1.5 rounded-lg transition-colors"
            style={{ background: 'var(--bg-3)', color: 'var(--muted)' }}>
            <X className="w-3 h-3" />
          </button>
        </>
      ) : (
        <>
          <button onClick={() => setEditing(true)} disabled={loading}
            className="p-1.5 rounded-lg transition-colors hover-bg-3"
            style={{ color: 'var(--muted)' }}
            title="Modifier la mise">
            <Pencil className="w-3 h-3" />
          </button>
          <button onClick={handleCancel} disabled={loading}
            className="p-1.5 rounded-lg transition-colors"
            style={{ background: 'rgba(239,68,68,.1)', color: '#EF4444' }}
            title="Annuler ce pari">
            <X className="w-3 h-3" />
          </button>
        </>
      )}
    </div>
  )
}
