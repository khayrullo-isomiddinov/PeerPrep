import { useEffect, useMemo, useRef, useState } from "react"

export default function PillTabs({ tabs, value, onChange }) {
  const listRef = useRef(null)
  const btnRefs = useRef({})
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })

  const activeIndex = useMemo(() => Math.max(0, tabs.findIndex(t => t.value === value)), [tabs, value])

  useEffect(() => {
    const el = btnRefs.current?.[tabs[activeIndex]?.value]
    const list = listRef.current
    if (!el || !list) return
    const { left: l1 } = list.getBoundingClientRect()
    const { left: l2, width } = el.getBoundingClientRect()
    setIndicator({ left: l2 - l1 + list.scrollLeft, width })
  }, [activeIndex, tabs])

  useEffect(() => {
    const onResize = () => {
      const el = btnRefs.current?.[tabs[activeIndex]?.value]
      const list = listRef.current
      if (!el || !list) return
      const { left: l1 } = list.getBoundingClientRect()
      const { left: l2, width } = el.getBoundingClientRect()
      setIndicator({ left: l2 - l1 + list.scrollLeft, width })
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [activeIndex, tabs])

  function onKey(e, idx) {
    if (e.key === "ArrowRight") {
      const next = (idx + 1) % tabs.length
      onChange?.(tabs[next].value)
      btnRefs.current[tabs[next].value]?.focus()
    } else if (e.key === "ArrowLeft") {
      const prev = (idx - 1 + tabs.length) % tabs.length
      onChange?.(tabs[prev].value)
      btnRefs.current[tabs[prev].value]?.focus()
    } else if (e.key === "Home") {
      onChange?.(tabs[0].value)
      btnRefs.current[tabs[0].value]?.focus()
    } else if (e.key === "End") {
      onChange?.(tabs[tabs.length - 1].value)
      btnRefs.current[tabs[tabs.length - 1].value]?.focus()
    }
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      className="premium-glass rounded-pill p-1.5 relative overflow-x-auto premium-scrollbar tap-safe"
      style={{ WebkitBackdropFilter: "blur(20px)" }}
    >
      <div
        className="absolute top-1.5 bottom-1.5 rounded-pill transition-all duration-300 ease-out"
        style={{ left: `${indicator.left}px`, width: `${indicator.width}px`, background: "rgba(52,211,153,.18)", boxShadow: "var(--ring-soft)" }}
        aria-hidden="true"
      />
      <div className="flex items-center gap-1 relative">
        {tabs.map((t, idx) => {
          const active = t.value === value
          return (
            <button
              key={t.value}
              ref={r => (btnRefs.current[t.value] = r)}
              role="tab"
              aria-selected={active ? "true" : "false"}
              onKeyDown={e => onKey(e, idx)}
              onClick={() => onChange?.(t.value)}
              className={[
                "pill px-3 py-1.5 text-sm font-semibold transition-colors whitespace-nowrap focus:outline-none premium-focus",
                active ? "premium-text-primary" : "text-muted hover:opacity-100"
              ].join(" ")}
            >
              <span className="inline-flex items-center gap-2">
                {t.icon ? <span className="text-sm">{t.icon}</span> : null}
                <span>{t.label}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
