import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faHouse, faCalendarDays, faPlus, faStopwatch, faUser, faComments, faChalkboard, faMobileScreen,
} from "@fortawesome/free-solid-svg-icons"
import { LogoMark } from "../../components/Logo"
import { useParallax } from "./motion"
import Reveal from "./Reveal"

// The phone's hardware stays dark in both themes, like a real device; the screen uses the theme tokens
const BEZEL = "#141413"

// A miniature of PeerPrep's phone layout: the focus timer, a session, the tab bar. Illustrative only.
function PhoneScreen() {
  const r = 30
  const c = 2 * Math.PI * r
  return (
    <div className="flex h-full flex-col bg-canvas text-fg">
      <div className="flex items-center justify-between px-5 pb-1 pt-2.5 font-mono text-[0.55rem] font-semibold">
        <span>9:41</span>
        <span className="flex items-end gap-[2px]" aria-hidden>
          {[3, 5, 7, 9].map((h) => <span key={h} className="w-[3px] rounded-[1px] bg-fg" style={{ height: h }} />)}
        </span>
      </div>
      <div className="flex items-center gap-1.5 border-b border-line px-4 py-2">
        <LogoMark className="size-4" />
        <span className="text-[0.7rem] font-semibold tracking-[-0.03em]">peer<span className="serif">prep</span></span>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 px-3.5 py-3">
        <div className="rounded-xl border border-line bg-surface p-3 text-center">
          <p className="label text-[0.5rem] text-fg-subtle">Focus</p>
          <div className="relative mx-auto mt-1 size-[4.75rem]">
            <svg viewBox="0 0 70 70" className="absolute inset-0 -rotate-90" aria-hidden>
              <circle cx="35" cy="35" r={r} fill="none" stroke="var(--line)" strokeWidth="2" />
              <circle cx="35" cy="35" r={r} fill="none" stroke="var(--fg)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * 0.38} />
            </svg>
            <span className="absolute inset-0 grid place-items-center font-mono text-base font-medium tracking-tight">18:42</span>
          </div>
          <p className="mt-1.5 truncate text-[0.55rem] text-fg-muted">Working on <span className="font-semibold text-fg">past paper, Q1–5</span></p>
        </div>

        <div className="rounded-xl border border-line bg-surface p-2.5">
          <span className="label inline-flex items-center gap-1 rounded-sm bg-highlight px-1.5 py-0.5 text-[0.45rem] text-[#141413]">
            <span className="size-1 rounded-full bg-current" />Live
          </span>
          <p className="mt-1.5 text-[0.68rem] font-semibold leading-tight">Calculus: limits review</p>
          <p className="mt-0.5 text-[0.55rem] text-fg-muted">Library, room 3</p>
          <div className="mt-2 flex gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-[0.5rem] font-semibold text-accent-fg"><FontAwesomeIcon icon={faChalkboard} />Whiteboard</span>
            <span className="inline-flex items-center gap-1 rounded-md border border-line-strong px-2 py-1 text-[0.5rem] font-semibold"><FontAwesomeIcon icon={faComments} />Chat</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 border-t border-line px-2 pb-4 pt-2 text-[0.6rem] text-fg-subtle">
        {[faHouse, faCalendarDays, faPlus, faStopwatch, faUser].map((icon, i) => (
          <span key={i} className="grid place-items-center">
            <span className={`grid h-5 w-7 place-items-center rounded ${i === 2 ? "bg-accent text-accent-fg" : i === 3 ? "bg-surface-3 text-fg" : ""}`}>
              <FontAwesomeIcon icon={icon} />
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

function Phone() {
  return (
    <div className="relative w-[15.5rem] rounded-[2.6rem] p-2.5 shadow-overlay sm:w-[17rem]" style={{ background: BEZEL }}>
      {/* the camera cut-out */}
      <span className="absolute left-1/2 top-4 z-10 h-[1.1rem] w-[4.5rem] -translate-x-1/2 rounded-full" style={{ background: BEZEL }} aria-hidden />
      <div className="aspect-[9/19] overflow-hidden rounded-[2rem]">
        <PhoneScreen />
      </div>
    </div>
  )
}

// Small labels that pop in around the phone, one after another
const CHIPS = [
  { label: "Focus timer", icon: faStopwatch, place: "-left-6 top-[18%]", delay: 450 },
  { label: "Group chat", icon: faComments, place: "-right-8 top-[42%]", delay: 600 },
  { label: "Shared whiteboard", icon: faChalkboard, place: "-left-10 bottom-[16%]", delay: 750 },
]

export default function MobileTeaser() {
  const phoneRef = useParallax(0.1)
  return (
    <section className="overflow-hidden border-t border-line bg-surface">
      <div className="page-container grid items-center gap-14 py-16 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <Reveal>
          <p className="label inline-flex items-center gap-2 text-fg-subtle">
            <FontAwesomeIcon icon={faMobileScreen} />
            In the works
          </p>
          <h2 className="mt-3 text-[2.1rem] leading-[1.08] tracking-[-0.04em] text-fg sm:text-5xl">
            PeerPrep is coming <span className="serif text-[1.12em]">to your phone.</span>
          </h2>
          <p className="mt-4 max-w-md leading-relaxed text-fg-muted">
            We&apos;re building a mobile app, so your sessions, chats and focus timer are always in your pocket.
            Until it&apos;s ready, PeerPrep already works in your phone&apos;s browser, and you can add it to your
            home screen to open it like an app.
          </p>
          <dl className="mt-6 grid max-w-md gap-3 text-sm">
            <div className="rounded-lg border border-line bg-canvas px-4 py-3">
              <dt className="font-semibold text-fg">iPhone</dt>
              <dd className="mt-0.5 text-fg-muted">In Safari, tap Share, then “Add to Home Screen”.</dd>
            </div>
            <div className="rounded-lg border border-line bg-canvas px-4 py-3">
              <dt className="font-semibold text-fg">Android</dt>
              <dd className="mt-0.5 text-fg-muted">In Chrome, open the ⋮ menu, then “Add to Home screen” or “Install app”.</dd>
            </div>
          </dl>
        </Reveal>

        <div className="flex justify-center py-6" aria-hidden>
          <div ref={phoneRef} className="will-change-transform">
            <Reveal className="reveal-pop relative">
              <Phone />
              {CHIPS.map((chip) => (
                <Reveal
                  key={chip.label}
                  delay={chip.delay}
                  className={`absolute hidden sm:block ${chip.place}`}
                >
                  <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-fg shadow-raised">
                    <FontAwesomeIcon icon={chip.icon} className="text-fg-subtle" />
                    {chip.label}
                  </span>
                </Reveal>
              ))}
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}
