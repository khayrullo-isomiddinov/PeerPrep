import { Link } from "react-router-dom"
import Card from "../../components/ui/Card"
import { Skeleton } from "../../components/ui/Feedback"
import { levelProgress } from "./badgeLevels"

// Current badge, XP and progress to the next level
export default function LevelCard({ stats, loading, linkToProfile = false }) {
  if (loading && !stats) {
    return (
      <Card>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-8 w-40" />
        <Skeleton className="mt-4 h-2 w-full" />
      </Card>
    )
  }
  if (!stats) return null

  const { current, next, percent, xp, missing } = levelProgress(stats)
  return (
    <Card>
      <div className="flex items-center justify-between">
        <p className="label text-fg-subtle">Your level</p>
        {linkToProfile && <Link to="/profile" className="text-xs font-semibold text-accent-text hover:underline">View profile</Link>}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <span className="serif grid size-12 place-items-center rounded-md bg-highlight text-[1.6rem] text-[#141413]" aria-hidden>{current.numeral}</span>
        <div>
          <p className="text-xl font-semibold tracking-[-0.02em] text-fg">{current.name}</p>
          <p className="text-sm text-fg-muted"><span className="font-mono text-fg">{xp} XP</span> · {stats.weekly_streak || 0}-week streak</p>
        </div>
      </div>
      <div className="mt-4">
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)} aria-label="Progress to next level">
          <div className="h-full rounded-full bg-fg transition-[width] duration-700" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 text-xs text-fg-subtle">
          {!next
            ? "Top level reached. Impressive!"
            : missing.length
              ? `${next.name} needs ${missing.join(", ")}.`
              : `You'll become ${next.name} after your next session.`}
        </p>
      </div>
    </Card>
  )
}
