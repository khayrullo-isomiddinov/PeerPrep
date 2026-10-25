// Two peers, overlapping. The overlap (what you learn together) is highlighted.
// Strokes use currentColor, so the mark follows the text color in both themes.
export function LogoMark({ className = "size-7" }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path d="M16 9.07A8 8 0 0 1 16 22.93 8 8 0 0 1 16 9.07Z" fill="var(--highlight)" />
      <circle cx="12" cy="16" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="20" cy="16" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

export default function Logo({ className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2 text-fg ${className}`}>
      <LogoMark />
      <span className="text-[1.2rem] font-semibold leading-none tracking-[-0.04em]">
        peer<span className="serif text-[1.3rem] tracking-normal">prep</span>
      </span>
    </span>
  )
}
