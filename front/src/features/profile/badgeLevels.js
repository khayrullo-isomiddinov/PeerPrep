// Badge levels. Mirrors BadgeSystem.BADGES in back/app/services/gamification.py, because the API
// returns only the user's current badge, not the full ladder. Keep the two lists in sync.
export const BADGE_LEVELS = [
  { name: "Beginner", minXp: 0, icon: "🌱", requirements: {} },
  { name: "Learner", minXp: 200, icon: "📚", requirements: { events: 2, weeklyStreak: 1, engagement: 0.2 } },
  { name: "Achiever", minXp: 500, icon: "⭐", requirements: { events: 5, weeklyStreak: 3, engagement: 0.4 } },
  { name: "Expert", minXp: 1500, icon: "🏆", requirements: { events: 15, weeklyStreak: 8, engagement: 0.6 } },
  { name: "Master", minXp: 4000, icon: "👑", requirements: { events: 40, weeklyStreak: 16, engagement: 0.8 } },
]

// What's still missing for a level, as short phrases ("2 more sessions", "a 3-week streak")
function missingFor(level, stats) {
  const xp = stats?.total_xp || 0
  const r = level.requirements
  const missing = []
  if (xp < level.minXp) missing.push(`${level.minXp - xp} more XP`)
  const events = stats?.events_attended || 0
  if (r.events && events < r.events) missing.push(`${r.events - events} more session${r.events - events === 1 ? "" : "s"}`)
  if (r.weeklyStreak && (stats?.weekly_streak || 0) < r.weeklyStreak) missing.push(`a ${r.weeklyStreak}-week streak`)
  if (r.engagement && (stats?.engagement_score || 0) < r.engagement) missing.push(`${Math.round(r.engagement * 100)}% engagement`)
  return missing
}

// Where the user stands: current level, the next one, and progress toward it.
// Progress counts every requirement (not just XP), matching how the backend promotes users.
export function levelProgress(stats) {
  const xp = stats?.total_xp || 0
  const byName = BADGE_LEVELS.findIndex((l) => l.name === stats?.badge?.name)
  const index = byName >= 0 ? byName : 0
  const current = BADGE_LEVELS[index]
  const next = BADGE_LEVELS[index + 1] || null
  if (!next) return { index, current, next, percent: 100, xp, missing: [] }

  const r = next.requirements
  const parts = [Math.min(1, (xp - current.minXp) / (next.minXp - current.minXp))]
  if (r.events) parts.push(Math.min(1, (stats?.events_attended || 0) / r.events))
  if (r.weeklyStreak) parts.push(Math.min(1, (stats?.weekly_streak || 0) / r.weeklyStreak))
  if (r.engagement) parts.push(Math.min(1, (stats?.engagement_score || 0) / r.engagement))
  const percent = Math.max(0, (parts.reduce((a, b) => a + b, 0) / parts.length) * 100)

  return { index, current, next, percent, xp, missing: missingFor(next, stats) }
}
