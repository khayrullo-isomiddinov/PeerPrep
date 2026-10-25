import { useState } from "react"

// Stable background per person, so the same user always gets the same color
const TONES = [
  "bg-[#2448E8] text-white",
  "bg-[#0B7A92] text-white",
  "bg-[#4D7C0F] text-white",
  "bg-[#7C3AED] text-white",
  "bg-[#B45309] text-white",
  "bg-[#BE185D] text-white",
]

const SIZES = {
  xs: "size-6 text-[0.65rem]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
  xl: "size-24 text-3xl sm:size-28",
}

function initials(name) {
  const parts = (name || "?").trim().split(/[\s@._-]+/).filter(Boolean)
  return ((parts[0]?.[0] || "?") + (parts.length > 1 ? parts[1][0] : "")).toUpperCase()
}

// Profile photo, or initials when there's no photo (or it fails to load)
export default function Avatar({ name, src, id = 0, size = "md", className = "" }) {
  // Remember which source failed, so a new photo gets a fresh attempt
  const [failedSrc, setFailedSrc] = useState(null)
  const shape = `${SIZES[size]} rounded-full shrink-0`
  if (src && failedSrc !== src) {
    return <img src={src} alt="" onError={() => setFailedSrc(src)} className={`${shape} object-cover bg-surface-3 ${className}`} />
  }
  return (
    <span aria-hidden className={`${shape} inline-grid place-items-center font-semibold ${TONES[Math.abs(Number(id) || 0) % TONES.length]} ${className}`}>
      {initials(name)}
    </span>
  )
}
