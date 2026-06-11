import { createClient, createServiceClient } from '@/lib/supabase/server'
import QuotidienForm from './QuotidienForm'
import { Target, User, Shuffle, Sun, Medal, CheckCircle2, Trophy, MoonStar } from 'lucide-react'

const CHALLENGE_ICONS: Record<string, React.ElementType> = {
  exact_score: Target,
  scorer:      User,
  combo_3:     Shuffle,
}
const CHALLENGE_LABELS: Record<string, string> = {
  exact_score: 'Score exact',
  scorer:      'Buteur',
  combo_3:     'Combiné 3 sél.',
}

const MEDAL_COLORS = ['#F0B429', '#94A3B8', '#92734D']

export default async function QuotidienPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  const todayParis = new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })
    .split('/').reverse().join('-')

  const { data: daily } = await supabase
    .from('daily_challenges')
    .select('*, matches(home_team, away_team, kickoff_at, phase)')
    .eq('challenge_date', todayParis)
    .maybeSingle()

  let existing = null
  let topEntries: any[] = []

  if (daily) {
    const { data: top } = await supabase
      .from('daily_challenge_entries')
      .select('rank, points_won, status, users(username, avatar_url), prediction_score_home, prediction_score_away, prediction_scorer')
      .eq('daily_challenge_id', daily.id)
      .not('rank', 'is', null)
      .order('rank', { ascending: true })
      .limit(10)
    topEntries = top ?? []

    if (authUser) {
      const service = await createServiceClient()
      const discordId = authUser.user_metadata?.provider_id ?? authUser.user_metadata?.sub
      const { data: dbUser } = await service.from('users').select('id').eq('discord_id', discordId).single()
      if (dbUser) {
        const { data: entry } = await service
          .from('daily_challenge_entries')
          .select('prediction_score_home, prediction_score_away, prediction_scorer, status, points_won')
          .eq('daily_challenge_id', daily.id)
          .eq('user_id', dbUser.id)
          .maybeSingle()
        existing = entry
      }
    }
  }

  const match = daily?.matches as any
  const ChallengeIcon = daily ? (CHALLENGE_ICONS[daily.challenge_type] ?? Target) : Target

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <Sun className="w-6 h-6 text-amber-400" />Défi quotidien
        </h1>
        <p className="text-slate-400 text-sm">Un nouveau défi chaque jour à 10h. Les points sont attribués à la fin du match.</p>
      </div>

      {!daily ? (
        <div className="bg-slate-800 rounded-xl p-12 text-center text-slate-500">
          <MoonStar className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Aucun défi pour aujourd'hui.</p>
          <p className="text-sm mt-1">Reviens à 10h !</p>
        </div>
      ) : (
        <>
          {/* Challenge card */}
          <div className="bg-gradient-to-br from-purple-900/40 to-slate-800 border border-purple-500/20 rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-purple-400 font-semibold uppercase tracking-wide mb-1">Défi du jour</p>
                <h2 className="text-xl font-bold">{match.home_team} vs {match.away_team}</h2>
                <p className="text-slate-400 text-sm mt-0.5">
                  {new Date(match.kickoff_at).toLocaleString('fr-FR', {
                    weekday: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
                  })} — {match.phase?.replace('_', ' ')}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 bg-purple-800/60 text-purple-200 text-sm font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                <ChallengeIcon className="w-3.5 h-3.5" />
                {CHALLENGE_LABELS[daily.challenge_type]}
              </span>
            </div>

            {/* Rewards */}
            <div className="grid grid-cols-4 gap-2 text-center text-sm">
              {[
                { Icon: Medal,        iconColor: MEDAL_COLORS[0], label: '1er',     pts: daily.reward_first   },
                { Icon: Medal,        iconColor: MEDAL_COLORS[1], label: '2ème',    pts: daily.reward_second  },
                { Icon: Medal,        iconColor: MEDAL_COLORS[2], label: '3ème',    pts: daily.reward_third   },
                { Icon: CheckCircle2, iconColor: '#22C55E',       label: 'Correct', pts: daily.reward_correct },
              ].map(r => (
                <div key={r.label} className="bg-slate-800/60 rounded-lg py-2">
                  <r.Icon className="w-5 h-5 mx-auto mb-0.5" style={{ color: r.iconColor }} />
                  <div className="text-slate-400 text-xs">{r.label}</div>
                  <div className="text-amber-400 font-bold">+{r.pts}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Participation form */}
          <QuotidienForm
            daily={{ id: daily.id, challenge_type: daily.challenge_type, reward_first: daily.reward_first, reward_second: daily.reward_second, reward_third: daily.reward_third, reward_correct: daily.reward_correct, match }}
            existing={existing}
            isAuthenticated={!!authUser}
          />

          {/* Leaderboard */}
          {topEntries.length > 0 && (
            <div className="bg-slate-800 rounded-xl p-5">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />Classement du défi
              </h2>
              <div className="space-y-2">
                {topEntries.map((e: any, i) => {
                  const u = e.users as any
                  const pred = e.prediction_score_home !== null
                    ? `${e.prediction_score_home}–${e.prediction_score_away}`
                    : e.prediction_scorer ?? '—'
                  return (
                    <div key={i} className="flex items-center justify-between bg-slate-700/40 rounded-lg px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-5 text-center">
                          {e.rank <= 3
                            ? <Medal className="w-4 h-4 inline" style={{ color: MEDAL_COLORS[e.rank - 1] }} />
                            : <span className="text-slate-400">{e.rank}</span>}
                        </span>
                        {u?.avatar_url && <img src={u.avatar_url} className="w-5 h-5 rounded-full" alt="" />}
                        <span className="font-medium">{u?.username}</span>
                        <span className="text-slate-500 text-xs">{pred}</span>
                      </div>
                      <span className="text-amber-400 font-semibold">+{e.points_won} pts</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
