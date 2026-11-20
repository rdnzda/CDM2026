'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

interface Props {
  comboId: string
  earliestLockedAt: string
}

export default function ComboActions({ comboId, earliestLockedAt }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (new Date() >= new Date(earliestLockedAt)) return null

  const handleCancel = async () => {
    if (!confirm('Annuler ce combiné définitivement ?')) return
    setLoading(true)
    setError('')
    const res = await fetch(`/api/combos/${comboId}/cancel`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    router.refresh()
  }

  return (
    <div className="flex items-center gap-1 shrink-0 ml-3">
      {error && <span className="text-red-400 text-[10px] max-w-[100px] truncate">{error}</span>}
      <button onClick={handleCancel} disabled={loading}
        className="p-1.5 rounded-lg transition-colors"
        style={{ background: 'rgba(239,68,68,.1)', color: '#EF4444' }}
        title="Annuler ce combiné">
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}
