import { Link } from "react-router-dom"

export default function Home() {
  return (
    <div className="px-4 pb-24">
      <section className="container-page mt-8 grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 hero-accent relative overflow-hidden">
          <div className="relative max-w-2xl">
            <span className="badge">PeerPrep</span>
            <h1 className="mt-4 text-4xl md:text-6xl font-extrabold leading-[1.05] tracking-tight">
              Study groups, finally done right.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted">
              Modern. Personalized. Effortless. Organize study groups, schedule sessions, and keep momentum with PeerPrep.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/groups" className="cta">Explore groups</Link>
              <Link to="/events" className="btn-secondary">Browse events</Link>
            </div>
            <div className="mt-10 flex items-center gap-4">
              <img className="h-9 w-9 rounded-full ring-2 ring-white/20" src="https://i.pravatar.cc/72?img=5" alt="" />
              <img className="h-9 w-9 rounded-full ring-2 ring-white/20 -ml-3" src="https://i.pravatar.cc/72?img=11" alt="" />
              <img className="h-9 w-9 rounded-full ring-2 ring-white/20 -ml-3" src="https://i.pravatar.cc/72?img=14" alt="" />
              <span className="text-sm text-muted">Trusted by thousands of students</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 grid grid-cols-1 gap-6">
          <div className="relative aspect-[4/3] overflow-hidden rounded-x bg-paper ring-1 ring-white/10 shadow-2">
            <img
              src="https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?q=80&w=1600&auto=format&fit=crop"
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="relative aspect-[4/5] overflow-hidden rounded-l bg-paper ring-1 ring-white/10 shadow-1">
              <img
                src="https://images.unsplash.com/photo-1523580846011-1b4bd1a4df49?q=80&w=1200&auto=format&fit=crop"
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="relative aspect-[4/5] overflow-hidden rounded-l bg-paper ring-1 ring-white/10 shadow-1">
              <img
                src="https://images.unsplash.com/photo-1544717302-de2939b7ef71?q=80&w=1200&auto=format&fit=crop"
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="container-page mt-16 grid md:grid-cols-3 gap-6">
        <div className="card">
          <div className="text-sm text-muted">Find your crew</div>
          <div className="mt-2 text-2xl font-bold">Smart matching</div>
          <p className="mt-3 text-muted">Match by course, schedule, and learning style to form stronger study groups.</p>
        </div>
        <div className="card">
          <div className="text-sm text-muted">Stay on track</div>
          <div className="mt-2 text-2xl font-bold">Events & reminders</div>
          <p className="mt-3 text-muted">Plan sessions, share notes, and never miss a study slot again.</p>
        </div>
        <div className="card">
          <div className="text-sm text-muted">Feel supported</div>
          <div className="mt-2 text-2xl font-bold">Community-first</div>
          <p className="mt-3 text-muted">Celebrate wins, ask questions, and keep motivation high together.</p>
        </div>
      </section>
    </div>
  )
}
