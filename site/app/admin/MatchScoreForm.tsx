'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function MatchScoreForm({ match }: { match: any }) {
  const router = useRouter()
  const [home, setHome]       = useState(match.final_score_home ?? '')
  const [away, setAway]       = useState(match.final_score_away ?? '')
  const [scorers, setScorers] = useState((match.scorers ?? []).join(', '))
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    const res = await fetch(`/api/admin/matches/${match.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ scoreHome: home, scoreAway: away, scorers }),
    })
    const json = await res.json()
    setSaving(false)
    if (res.ok) {
      setMsg('✅ Sauvegardé — resolve-bets lancé')
      router.refresh()
    } else {
      setMsg(`❌ ${json.error}`)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2 mt-2">
      <div className="flex items-center gap-1">
        <input
          type="number" min="0" max="20" value={home}
          onChange={e => setHome(e.target.value)}
          className="w-12 text-center rounded-lg px-2 py-1 text-sm font-mono font-bold"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
          placeholder="0"
        />
        <span className="text-sm font-bold" style={{ color: 'var(--muted)' }}>–</span>
        <input
          type="number" min="0" max="20" value={away}
          onChange={e => setAway(e.target.value)}
          className="w-12 text-center rounded-lg px-2 py-1 text-sm font-mono font-bold"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
          placeholder="0"
        />
      </div>

      <input
        type="text" value={scorers}
        onChange={e => setScorers(e.target.value)}
        className="flex-1 min-w-[160px] rounded-lg px-3 py-1 text-sm"
        style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
        placeholder="Buteurs : Mbappe, Salah, ..."
      />

      <button
        type="submit" disabled={saving}
        className="px-3 py-1 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
        style={{ background: '#F0B429', color: '#000' }}
      >
        {saving ? '…' : 'Valider'}
      </button>

      {msg && <span className="text-xs w-full" style={{ color: msg.startsWith('✅') ? '#22C55E' : '#EF4444' }}>{msg}</span>}
    </form>
  )
}
