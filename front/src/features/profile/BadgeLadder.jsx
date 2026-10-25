import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faLock, faCheck } from "@fortawesome/free-solid-svg-icons"
import Card from "../../components/ui/Card"
import { BADGE_LEVELS, levelProgress } from "./badgeLevels"

function requirementText(level) {
  const r = level.requirements
  const parts = [`${level.minXp} XP`]
  if (r.events) parts.push(`${r.events} sessions`)
  if (r.weeklyStreak) parts.push(`${r.weeklyStreak}-week streak`)
  return parts.join(" · ")
}

// All badge levels, showing which are unlocked and what the next one needs
export default function BadgeLadder({ stats }) {
  const { index: currentIndex } = levelProgress(stats)
  return (
    <Card>
      <h2 className="text-lg font-semibold text-fg">Badges</h2>
      <p className="mt-1 text-sm text-fg-muted">Earned by attending sessions and studying consistently.</p>
      <ol className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-5">
        {BADGE_LEVELS.map((level, index) => {
          const unlocked = index <= currentIndex
          const current = index === currentIndex
          return (
            <li
              key={level.name}
              className={`relative flex items-center gap-3 rounded-xl border p-3 sm:flex-col sm:items-center sm:text-center ${
                current ? "border-volt bg-volt-soft" : unlocked ? "border-line bg-surface" : "border-dashed border-line bg-surface-2"
              }`}
            >
              <span className={`text-3xl ${unlocked ? "" : "opacity-40 grayscale"}`} aria-hidden>{level.icon}</span>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${unlocked ? "text-fg" : "text-fg-subtle"}`}>{level.name}</p>
                <p className="text-xs text-fg-subtle">{requirementText(level)}</p>
              </div>
              <span className="ml-auto sm:absolute sm:right-2 sm:top-2 sm:ml-0" aria-label={unlocked ? "Unlocked" : "Locked"}>
                <FontAwesomeIcon icon={unlocked ? faCheck : faLock} className={`text-xs ${current ? "text-volt" : unlocked ? "text-success" : "text-fg-subtle"}`} />
              </span>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
