import { useMemo } from "react"
import { Link } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faArrowRight } from "@fortawesome/free-solid-svg-icons"
import { useEvents } from "../../hooks/useEvents"
import { sortByStart } from "../../utils/dates"
import Button from "../../components/ui/Button"
import EventList, { EventGridSkeleton } from "../events/EventList"
import DoodlePad from "./DoodlePad"

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

function ThisWeek() {
  const { data, isLoading } = useEvents({ status: "upcoming", sort: "soonest", limit: 6 })
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

export default function Landing() {
  return (
    <div className="flex flex-col">
      <section className="page-container grid items-center gap-14 pb-20 pt-14 sm:pt-20 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:pb-28 lg:pt-24">
        <div>
          <h1 className="text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.045em] text-fg sm:text-6xl lg:text-[4.4rem]">
            Find the people <span className="mark">studying for the same exam</span> as you.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-fg-muted">
            PeerPrep is a quiet place to organize study sessions: find one, talk it through in the group chat,
            work the hard problems out together on a shared whiteboard, and stay focused with a built-in timer.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Button as={Link} to="/register" size="lg">Create a free account</Button>
            <Link to="/events" className="group inline-flex items-center gap-2 text-[0.9375rem] font-medium text-fg">
              Browse sessions
              <FontAwesomeIcon icon={faArrowRight} className="text-xs transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link to="/focus" className="group inline-flex items-center gap-2 text-[0.9375rem] font-medium text-fg-muted hover:text-fg">
              Try the focus timer
              <FontAwesomeIcon icon={faArrowRight} className="text-xs transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <p className="label mt-10 text-fg-subtle">Free · No ads · <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:text-fg hover:underline">Open source</a></p>
        </div>
        <DoodlePad />
      </section>

      <section className="border-t border-line">
        <div className="page-container py-16 sm:py-20">
          <div className="mb-8 flex items-end justify-between gap-6">
            <h2 className="text-3xl tracking-[-0.035em] text-fg sm:text-4xl">
              Coming up <span className="serif text-[1.15em]">this week</span>
            </h2>
            <Link to="/events" className="hidden items-center gap-2 text-sm font-medium text-fg-muted hover:text-fg sm:inline-flex">
              All sessions <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
            </Link>
          </div>
          <ThisWeek />
        </div>
      </section>

      <section className="border-t border-line bg-surface">
        <div className="page-container grid gap-12 py-16 sm:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <h2 className="text-[2.1rem] leading-[1.08] tracking-[-0.04em] text-fg sm:text-5xl lg:sticky lg:top-28 lg:self-start">
            Studying alone is a habit. Studying <span className="serif text-[1.12em]">together</span> is a strategy.
          </h2>
          <ol className="border-t border-line">
            {CHAPTERS.map((chapter, index) => (
              <li key={chapter.title} className="grid grid-cols-[3rem_1fr] gap-x-4 border-b border-line py-7 sm:grid-cols-[4rem_1fr]">
                <span className="font-mono text-sm text-fg-subtle">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-xl tracking-[-0.02em] text-fg">{chapter.title}</h3>
                  <p className="mt-2 max-w-md leading-relaxed text-fg-muted">{chapter.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="page-container flex flex-col items-start gap-8 py-20 sm:py-28 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="max-w-3xl text-[2.4rem] leading-[1.02] tracking-[-0.045em] text-fg sm:text-6xl">
            Your next exam is easier <span className="serif text-[1.12em]">with company.</span>
          </h2>
          <Button as={Link} to="/register" size="lg" variant="highlight" className="shrink-0">
            Start studying together
            <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
          </Button>
        </div>
      </section>
    </div>
  )
}
