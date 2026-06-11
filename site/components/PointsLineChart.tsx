'use client'
import { useState, useRef } from 'react'

export type ChartSeries = {
  name:  string
  color: string
  data:  { date: string; value: number }[]
}

const VB_W = 800
const VB_H = 200
const PAD  = { t: 16, r: 24, b: 38, l: 72 }
const CW   = VB_W - PAD.l - PAD.r
const CH   = VB_H - PAD.t - PAD.b

function smoothPath(pts: [number, number][]): string {
  if (pts.length === 0) return ''
  if (pts.length === 1) return `M${pts[0][0]},${pts[0][1]}`
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    const cx = (x0 + x1) / 2
    d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`
  }
  return d
}

function areaPath(pts: [number, number][], bottom: number): string {
  if (pts.length < 2) return ''
  return `${smoothPath(pts)} L${pts.at(-1)![0]},${bottom} L${pts[0][0]},${bottom} Z`
}

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function fmtVal(v: number) {
  return Math.abs(v) >= 10000
    ? `${(v / 1000).toFixed(0)}k`
    : Math.abs(v) >= 1000
    ? `${(v / 1000).toFixed(1)}k`
    : String(Math.round(v))
}

export default function PointsLineChart({
  series,
  showLegend = false,
}: {
  series: ChartSeries[]
  showLegend?: boolean
}) {
  const [hovered, setHovered] = useState<{
    idx: number; isRight: boolean; mouseX: number; mouseY: number
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const allDates = Array.from(
    new Set(series.flatMap(s => s.data.map(p => p.date)))
  ).sort()

  const allValues = series.flatMap(s => s.data.map(p => p.value))
  if (allValues.length === 0 || allDates.length === 0) return null

  const rawMin = Math.min(...allValues)
  const rawMax = Math.max(...allValues)
  const spread = (rawMax - rawMin) || 2000
  const yMin   = rawMin - spread * 0.08
  const yMax   = rawMax + spread * 0.18

  const xFor = (i: number) =>
    PAD.l + (allDates.length <= 1 ? CW / 2 : (i / (allDates.length - 1)) * CW)

  const yFor = (v: number) =>
    PAD.t + CH - ((v - yMin) / (yMax - yMin)) * CH

  const bottom = PAD.t + CH

  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const v = yMin + ((yMax - yMin) * i) / 4
    return { v, y: yFor(v) }
  })

  const nLabels      = Math.min(7, allDates.length)
  const xLabelIdxs   = nLabels <= 1
    ? [0]
    : Array.from({ length: nLabels }, (_, i) =>
        Math.round(i * (allDates.length - 1) / (nLabels - 1))
      )

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (allDates.length === 0) return
    const rect   = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
    const relX   = e.clientX - rect.left
    const relY   = e.clientY - rect.top
    const svgX   = (relX / rect.width) * VB_W
    const chartX = svgX - PAD.l
    if (chartX < 0 || chartX > CW) { setHovered(null); return }
    const idx = Math.max(0, Math.min(
      allDates.length - 1,
      Math.round((chartX / CW) * (allDates.length - 1))
    ))
    setHovered({ idx, isRight: chartX / CW > 0.62, mouseX: relX, mouseY: relY })
  }

  const hoverDate   = hovered !== null ? allDates[hovered.idx] : null
  const hoverVals   = hoverDate
    ? series.map(s => {
        const exact = s.data.find(p => p.date === hoverDate)
        if (exact) return exact.value
        return [...s.data].reverse().find(p => p.date <= hoverDate)?.value ?? s.data[0]?.value ?? 0
      })
    : []

  const containerW = containerRef.current?.clientWidth ?? 600

  return (
    <div ref={containerRef} className="relative w-full select-none">
      {showLegend && series.length > 1 && (
        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4">
          {series.map(s => (
            <div key={s.name} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
              <span className="text-[11px] font-medium" style={{ color: 'var(--muted)' }}>{s.name}</span>
            </div>
          ))}
        </div>
      )}

      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
        style={{ cursor: 'crosshair', overflow: 'visible' }}
      >
        <defs>
          {series.map((s, i) => (
            <linearGradient key={i} id={`plc-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={s.color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0"   />
            </linearGradient>
          ))}
        </defs>

        {/* Horizontal grid lines */}
        {yTicks.map((t, i) => (
          <line key={i} x1={PAD.l} y1={t.y} x2={VB_W - PAD.r} y2={t.y}
            stroke="#1A2F4A" strokeWidth="1" strokeDasharray="4,4" />
        ))}

        {/* Y-axis labels */}
        {yTicks.map((t, i) => (
          <text key={i} x={PAD.l - 8} y={t.y + 4}
            textAnchor="end" fontSize="11"
            fontFamily="'JetBrains Mono',monospace" fill="#4A6280">
            {fmtVal(t.v)}
          </text>
        ))}

        {/* X-axis labels */}
        {xLabelIdxs.map(i => (
          <text key={i} x={xFor(i)} y={VB_H - 6}
            textAnchor="middle" fontSize="11" fill="#4A6280">
            {fmtDate(allDates[i] ?? '')}
          </text>
        ))}

        {/* Area fills */}
        {series.map((s, i) => {
          const pts = s.data.map(p => [xFor(allDates.indexOf(p.date)), yFor(p.value)] as [number, number])
          return pts.length >= 2
            ? <path key={`a${i}`} d={areaPath(pts, bottom)} fill={`url(#plc-grad-${i})`} />
            : null
        })}

        {/* Lines */}
        {series.map((s, i) => {
          const pts = s.data.map(p => [xFor(allDates.indexOf(p.date)), yFor(p.value)] as [number, number])
          return pts.length >= 2
            ? <path key={`l${i}`} d={smoothPath(pts)} fill="none"
                stroke={s.color} strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" />
            : null
        })}

        {/* Crosshair + dots */}
        {hoverDate && hovered && (
          <>
            <line
              x1={xFor(hovered.idx)} y1={PAD.t}
              x2={xFor(hovered.idx)} y2={bottom}
              stroke="rgba(255,255,255,0.1)" strokeWidth="1.5"
            />
            {series.map((s, i) => (
              <circle key={i}
                cx={xFor(hovered.idx)} cy={yFor(hoverVals[i] ?? 0)}
                r={4} fill={s.color} stroke="#0D1A2E" strokeWidth={2.5}
              />
            ))}
          </>
        )}
      </svg>

      {/* Tooltip */}
      {hovered && hoverDate && (
        <div
          className="absolute pointer-events-none z-20 rounded-xl shadow-2xl text-xs"
          style={{
            background: 'var(--bg-3)',
            border: '1px solid var(--border-2)',
            padding: '8px 12px',
            top:    `${hovered.mouseY}px`,
            left:   hovered.isRight ? undefined : `${hovered.mouseX + 14}px`,
            right:  hovered.isRight ? `${containerW - hovered.mouseX + 14}px` : undefined,
            transform: 'translateY(-50%)',
            minWidth: '110px',
          }}
        >
          <p className="font-bold mb-1.5 uppercase tracking-widest"
            style={{ color: 'var(--muted)', fontSize: '9px' }}>
            {fmtDate(hoverDate)}
          </p>
          {series.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 mt-0.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="font-bold" style={{ color: s.color, fontFamily: "'JetBrains Mono',monospace" }}>
                {(hoverVals[i] ?? 0).toLocaleString('fr-FR')}
              </span>
              {series.length > 1 && (
                <span className="truncate max-w-[80px]" style={{ color: 'var(--muted)' }}>{s.name}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
