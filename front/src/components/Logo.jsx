import { useId } from "react"

// PeerPrep mark: three connected peers; the volt one is you joining the group
export function LogoMark({ className = "size-8" }) {
  const gradientId = useId()
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2448E8" />
          <stop offset="1" stopColor="#0FB5D0" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gradientId})`} />
      <path d="M10.5 21.5 16 10.5l5.5 11" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" opacity=".55" />
      <circle cx="16" cy="10.5" r="3" fill="#fff" />
      <circle cx="10.5" cy="21.5" r="3" fill="#fff" />
      <circle cx="21.5" cy="21.5" r="3" fill="#B6F25C" />
    </svg>
  )
}

export default function Logo({ className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className="font-display text-[1.15rem] font-bold tracking-tight text-fg">PeerPrep</span>
    </span>
  )
}
