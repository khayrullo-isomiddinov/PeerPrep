import { Link } from "react-router-dom"
import Button from "../components/Button"
import Card from "../components/Card"

export default function Home() {
  return (
    <div className="space-y-28">
      {/* ====== HERO: Split, layered, and not a boring rectangle ====== */}
      <section
        className="relative overflow-hidden rounded-[2rem]
                   bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500
                   dark:from-indigo-900 dark:via-purple-950 dark:to-pink-950
                   animate-gradient shadow-xl"
        style={{ animationDuration: "20s" }}
      >
        {/* bg photo texture (subtle) */}
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center opacity-15 dark:opacity-10"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1583321500900-82807e458f3c?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0')",
          }}
        />

        {/* parallax glow blobs */}
        <div
          data-parallax="0.10"
          className="absolute -top-24 -left-24 w-80 h-80 rounded-full
                     bg-indigo-300/40 blur-3xl dark:bg-indigo-500/20 animate-float"
          style={{ animationDuration: "8s" }}
        />
        <div
          data-parallax="0.22"
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full
                     bg-pink-300/40 blur-3xl dark:bg-pink-500/20 animate-float"
          style={{ animationDuration: "8s" }}
        />

        {/* angled ribbon overlay */}
        <div
          className="pointer-events-none absolute -top-10 right-[-20%] h-[160%] w-[60%]
                     bg-white/10 dark:bg-white/5 rotate-[18deg] blur-2xl"
        />

        <div className="relative z-10 grid md:grid-cols-[1.1fr,0.9fr] gap-10 p-8 sm:p-12">
          {/* Left: bold non-linear headline */}
          <div className="flex flex-col justify-center">
            <h1 className="text-5xl sm:text-6xl font-extrabold leading-[1.05] text-white
                           drop-shadow-[0_6px_18px_rgba(0,0,0,0.6)]">
              Meet your next{" "}
              <span
                className="inline-block bg-gradient-to-r from-indigo-200 to-purple-200
                           bg-clip-text text-transparent
                           drop-shadow-[0_2px_8px_rgba(99,102,241,0.55)]"
              >
                Peer
              </span>
              , prep for what{" "}
              <span
                className="inline-block bg-gradient-to-r from-yellow-300 to-orange-500
                           bg-clip-text text-transparent
                           drop-shadow-[0_2px_8px_rgba(234,179,8,0.55)]"
              >
                Prep
              </span>{" "}
              prepares you.
            </h1>

            <p className="mt-5 max-w-2xl text-white/90 text-lg leading-relaxed">
              Not a marketplace. A momentum engine for learners. Groups, events, and AI nudges that
              move you from “I should” to “I did”.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/groups">
                <Button className="shadow-md">Explore Groups</Button>
              </Link>
              <Link to="/events">
                <Button variant="secondary" className="backdrop-blur-md">
                  See Events
                </Button>
              </Link>
            </div>

            {/* micro stats strip */}
            <div className="mt-8 grid grid-cols-3 gap-4 text-left">
              {[
                ["4.9★", "avg session rating"],
                ["12k+", "members joined"],
                ["2.3x", "faster exam prep"],
              ].map(([num, label]) => (
                <div
                  key={label}
                  className="rounded-xl bg-white/10 dark:bg-white/5 p-4 text-white/90"
                >
                  <div className="text-2xl font-extrabold">{num}</div>
                  <div className="text-sm opacity-80">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: staggered preview cards with adaptive text */}
          <div className="relative mx-auto grid w-full max-w-md gap-5">
            <div className="translate-x-6">
              <Card>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/20 dark:bg-white/10" />
                  <div>
                    <h3 className="font-semibold text-[--color-text-light] dark:text-[--color-text-dark]">
                      Algorithms Workshop
                    </h3>
                    <p className="text-sm text-[--color-text-light]/80 dark:text-[--color-text-dark]/80">
                      Sat · 10:00 · CS Lab 2
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="-translate-x-2">
              <Card>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/20 dark:bg-white/10" />
                  <div>
                    <h3 className="font-semibold text-[--color-text-light] dark:text-[--color-text-dark]">
                      React Study Sprint
                    </h3>
                    <p className="text-sm text-[--color-text-light]/80 dark:text-[--color-text-dark]/80">
                      Today · 18:00 · Library B
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="translate-x-10">
              <Card>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/20 dark:bg-white/10" />
                  <div>
                    <h3 className="font-semibold text-[--color-text-light] dark:text-[--color-text-dark]">
                      Discrete Math Circle
                    </h3>
                    <p className="text-sm text-[--color-text-light]/80 dark:text-[--color-text-dark]/80">
                      Sun · 14:30 · Room 204
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* ====== MARQUEE / TICKER ====== */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-slate-200/60 dark:ring-slate-700/60" />
        <div className="overflow-hidden rounded-3xl bg-[--color-card-light] dark:bg-[--color-card-dark]">
          <div className="flex items-center gap-8 py-4 animate-[marq_22s_linear_infinite]">
            {[
              "AI suggestions",
              "Peer matching",
              "Exam sprints",
              "Local meetups",
              "Pomodoro rooms",
              "Instant RSVP",
            ].map((t, i) => (
              <span
                key={i}
                className="text-sm tracking-wide uppercase opacity-70 mx-4 whitespace-nowrap"
              >
                • {t} •
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ====== MOSAIC DISCOVERY ====== */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-7 space-y-6">
            <Card>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Hot this week</h3>
                <Link to="/events" className="text-sm opacity-70 hover:opacity-100">
                  See all →
                </Link>
              </div>
              <div className="mt-4 grid sm:grid-cols-2 gap-4">
                {[
                  ["Midterm Review • Calculus", "Thu · 17:00 · East Hall"],
                  ["Greedy vs DP Lab", "Fri · 10:00 · CS Lab 3"],
                  ["Databases Crash Course", "Fri · 16:30 · Online"],
                  ["Systems Roundtable", "Sat · 12:00 · Room 301"],
                ].map(([title, meta]) => (
                  <div
                    key={title}
                    className="rounded-xl p-4 ring-1 ring-slate-200 dark:ring-slate-700
                               hover:-translate-y-0.5 hover:shadow-md transition"
                  >
                    <div className="font-semibold">{title}</div>
                    <div className="text-sm opacity-70 mt-1">{meta}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Top groups to join</h3>
                <Link to="/groups" className="text-sm opacity-70 hover:opacity-100">
                  Browse groups →
                </Link>
              </div>
              <div className="mt-4 grid sm:grid-cols-3 gap-4">
                {["Algo Masters", "React Learners", "BioStats Crew"].map((g) => (
                  <div
                    key={g}
                    className="rounded-xl p-4 ring-1 ring-slate-200 dark:ring-slate-700
                               hover:-translate-y-0.5 hover:shadow-md transition"
                  >
                    <div className="font-semibold">{g}</div>
                    <div className="text-sm opacity-70 mt-1">active now</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Tall right rail with a sticky CTA panel */}
          <div className="col-span-12 lg:col-span-5 space-y-6">
            <Card>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Next up near you</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700
                                 dark:bg-indigo-900/40 dark:text-indigo-300 ring-1 ring-inset
                                 ring-indigo-200 dark:ring-indigo-800">
                  Budapest
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  ["Late-Night Leetcode", "Today · 21:00 · Online"],
                  ["Microservices 101", "Wed · 18:30 · BME Q"],
                  ["Chemistry Lab Prep", "Thu · 08:30 · Library A"],
                ].map(([t, m]) => (
                  <div
                    key={t}
                    className="rounded-xl p-4 ring-1 ring-slate-200 dark:ring-slate-700
                               hover:-translate-y-0.5 hover:shadow-md transition"
                  >
                    <div className="font-semibold">{t}</div>
                    <div className="text-sm opacity-70 mt-1">{m}</div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="sticky top-24">
              <Card>
                <h3 className="text-xl font-semibold">Host something small</h3>
                <p className="mt-2 opacity-80">
                  45 minutes. 5 people. One topic. That’s all you need to kick off momentum.
                </p>
                <div className="mt-4 flex gap-3">
                  <Link to="/events">
                    <Button>Create Event</Button>
                  </Link>
                  <Link to="/groups">
                    <Button variant="secondary">Start a Group</Button>
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* ====== FLOATING DOCK CTA ====== */}
      <div className="sticky bottom-6 z-20">
        <div className="mx-auto max-w-3xl">
          <div
            className="rounded-2xl backdrop-blur bg-white/70 dark:bg-slate-900/70
                       ring-1 ring-slate-200 dark:ring-slate-700
                       shadow-[0_6px_30px_rgba(0,0,0,0.08)]
                       px-4 py-3 flex items-center justify-between"
          >
            <div className="text-sm sm:text-base">
              <span className="font-semibold">Ready when you are.</span>{" "}
              Join a group now or put a 30-min session on the calendar.
            </div>
            <div className="flex gap-2">
              <Link to="/groups">
                <Button className="px-4 py-2">Find a Group</Button>
              </Link>
              <Link to="/events">
                <Button variant="secondary" className="px-4 py-2">
                  Plan 30-min
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* local marquee keyframes */}
      <style>{`
        @keyframes marq { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      `}</style>
    </div>
  )
}
