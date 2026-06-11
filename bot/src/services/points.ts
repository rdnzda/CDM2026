export function calcPoints(
  odds: number,
  stake: number,
  phaseMultiplier: number,
  boostMultiplier: number,
  wildcardDouble: boolean
): number {
  return Math.round(odds * stake * phaseMultiplier * boostMultiplier * (wildcardDouble ? 2.0 : 1.0))
}

export const PHASE_MULTIPLIERS: Record<string, number> = {
  group: 1.0,
  round_of_16: 1.5,
  quarter: 2.0,
  semi: 2.5,
  final: 3.0,
}
