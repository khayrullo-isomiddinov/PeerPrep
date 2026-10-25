const MAX_TICKS = 12

// Seats as little blocks, filled for taken. Big events are drawn to scale over 12 blocks.
export default function SeatTicks({ taken, capacity, className = "" }) {
  const total = Math.max(1, capacity)
  const ticks = Math.min(total, MAX_TICKS)
  const filled = Math.min(ticks, Math.round((taken / total) * ticks))
  const full = taken >= total
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="flex gap-[3px]" aria-hidden>
        {Array.from({ length: ticks }, (_, i) => (
          <span
            key={i}
            className={`h-3 w-[5px] rounded-[1.5px] ${i < filled ? (full ? "bg-warning" : "bg-fg") : "border border-line-strong"}`}
          />
        ))}
      </div>
      <span className="font-mono text-[0.7rem] text-fg-subtle">
        {taken}/{capacity}
        <span className="sr-only"> spots taken</span>
      </span>
    </div>
  )
}
