'use client'

import { useEffect, useState } from 'react'

type Dist = { count: number; stake: number }

export default function BetDistribution({
  home,
  away,
  dist,
  isLive,
}: {
  home: string
  away: string
  dist: { home: Dist; draw: Dist; away: Dist }
  isLive?: boolean
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const total      = dist.home.count + dist.draw.count + dist.away.count
  const totalStake = dist.home.stake + dist.draw.stake + dist.away.stake
  if (total === 0) return null

  const homePct = Math.round((dist.home.count / total) * 100)
  const drawPct = Math.round((dist.draw.count / total) * 100)
  const awayPct = 100 - homePct - drawPct

  const sides = [
    { label: home,  key: 'home', data: dist.home, pct: homePct, color: '#60A5FA', delay: '0ms'   },
    { label: 'Nul', key: 'draw', data: dist.draw, pct: drawPct, color: '#F0B429', delay: '80ms'  },
    { label: away,  key: 'away', data: dist.away, pct: awayPct, color: '#F97316', delay: '160ms' },
  ]

  const fmt = (v: number) => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : String(v)

  const donut = `conic-gradient(
    #60A5FA 0% ${homePct}%,
    #F0B429 ${homePct}% ${homePct + drawPct}%,
    #F97316 ${homePct + drawPct}% 100%
  )`

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>

      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
            Pronostics du groupe
          </span>
          {isLive && (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(34,197,94,.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,.2)' }}>
              <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: '#22C55E' }} />
              LIVE
            </span>
          )}
        </div>
        <span className="text-xs" style={{ color: 'var(--muted)' }}>
          {total} paris ·{' '}
          <span className="font-mono">{fmt(totalStake)}</span> pts misés
        </span>
      </div>

      {/* Donut + bars */}
      <div className="p-4 flex gap-5 items-center">

        {/* Donut */}
        <div className="relative shrink-0" style={{ width: 100, height: 100 }}>
          <div style={{
            width: 100, height: 100,
            borderRadius: '50%',
            background: donut,
            WebkitMask: 'radial-gradient(transparent 34px, black 34px)',
            mask: 'radial-gradient(transparent 34px, black 34px)',
          }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="font-display text-2xl leading-none" style={{ color: 'var(--text)', letterSpacing: '.04em' }}>
              {total}
            </span>
            <span className="text-[8px] tracking-widest uppercase mt-0.5" style={{ color: 'var(--muted)' }}>
              paris
            </span>
          </div>
        </div>

        {/* Legend + progress bars */}
        <div className="flex-1 space-y-2.5">
          {sides.map(s => (
            <div key={s.key}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.color }} />
                  <span className="text-xs font-semibold truncate" style={{ color: 'var(--text)', maxWidth: 80 }}>
                    {s.label}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="font-mono text-[11px]" style={{ color: 'var(--muted)' }}>
                    {fmt(s.data.stake)} pts
                  </span>
                  <span className="font-bold text-xs w-7 text-right" style={{ color: s.color }}>
                    {s.pct}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg)' }}>
                <div style={{
                  height: '100%',
                  borderRadius: 9999,
                  background: s.color,
                  opacity: 0.8,
                  width: mounted ? s.pct + '%' : '0%',
                  transition: 'width 0.9s cubic-bezier(0.34,1.2,0.64,1)',
                  transitionDelay: s.delay,
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live reactions — stakes per side */}
      <div className="grid grid-cols-3" style={{ borderTop: '1px solid var(--border)' }}>
        {sides.map((s, i) => (
          <div
            key={s.key}
            className="py-3 px-2 text-center"
            style={{ borderRight: i < 2 ? '1px solid var(--border)' : undefined }}
          >
            <p className="text-[10px] truncate mb-1 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
              {s.label}
            </p>
            <p className="font-mono font-bold text-base leading-none" style={{ color: s.color }}>
              {fmt(s.data.stake)}
            </p>
            <p className="text-[9px] mt-1" style={{ color: 'var(--muted)' }}>
              {s.data.count} pari{s.data.count !== 1 ? 's' : ''}
            </p>
          </div>
        ))}
      </div>

    </div>
  )
}
