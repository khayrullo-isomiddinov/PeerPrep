import { useMemo } from "react"
import Card from "../../components/ui/Card"
import { formatMinutes, recentDays } from "./focusTimerModel"

const weekday = (date, style) => date.toLocaleDateString("en-US", { weekday: style })

// Focus minutes over the last 7 days, from finished focus blocks in this browser
export default function FocusWeek({ log, now }) {
  const days = useMemo(() => recentDays(log, now, 7), [log, now])
  const today = days[days.length - 1]
  const week = days.reduce((sum, d) => sum + d.minutes, 0)
  const max = Math.max(60, ...days.map((d) => d.minutes))

  return (
    <Card>
      <h2 className="font-semibold text-fg">Focus this week</h2>
      <dl className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <dt className="label text-fg-subtle">Today</dt>
          <dd className="mt-1 font-mono text-2xl font-medium tracking-tight text-fg">{formatMinutes(today.minutes)}</dd>
        </div>
        <div>
          <dt className="label text-fg-subtle">Last 7 days</dt>
          <dd className="mt-1 font-mono text-2xl font-medium tracking-tight text-fg">{formatMinutes(week)}</dd>
        </div>
      </dl>

      <div className="mt-5 flex h-24 items-end gap-[2px]" aria-hidden>
        {days.map((d, i) => {
          const isToday = i === days.length - 1
          const label = `${weekday(d.date, "short")}: ${formatMinutes(d.minutes)}`
          return (
            <div key={d.day} className="group relative flex h-full flex-1 flex-col items-center justify-end">
              {isToday && d.minutes > 0 && <span className="mb-1 font-mono text-[0.65rem] text-fg-muted">{d.minutes}m</span>}
              <div
                className={`w-full max-w-7 ${d.minutes ? `rounded-t-[4px] ${isToday ? "bg-fg" : "bg-fg-subtle group-hover:bg-fg-muted"}` : "h-px bg-line-strong"}`}
                style={d.minutes ? { height: `${Math.max(4, (d.minutes / max) * 100)}%` } : undefined}
              />
              <span className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-md border border-line bg-surface px-2 py-1 text-xs text-fg shadow-raised group-hover:block">
                {label}
              </span>
            </div>
          )
        })}
      </div>
      <div className="mt-1.5 flex gap-[2px]" aria-hidden>
        {days.map((d) => (
          <span key={d.day} className="label flex-1 text-center text-[0.6rem] text-fg-subtle">{weekday(d.date, "narrow")}</span>
        ))}
      </div>

      <table className="sr-only">
        <caption>Focus minutes per day, last 7 days</caption>
        <tbody>
          {days.map((d) => (
            <tr key={d.day}><th scope="row">{weekday(d.date, "long")}</th><td>{formatMinutes(d.minutes)}</td></tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-xs text-fg-subtle">Counted from finished focus blocks in this browser.</p>
    </Card>
  )
}
