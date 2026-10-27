import { useMemo } from "react"
import { Link } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faArrowRight } from "@fortawesome/free-solid-svg-icons"
import { useEvents } from "../../hooks/useEvents"
import { sortByStart } from "../../utils/dates"
import Button from "../../components/ui/Button"
import EventList, { EventGridSkeleton } from "../events/EventList"
import DoodlePad from "./DoodlePad"
import Reveal from "./Reveal"
import MobileTeaser from "./MobileTeaser"
import { FloatingPhotos, PhotoStrip } from "./HeroPhotos"
import { useParallax } from "./motion"

const REPO_URL = "https://github.com/khayrullo-isomiddinov/PeerPrep"

const CHAPTERS = [
  {
    title: "Find",
    text: "Search by exam, course or place, see how many people are already going, and join in one tap. Or host your own in a minute.",
  },
  {
    title: "Plan",
    text: "Every session gets its own group chat, so you agree on chapters and past papers before you sit down, not after.",
  },
  {
    title: "Work it out",
    text: "A shared whiteboard for the problem nobody can solve alone. Sketch, annotate, drop a sticky note, export it for later.",
  },
  {
    title: "Focus",
    text: "A focus timer with real breaks and a short plan for today, so the hours you sit down for become hours of work. It runs in your browser and needs no account.",
  },
  {
    title: "Keep going",
    text: "Attend, earn XP, keep your weekly streak. Five levels from Beginner to Master, counted from sessions you actually showed up to.",
  },
]

// One request feeds both the hero's live count and "Coming up this week"
const UPCOMING_PARAMS = { status: "upcoming", sort: "soonest", limit: 50 }

// A real number from the API, never a made-up one. Until it loads (or if there's nothing), the plain promise.
function HeroPill() {
  const { data } = useEvents(UPCOMING_PARAMS)
  const count = data?.length || 0
  return (
    <p className="inline-flex h-8 items-center gap-2 rounded-full border border-line bg-surface/80 px-3.5 text-xs font-semibold text-fg backdrop-blur-sm">
      {count > 0 ? (
        <>
          <span className="relative flex size-2" aria-hidden>
            <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-60" />
            <span className="relative size-2 rounded-full bg-success" />
          </span>
          <Link to="/events" className="hover:underline hover:underline-offset-4">
            {count >= UPCOMING_PARAMS.limit ? `${count}+` : count} study {count === 1 ? "session" : "sessions"} coming up
          </Link>
        </>
      ) : (
        <span className="label text-fg-subtle">Free · No ads · Open source</span>
      )}
    </p>
  )
}

function ThisWeek() {
  const { data, isLoading } = useEvents(UPCOMING_PARAMS)
  const events = useMemo(() => sortByStart(data || []).slice(0, 3), [data])
  if (isLoading) return <EventGridSkeleton count={3} />
  if (events.length === 0) {
    return (
      <p className="border-y border-line py-10 text-center text-fg-muted">
        Nothing scheduled yet. <Link to="/register" className="font-medium text-fg underline decoration-line-strong underline-offset-4 hover:decoration-fg">Host the first session</Link>.
      </p>
    )
  }
  return <EventList events={events} />
}

function Hero() {
  // The notebook lines behind the hero drift slower than the page, for a little depth
  const linesRef = useParallax(-0.12)
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div ref={linesRef} className="ruled absolute -inset-y-24 inset-x-0 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
      </div>
      <FloatingPhotos />

      <div className="page-container relative flex flex-col items-center pb-10 pt-14 text-center sm:pt-20 xl:min-h-[44rem] xl:justify-center xl:pb-24 xl:pt-16">
        <Reveal><HeroPill /></Reveal>
        <Reveal delay={80}>
          <h1 className="mx-auto mt-7 max-w-[15ch] text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.045em] text-fg sm:text-6xl lg:text-[4.6rem] xl:max-w-[12.5ch]">
            Find the people <span className="mark">studying for the same exam</span> as you.
          </h1>
        </Reveal>
        <Reveal delay={160}>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-fg-muted">
            Join a study session, plan it in the group chat, work the hard problems out on a shared whiteboard, and
            stay on task with a focus timer. Free, with no ads and no tracking.
          </p>
        </Reveal>
        <Reveal delay={240} className="mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
          <Button as={Link} to="/register" size="lg">Create a free account</Button>
          <Link to="/events" className="group inline-flex items-center gap-2 text-[0.9375rem] font-medium text-fg">
            Browse sessions
            <FontAwesomeIcon icon={faArrowRight} className="text-xs transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Reveal>
        <Reveal delay={300}>
          <Link to="/focus" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-fg-muted hover:text-fg">
            Or try the focus timer, no account needed
            <FontAwesomeIcon icon={faArrowRight} className="text-[0.65rem]" />
          </Link>
        </Reveal>
        <PhotoStrip />
      </div>
    </section>
  )
}

export default function Landing() {
  return (
    <div className="flex flex-col">
      <Hero />

      <section className="border-t border-line">
        <div className="page-container py-16 sm:py-20">
          <Reveal className="mb-8 flex items-end justify-between gap-6">
            <h2 className="text-3xl tracking-[-0.035em] text-fg sm:text-4xl">
              Coming up <span className="serif text-[1.15em]">this week</span>
            </h2>
            <Link to="/events" className="hidden items-center gap-2 text-sm font-medium text-fg-muted hover:text-fg sm:inline-flex">
              All sessions <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
            </Link>
          </Reveal>
          <Reveal delay={100}><ThisWeek /></Reveal>
        </div>
      </section>

      <section className="border-t border-line bg-surface">
        <div className="page-container grid gap-12 py-16 sm:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <Reveal as="h2" className="text-[2.1rem] leading-[1.08] tracking-[-0.04em] text-fg sm:text-5xl lg:sticky lg:top-28 lg:self-start">
            Studying alone is a habit. Studying <span className="serif text-[1.12em]">together</span> is a strategy.
          </Reveal>
          <ol className="border-t border-line">
            {CHAPTERS.map((chapter, index) => (
              <Reveal as="li" key={chapter.title} delay={index * 60} className="grid grid-cols-[3rem_1fr] gap-x-4 border-b border-line py-7 sm:grid-cols-[4rem_1fr]">
                <span className="font-mono text-sm text-fg-subtle">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-xl tracking-[-0.02em] text-fg">{chapter.title}</h3>
                  <p className="mt-2 max-w-md leading-relaxed text-fg-muted">{chapter.text}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="page-container grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <Reveal>
            <p className="label text-fg-subtle">Try it here</p>
            <h2 className="mt-3 text-[2.1rem] leading-[1.08] tracking-[-0.04em] text-fg sm:text-5xl">
              A whiteboard for the <span className="serif text-[1.12em]">hard part.</span>
            </h2>
            <p className="mt-4 max-w-md leading-relaxed text-fg-muted">
              Every session gets a shared board that updates live for everyone in it. This one is just for you:
              draw something. Nothing here is saved or sent.
            </p>
          </Reveal>
          <Reveal delay={120}><DoodlePad /></Reveal>
        </div>
      </section>

      <MobileTeaser />

      <section className="border-t border-line">
        <Reveal className="page-container flex flex-col items-start gap-8 py-20 sm:py-28 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="max-w-3xl text-[2.4rem] leading-[1.02] tracking-[-0.045em] text-fg sm:text-6xl">
            Your next exam is easier <span className="serif text-[1.12em]">with company.</span>
          </h2>
          <div className="flex shrink-0 flex-col items-start gap-3">
            <Button as={Link} to="/register" size="lg" variant="highlight">
              Start studying together
              <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
            </Button>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="label text-fg-subtle hover:text-fg">
              Open source on GitHub<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
        </Reveal>
      </section>
    </div>
  )
}
