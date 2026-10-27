// Scroll effects for the landing page: parallax and reveal-on-scroll.
// Both switch off when the visitor prefers reduced motion, and both are cheap: one passive scroll listener
// shared by every parallax element, transforms only (no layout), and an IntersectionObserver for reveals.
import { useEffect, useRef, useState } from "react"

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
}

const items = new Set()
let frame = null

// Where an element sits "at rest" (no offset), as a viewport y of its centre. Things visible when the page
// loads rest where they are at the top of the page, so nothing jumps on load; everything else rests when it
// passes the middle of the screen.
function restingPoint(centerInPage) {
  return centerInPage < window.innerHeight ? centerInPage : window.innerHeight / 2
}

function update() {
  frame = null
  for (const { el, speed } of items) {
    // Measure the wrapper, not the moving element, so the transform never feeds back into the measurement
    const box = el.parentElement.getBoundingClientRect()
    if (box.bottom < -200 || box.top > window.innerHeight + 200) continue
    const center = box.top + box.height / 2
    const offset = (center - restingPoint(center + window.scrollY)) * speed
    el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`
  }
}

function schedule() {
  if (frame == null) frame = requestAnimationFrame(update)
}

function register(item) {
  if (items.size === 0) {
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
  }
  items.add(item)
  schedule()
  return () => {
    items.delete(item)
    item.el.style.transform = ""
    if (items.size === 0) {
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
    }
  }
}

// Ref for an element that drifts as the page scrolls: positive `speed` moves it up faster than the page, negative slower.
// Small values (±0.05–0.2) read as depth; the element's parent must not move with it.
export function useParallax(speed) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !speed || prefersReducedMotion()) return
    return register({ el, speed })
  }, [speed])
  return ref
}

// True once the element has scrolled into view (and stays true)
export function useRevealed(ref, { margin = "0px 0px -12% 0px" } = {}) {
  const [shown, setShown] = useState(() => prefersReducedMotion() || typeof IntersectionObserver === "undefined")
  useEffect(() => {
    if (shown || !ref.current) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setShown(true)
        observer.disconnect()
      }
    }, { rootMargin: margin })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [ref, shown, margin])
  return shown
}
