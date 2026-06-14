export function getStreakMultiplier(streak: number): number {
  if (streak >= 10) return 1.5
  if (streak >= 7)  return 1.3
  if (streak >= 5)  return 1.2
  if (streak >= 3)  return 1.1
  return 1.0
}

export function calcPoints(
  odds: number,
  stake: number,
  phaseMultiplier: number,
  boostMultiplier: number,
  wildcardDouble: boolean,
  streakMultiplier = 1.0
): number {
  return Math.round(odds * stake * phaseMultiplier * boostMultiplier * (wildcardDouble ? 2.0 : 1.0) * streakMultiplier)
}

export const PHASE_MULTIPLIERS: Record<string, number> = {
  group: 1.0,
  round_of_16: 1.5,
  quarter: 2.0,
  semi: 2.5,
  final: 3.0,
}
