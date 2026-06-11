export function formatPoints(pts: number): string {
  return pts.toLocaleString('fr-FR') + ' pts'
}

export function formatOdds(odds: number): string {
  return `×${odds.toFixed(2)}`
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Paris',
  })
}

export function formatMatch(match: { home_team: string; away_team: string }): string {
  return `${match.home_team} vs ${match.away_team}`
}

export function formatBetType(type: string): string {
  const labels: Record<string, string> = {
    result: 'Résultat',
    exact_score: 'Score exact',
    scorer: 'Buteur',
    btts: 'Les deux équipes marquent',
    over_under: 'Over/Under 2.5',
    red_card: 'Carton rouge',
    best_half: 'Meilleure mi-temps',
    extra_time: 'Prolongations',
  }
  return labels[type] ?? type
}

export function formatResult(result: string): string {
  const labels: Record<string, string> = { home: 'Domicile', draw: 'Nul', away: 'Extérieur' }
  return labels[result] ?? result
}
