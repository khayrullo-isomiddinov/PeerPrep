import { useCallback, useEffect, useRef, useState } from "react"
import { drawElement } from "../whiteboard/elements"

// Fixed "paper" colors: the pad is a white sheet in both themes, like the real whiteboard
const PAPER = "#FFFFFF"
const RULE = "rgba(20,20,19,0.07)"
const TOOLS = [
  { id: "ink", label: "Pen", color: "#141413", width: 3, opacity: 1 },
  { id: "blue", label: "Blue pen", color: "#2B45E0", width: 3, opacity: 1 },
  { id: "marker", label: "Highlighter", color: "#E2F53A", width: 18, opacity: 0.55 },
]

// A tiny, local-only taste of the shared whiteboard on the landing page (nothing is saved or sent)
export default function DoodlePad() {
  const canvasRef = useRef(null)
  const strokesRef = useRef([])
  const currentRef = useRef(null)
  const [tool, setTool] = useState(TOOLS[0])
  const [hasDrawn, setHasDrawn] = useState(false)

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr
    const h = canvas.height / dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = PAPER
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = RULE
    for (let y = 31; y < h; y += 28) ctx.fillRect(0, y, w, 1)
    for (const stroke of strokesRef.current) drawElement(ctx, stroke)
    if (currentRef.current) drawElement(ctx, currentRef.current)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      render()
    })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [render])

  function point(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    return [Math.round(e.clientX - rect.left), Math.round(e.clientY - rect.top)]
  }

  function onPointerDown(e) {
    e.preventDefault()
    canvasRef.current.setPointerCapture(e.pointerId)
    currentRef.current = { type: "stroke", color: tool.color, width: tool.width, opacity: tool.opacity, points: [point(e)] }
    setHasDrawn(true)
    render()
  }

  function onPointerMove(e) {
    const stroke = currentRef.current
    if (!stroke) return
    const events = e.nativeEvent.getCoalescedEvents?.() || [e]
    for (const ev of events.length ? events : [e]) {
      const [x, y] = point(ev)
      const [lx, ly] = stroke.points[stroke.points.length - 1]
      if (Math.hypot(x - lx, y - ly) >= 1.5) stroke.points.push([x, y])
    }
    render()
  }

  function onPointerUp() {
    if (currentRef.current) strokesRef.current.push(currentRef.current)
    currentRef.current = null
    render()
  }

  function clear() {
    strokesRef.current = []
    setHasDrawn(false)
    render()
  }

  return (
    <figure className="relative rotate-[-1.2deg] rounded-xl border border-line-strong bg-white shadow-raised transition-transform duration-500 hover:rotate-0">
      <div className="flex items-center gap-1 border-b border-[#E6E4DD] px-3 py-2">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTool(t)}
            aria-label={t.label}
            aria-pressed={tool.id === t.id}
            className={`grid size-8 place-items-center rounded-md transition-colors ${tool.id === t.id ? "bg-[#F1F0EB]" : "hover:bg-[#F7F6F2]"}`}
          >
            <span
              className="block rounded-full"
              style={{ background: t.color, opacity: t.id === "marker" ? 0.9 : 1, width: t.id === "marker" ? 14 : 10, height: t.id === "marker" ? 6 : 10 }}
            />
          </button>
        ))}
        <span className="label ml-2 text-[#6E6C66]">whiteboard · try it</span>
        <button
          type="button"
          onClick={clear}
          disabled={!hasDrawn}
          className="ml-auto rounded-md px-2 py-1 text-xs font-medium text-[#55534E] hover:bg-[#F1F0EB] disabled:opacity-0"
        >
          Clear
        </button>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          aria-label="Practice whiteboard. Draw with your mouse or finger."
          className="block h-64 w-full touch-none cursor-crosshair rounded-b-xl sm:h-80"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        {!hasDrawn && (
          <p className="pointer-events-none absolute inset-0 grid place-items-center px-6 text-center">
            <span className="serif text-2xl text-[#6E6C66] sm:text-3xl">
              Go on, sketch something.
              <span className="mt-1 block font-sans text-xs not-italic tracking-normal text-[#8C8A83]">This is the same whiteboard your group gets.</span>
            </span>
          </p>
        )}
      </div>
    </figure>
  )
}
