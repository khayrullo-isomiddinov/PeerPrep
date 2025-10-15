import { Link } from "react-router-dom"
import { useAuth } from "../features/auth/AuthContext"

export default function Home() {
  const { isAuthenticated, user, logout } = useAuth()

  return (
    <div className="min-h-screen tap-safe premium-scrollbar flex flex-col">
      <div className="nav-spacer" />
      <section className="container-page flex-1 grid place-items-center">
        <div className="relative w-full">
          <div className="absolute inset-0 -z-10">
            <div data-parallax="0.06" className="absolute -top-24 -left-16 w-72 h-72 rounded-full bg-white/6 blur-3xl animate-float" />
            <div data-parallax="0.12" className="absolute -bottom-24 -right-10 w-96 h-96 rounded-full bg-white/6 blur-3xl animate-float" style={{ animationDuration: "9s" }} />
          </div>

          <div className="grid lg:grid-cols-12 gap-12 items-center min-h-[calc(100vh-220px)]">
            <div className="lg:col-span-6 order-2 lg:order-1 hero-accent premium-scale-in">
              <span className="badge">PeerPrep</span>
              <h1 className="mt-4 leading-[1.02] tracking-tight premium-heading text-5xl md:text-6xl">Study groups, finally done right.</h1>
              <p className="mt-6 text-lg md:text-xl text-muted max-w-xl">Modern, personalized, effortless. Organize study groups, schedule sessions, and keep momentum.</p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/groups" className="cta">Explore groups</Link>
                <Link to="/events" className="btn-secondary">Browse events</Link>
                {isAuthenticated ? (
                  <>
                    <span className="ml-2 text-sm opacity-80">Signed in as {user?.email}</span>
                    <button onClick={logout} className="btn-secondary">Logout</button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="btn">Login</Link>
                    <Link to="/register" className="btn-secondary">Register</Link>
                  </>
                )}
              </div>
              <div className="mt-8 flex flex-wrap gap-2">
                <span className="badge">Workshops</span>
                <span className="badge">Exam Prep</span>
                <span className="badge">Accountability</span>
                <span className="badge">Budapest</span>
              </div>
            </div>
                <div className="lg:col-span-6 order-1 lg:order-2">
  <div className="relative w-full max-w-[38rem] mx-auto aspect-square premium-fade-in">
    <div className="absolute inset-0 rounded-full premium-glass shadow-3 blur-aura" />
    <div className="absolute inset-8 rounded-full bg-paper shadow-2 outline outline-1 outline-white/10" />

    {/* CENTER */}
    <div className="absolute inset-0 grid place-items-center">
      <div className="w-44 h-44 rounded-full premium-card grid place-items-center animate-float" style={{ animationDuration: "7s" }}>
        <div className="text-center">
          <div className="text-3xl font-extrabold">Next up</div>
          <div className="text-sm text-muted mt-1">Pick your focus</div>
        </div>
      </div>
    </div>

    {/* FLOATING ORBIT BUTTONS – Clean, no images */}
    <Link to="/events" className="absolute -top-4 left-1/2 -translate-x-1/2 w-28 h-28 rounded-full cta grid place-items-center text-center shadow-2 reveal-up">
      <div className="text-sm font-bold leading-tight">Events</div>
    </Link>

    <Link to="/groups" className="absolute top-1/3 -left-4 w-28 h-28 rounded-full premium-card premium-hover grid place-items-center text-center reveal-up" style={{ animationDelay: ".06s" }}>
      <div className="text-sm font-semibold leading-tight">Groups</div>
    </Link>

    <Link to="/events" className="absolute bottom-6 left-8 w-24 h-24 rounded-full premium-card premium-hover grid place-items-center text-center reveal-up" style={{ animationDelay: ".12s" }}>
      <div className="text-xs font-semibold">Create</div>
    </Link>

    <div className="absolute top-8 right-6 w-24 h-24 rounded-full premium-card grid place-items-center text-center reveal-up" style={{ animationDelay: ".18s" }}>
      <div>
        <div className="text-xl font-extrabold">4.9</div>
        <div className="text-[11px] text-muted -mt-1">Rating</div>
      </div>
    </div>

    <div className="absolute bottom-8 right-2 w-28 h-28 rounded-full premium-card grid place-items-center text-center reveal-up" style={{ animationDelay: ".24s" }}>
      <div>
        <div className="text-xl font-extrabold">100+</div>
        <div className="text-[11px] text-muted -mt-1">Groups</div>
      </div>
    </div>

  </div>
</div>

          </div>
        </div>
      </section>

      <section className="container-page section">
        <div className="rounded-pill premium-glass p-3 shadow-2 premium-fade-in">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/events" className="pill cta">New Event</Link>
            <Link to="/groups" className="pill btn-secondary">Create Group</Link>
            <Link to="/events" className="pill btn-secondary">This Week</Link>
            <Link to="/groups" className="pill btn-secondary">Nearby</Link>
            <Link to="/events" className="pill btn-secondary">Top Rated</Link>
          </div>
        </div>
      </section>

      <section className="container-page section">
        <div className="grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7">
            <div className="grid grid-cols-3 gap-4">
              <img data-parallax="0.06" src="https://images.unsplash.com/photo-1523580846011-23a0495f3c17?q=80&w=1200&auto=format&fit=crop" alt="" className="rounded-l premium-loading object-cover h-56 w-full reveal-up" />
              <img data-parallax="0.1" src="https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?q=80&w=1200&auto=format&fit=crop" alt="" className="rounded-l premium-loading object-cover h-44 w-full reveal-up" style={{ animationDelay: ".06s" }} />
              <img data-parallax="0.08" src="https://images.unsplash.com/photo-1558021211-6d1403321394?q=80&w=1200&auto=format&fit=crop" alt="" className="rounded-l premium-loading object-cover h-36 w-full reveal-up" style={{ animationDelay: ".12s" }} />
              <img data-parallax="0.12" src="https://images.unsplash.com/photo-1513258496099-48168024aec0?q=80&w=1200&auto=format&fit=crop" alt="" className="rounded-l premium-loading object-cover h-52 w-full reveal-up" style={{ animationDelay: ".18s" }} />
              <img data-parallax="0.14" src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=1200&auto=format&fit=crop" alt="" className="rounded-l premium-loading object-cover h-40 w-full reveal-up" style={{ animationDelay: ".24s" }} />
              <img data-parallax="0.16" src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1200&auto=format&fit=crop" alt="" className="rounded-l premium-loading object-cover h-48 w-full reveal-up" style={{ animationDelay: ".3s" }} />
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="surface inset-pad rounded-x premium-scale-in">
              <h2 className="text-2xl font-bold">Find your people</h2>
              <p className="text-muted mt-2">Join active groups, meet new peers, and keep showing up. Your next breakthrough is one focused session away.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/groups" className="btn">Browse groups</Link>
                <Link to="/events" className="btn-secondary">Upcoming events</Link>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="premium-card premium-hover text-center rounded-l">
                  <div className="text-3xl font-extrabold">12</div>
                  <div className="text-muted text-sm">Today</div>
                </div>
                <div className="premium-card premium-hover text-center rounded-l">
                  <div className="text-3xl font-extrabold">47</div>
                  <div className="text-muted text-sm">This week</div>
                </div>
                <div className="premium-card premium-hover text-center rounded-l">
                  <div className="text-3xl font-extrabold">350+</div>
                  <div className="text-muted text-sm">All time</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
