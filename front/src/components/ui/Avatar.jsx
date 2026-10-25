import { useState } from "react"

// Stable background per person, so the same user always gets the same color
const TONES = [
  "bg-[#2B45E0] text-white",
  "bg-[#0F6E66] text-white",
  "bg-[#7A4E2D] text-white",
  "bg-[#55534E] text-white",
  "bg-[#8B3A5A] text-white",
  "bg-[#3D5A1E] text-white",
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
