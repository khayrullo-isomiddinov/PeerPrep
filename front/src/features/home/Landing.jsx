import { useMemo } from "react"
import { Link } from "react-router-dom"
import { sortByStart } from "../../utils/dates"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faArrowRight, faMagnifyingGlass, faComments, faChalkboard, faTrophy, faUserPlus, faUsers, faCalendarDays,
} from "@fortawesome/free-solid-svg-icons"
import { useEvents } from "../../hooks/useEvents"
import Button from "../../components/ui/Button"
import Badge from "../../components/ui/Badge"
import { Skeleton } from "../../components/ui/Feedback"
import SessionRow from "../events/SessionRow"

const FEATURES = [
  {
    icon: faMagnifyingGlass,
    title: "Find your people",
    text: "Search sessions by topic, exam or place. Join with one tap, or host your own in under a minute.",
  },
  {
    icon: faComments,
    title: "Plan in the group chat",
    text: "Every session gets a live chat with typing indicators and read receipts, so nobody shows up unprepared.",
  },
  {
    icon: faChalkboard,
    title: "Think on a shared whiteboard",
    text: "Sketch diagrams, work problems and drop sticky notes together in real time. Export it as an image afterwards.",
  },
  {
    icon: faTrophy,
    title: "Build a habit",
    text: "Earn XP for every session you attend, keep a weekly streak and level up from Beginner to Master.",
  },
]

const STEPS = [
  { icon: faUserPlus, title: "Create a free account", text: "Just an email and a password." },
  { icon: faUsers, title: "Join or host a session", text: "Pick an exam, a time and a place, online or in person." },
  { icon: faCalendarDays, title: "Prepare together", text: "Chat beforehand, then work it out on the whiteboard." },
]

// A window-style frame around real upcoming sessions from the API
function LivePreview() {
  const { data, isLoading } = useEvents({ status: "upcoming", limit: 20 })
  const events = useMemo(() => sortByStart(data || []).slice(0, 4), [data])
  return (
    <div className="relative rounded-2xl border border-line bg-surface shadow-overlay">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="size-2.5 rounded-full bg-danger/60" aria-hidden />
        <span className="size-2.5 rounded-full bg-warning/60" aria-hidden />
        <span className="size-2.5 rounded-full bg-success/60" aria-hidden />
        <span className="ml-2 text-xs font-semibold text-fg-subtle">Upcoming sessions</span>
        <Badge tone="success" dot className="ml-auto">Live data</Badge>
      </div>
      <div className="p-2">
        {isLoading ? (
          <div className="space-y-2 p-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : events.length > 0 ? (
          events.map((event) => <SessionRow key={event.id} event={event} />)
        ) : (
          <p className="px-4 py-10 text-center text-sm text-fg-muted">
            No sessions are scheduled yet. Yours could be the first.
          </p>
        )}
      </div>
    </div>
  )
}

export default function Landing() {
  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" aria-hidden />
        <div className="absolute inset-0" style={{ background: "var(--hero-glow)" }} aria-hidden />
        <div className="page-container relative grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:py-28">
          <div>
            <Badge tone="accent">Free & open source · Built by students</Badge>
            <h1 className="mt-5 text-[2.5rem] font-bold leading-[1.05] text-fg sm:text-6xl lg:text-[4.25rem]">
              Find your study group. <span className="text-gradient">Prep together.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-fg-muted">
              PeerPrep connects students preparing for the same exams. Join a session, plan it in the group chat
              and work through problems on a shared whiteboard.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button as={Link} to="/register" size="lg">
                Get started free
                <FontAwesomeIcon icon={faArrowRight} />
              </Button>
              <Button as={Link} to="/events" variant="secondary" size="lg">Browse sessions</Button>
            </div>
          </div>
          <LivePreview />
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="page-container py-16 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-accent-text">Everything a study group needs</p>
            <h2 className="mt-3 text-3xl font-bold text-fg sm:text-4xl">From “anyone studying for this?” to exam day.</h2>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="bg-surface p-6 sm:p-8">
                <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent-text">
                  <FontAwesomeIcon icon={feature.icon} />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-fg">{feature.title}</h3>
                <p className="mt-2 text-fg-muted">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="page-container py-16 sm:py-24">
        <h2 className="text-3xl font-bold text-fg sm:text-4xl">How it works</h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="relative rounded-2xl border border-line bg-surface p-6">
              <span className="font-display text-5xl font-bold text-surface-3" aria-hidden>{index + 1}</span>
              <div className="mt-2 flex items-center gap-2.5">
                <FontAwesomeIcon icon={step.icon} className="text-accent-text" />
                <h3 className="text-lg font-semibold text-fg">{step.title}</h3>
              </div>
              <p className="mt-2 text-fg-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="page-container pb-16 sm:pb-24">
        <div className="relative overflow-hidden rounded-3xl px-6 py-12 text-center text-white sm:px-12 sm:py-16" style={{ background: "var(--brand-gradient)" }}>
          <div className="absolute inset-0 bg-grid opacity-50 [--grid-line:rgb(255_255_255/0.08)]" aria-hidden />
          <div className="relative">
            <h2 className="text-3xl font-bold sm:text-4xl">Your next exam is easier with company.</h2>
            <p className="mx-auto mt-3 max-w-lg text-white/85">Create an account in seconds and join your first session today.</p>
            <Button as={Link} to="/register" size="lg" variant="inverse" className="mt-8">
              Create your free account
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
