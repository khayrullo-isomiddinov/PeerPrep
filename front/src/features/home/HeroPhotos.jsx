import calculusBoard from "../../images/landing/calculus-board.webp"
import competitionCrew from "../../images/landing/competition-crew.webp"
import dormStudy from "../../images/landing/dorm-study.webp"
import logicGates from "../../images/landing/logic-gates.webp"
import sideBySide from "../../images/landing/side-by-side.webp"
import { useParallax } from "./motion"
import Reveal from "./Reveal"

// Real study sessions from PeerPrep's own circle. Captions describe the moment, not the people.
// `float` places the card around the hero on wide screens, always fully on screen. `speed` is its parallax
// depth; all positive, so cards drift up and away as you scroll and never sink into the hero's clipped edge.
const PHOTOS = [
  { src: calculusBoard, caption: "Limits, worked on the board", w: 720, h: 540,
    float: "left-[3%] top-[8%] w-56 -rotate-3", speed: 0.22 },
  { src: dormStudy, caption: "Late-night dorm session", w: 720, h: 540,
    float: "left-[2%] top-[44%] w-48 rotate-2", speed: 0.1 },
  { src: competitionCrew, caption: "After the coding competition", w: 720, h: 540,
    float: "left-[9%] bottom-[5%] w-48 -rotate-1", speed: 0.05 },
  { src: logicGates, caption: "Logic gates, explained", w: 720, h: 540,
    float: "right-[3%] top-[10%] w-56 rotate-[2.5deg]", speed: 0.16 },
  { src: sideBySide, caption: "Problem set, side by side", w: 540, h: 720,
    float: "right-[7%] bottom-[5%] w-36 -rotate-2", speed: 0.08 },
]

function PhotoCard({ photo, className = "", speed, delay, eager }) {
  const ref = useParallax(speed)
  return (
    // The outer box stays put (parallax measures it); the inner one drifts
    <div className={className}>
      <div ref={ref} className="will-change-transform">
        <Reveal delay={delay}>
          <figure className="relative rounded-2xl border border-line bg-surface p-1.5 shadow-raised">
            <img
              src={photo.src}
              width={photo.w}
              height={photo.h}
              alt=""
              loading={eager ? "eager" : "lazy"}
              decoding="async"
              className="block h-auto w-full rounded-xl bg-surface-3"
            />
            <figcaption className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] truncate rounded-full border border-line bg-surface/90 px-2.5 py-1 text-[0.7rem] font-semibold text-fg backdrop-blur-sm">
              {photo.caption}
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </div>
  )
}

// Wide screens: photos float around the hero text, each drifting at its own depth
export function FloatingPhotos() {
  return (
    <div className="pointer-events-none absolute inset-0 hidden xl:block" aria-hidden>
      {PHOTOS.map((photo, i) => (
        <PhotoCard key={photo.caption} photo={photo} className={`absolute ${photo.float}`} speed={photo.speed} delay={120 + i * 90} eager />
      ))}
    </div>
  )
}

// Phones and tablets: the landscape photos in a grid that always fits the screen
const TILTS = ["-rotate-1", "rotate-1 sm:translate-y-6", "rotate-1", "-rotate-1 sm:translate-y-6"]

export function PhotoStrip() {
  const landscape = PHOTOS.filter((p) => p.w > p.h)
  return (
    <div className="mt-12 grid w-full max-w-4xl grid-cols-2 gap-3 px-1 pb-6 sm:grid-cols-4 sm:gap-4 xl:hidden" aria-hidden>
      {landscape.map((photo, i) => (
        <PhotoCard key={photo.caption} photo={photo} className={`min-w-0 ${TILTS[i]}`} speed={i % 2 ? 0.08 : 0.04} delay={i * 80} />
      ))}
    </div>
  )
}
