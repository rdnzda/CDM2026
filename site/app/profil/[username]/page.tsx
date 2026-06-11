import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Award, ClipboardList } from 'lucide-react'

export default async function ProfilPage({ params }: { params: { username: string } }) {
  const supabase = await createClient()

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('username', params.username)
    .single()

  if (!user) notFound()

  const [{ data: achievements }, { data: recentBets }] = await Promise.all([
    supabase.from('user_achievements').select('*, achievements(*)').eq('user_id', user.id),
    supabase.from('bets').select('*, matches(home_team, away_team)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
  ])

  const winrate = user.total_bets > 0 ? Math.round(user.bets_won * 100 / user.total_bets) : 0

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-slate-800 rounded-xl p-6 flex items-center gap-4">
        {user.avatar_url && <img src={user.avatar_url} alt="" className="w-16 h-16 rounded-full" />}
        <div>
          <h1 className="text-2xl font-bold">{user.username}</h1>
          <p className="text-slate-400 text-sm">Membre depuis {new Date(user.created_at).toLocaleDateString('fr-FR')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Points', value: user.total_points.toLocaleString('fr-FR'), color: 'text-amber-400' },
          { label: 'Winrate', value: `${winrate}%`, color: 'text-green-400' },
          { label: 'Duels gagnés', value: user.duels_won, color: 'text-blue-400' },
          { label: 'Cote moy.', value: user.avg_odds ? `×${Number(user.avg_odds).toFixed(2)}` : 'N/A', color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-sm">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {achievements && achievements.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />Succès ({achievements.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {achievements.map((ua: any) => (
              <span key={ua.id} title={`${ua.achievements.name} — ${ua.achievements.description}`} className="bg-slate-700 px-3 py-1 rounded-full text-sm cursor-help">
                {ua.achievements.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {recentBets && recentBets.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-slate-400" />Paris récents
          </h2>
          <div className="space-y-2 text-sm">
            {recentBets.map((bet: any) => {
              const match = bet.matches as any
              const statusColor = bet.status === 'won' ? 'text-green-400' : bet.status === 'lost' ? 'text-red-400' : 'text-slate-400'
              return (
                <div key={bet.id} className="flex items-center justify-between bg-slate-700/50 rounded px-3 py-2">
                  <span>{match?.home_team} vs {match?.away_team}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400">{bet.stake.toLocaleString('fr-FR')} pts</span>
                    <span className={statusColor}>●</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
