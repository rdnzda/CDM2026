'use client'

import { useState } from 'react'

const PHASES = [
  { value: 'round_of_32', label: '32es de finale', mult: '×1.25', color: '#38BDF8' },
  { value: 'round_of_16', label: '8es de finale',  mult: '×1.5',  color: '#60A5FA' },
  { value: 'quarter',     label: 'Quarts',          mult: '×2.0',  color: '#A78BFA' },
  { value: 'semi',        label: 'Demi-finales',    mult: '×2.5',  color: '#FB923C' },
  { value: 'final',       label: 'Finale',          mult: '×3.0',  color: '#F0B429' },
]

export default function PhaseBoostButtons() {
  const [loading, setLoading] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, { granted: number; skipped: number } | { error: string }>>({})

  async function grant(phase: string) {
    setLoading(phase)
    try {
      const res = await fetch('/api/admin/grant-phase-boosts', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phase }),
      })
      const data = await res.json()
      setResults(prev => ({ ...prev, [phase]: data }))
    } catch {
      setResults(prev => ({ ...prev, [phase]: { error: 'Erreur réseau' } }))
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-3">
      {PHASES.map(p => {
        const result = results[p.value]
        const isLoading = loading === p.value
        return (
          <div key={p.value} className="flex items-center gap-4">
            <button
              onClick={() => grant(p.value)}
              disabled={!!loading}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
              style={{
                background: `rgba(${p.color === '#F0B429' ? '240,180,41' : p.color === '#FB923C' ? '251,146,60' : p.color === '#A78BFA' ? '167,139,250' : p.color === '#60A5FA' ? '96,165,250' : '56,189,248'},.12)`,
                border: `1px solid ${p.color}30`,
                color: p.color,
                minWidth: 260,
              }}
            >
              {isLoading ? (
                <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                <span className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: `${p.color}20` }}>{p.mult}</span>
              )}
              <span>Distribuer boosts — {p.label}</span>
            </button>

            {result && (
              'error' in result ? (
                <span className="text-xs font-medium" style={{ color: '#EF4444' }}>❌ {result.error}</span>
              ) : (
                <span className="text-xs font-medium" style={{ color: '#22C55E' }}>
                  ✅ {result.granted} joueurs crédités, {result.skipped} déjà équipés
                </span>
              )
            )}
          </div>
        )
      })}
    </div>
  )
}
