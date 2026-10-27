import { useRef } from "react"
import { useRevealed } from "./motion"

// Fades and lifts its content into place the first time it scrolls into view.
// `delay` (ms) staggers siblings; `as` picks the element (e.g. "li").
export default function Reveal({ as = "div", delay = 0, className = "", children, ...props }) {
  const Component = as
  const ref = useRef(null)
  const shown = useRevealed(ref)
  return (
    <Component
      ref={ref}
      className={`reveal ${shown ? "is-shown" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      {...props}
    >
      {children}
    </Component>
  )
}
