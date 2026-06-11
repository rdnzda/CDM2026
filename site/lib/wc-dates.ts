export const WC_START = '2026-06-11'
export const WC_END   = '2026-07-19'

export function wcDays(): string[] {
  const today = new Date().toISOString().slice(0, 10)
  const end   = today < WC_END ? today : WC_END
  const days: string[] = []
  const d    = new Date(WC_START + 'T12:00:00Z')
  const last = new Date(end      + 'T12:00:00Z')
  while (d <= last) {
    days.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return days
}

export type ResolvedItem = {
  resolved_at: string | null
  stake: number
  points_won: number | null
}

export type ResolvedChallenge = {
  finished_at: string | null
  stake: number
  is_winner: boolean
}

/**
 * Builds a cumulative daily points series for the WC period.
 * Net change per item = points_won - stake (works for won/lost/refunded).
 */
export function buildCumulative(
  items:      ResolvedItem[],
  challenges: ResolvedChallenge[],
  currentPoints: number,
): { date: string; value: number }[] {
  const days = wcDays()
  const daily: Record<string, number> = {}

  for (const item of items) {
    if (!item.resolved_at) continue
    const date = item.resolved_at.slice(0, 10)
    if (date < WC_START) continue
    const net = (item.points_won ?? 0) - item.stake
    daily[date] = (daily[date] ?? 0) + net
  }

  for (const ch of challenges) {
    if (!ch.finished_at) continue
    const date = ch.finished_at.slice(0, 10)
    if (date < WC_START) continue
    daily[date] = (daily[date] ?? 0) + (ch.is_winner ? ch.stake : -ch.stake)
  }

  const totalWcNet = days.reduce((s, d) => s + (daily[d] ?? 0), 0)
  const startValue = currentPoints - totalWcNet

  let cum = startValue
  return days.map(date => {
    cum += daily[date] ?? 0
    return { date, value: cum }
  })
}
