import { Link } from "react-router-dom"
import { useAuth } from "../features/auth/AuthContext"

export default function Home() {
  const { isAuthenticated, user, logout } = useAuth()

  return (
    <div className="px-4 pb-24">
      <section className="container-page mt-8 grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 relative rounded-xl p-8 shadow-2 ring-1 ring-black/10 dark:ring-white/10 overflow-hidden">
          <span className="badge">PeerPrep</span>
          <h1 className="mt-4 text-4xl md:text-6xl font-extrabold leading-[1.05] tracking-tight">
            Study groups, finally done right.
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted">
            Modern. Personalized. Effortless. Organize study groups, schedule sessions, and keep momentum with PeerPrep.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link to="/groups" className="btn btn-primary">Explore groups</Link>
            <Link to="/events" className="btn btn-outline">Browse events</Link>
            {isAuthenticated ? (
              <>
                <span className="ml-2 text-sm opacity-80">Signed in as {user?.email}</span>
                <button onClick={logout} className="btn btn-ghost">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-accent">Login</Link>
                <Link to="/register" className="btn btn-ghost">Register</Link>
              </>
            )}
          </div>
        </div>
        <div className="lg:col-span-5">
          <div className="rounded-xl border p-6 h-full flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="text-2xl font-semibold">Next up</div>
              <div className="text-sm opacity-80">Join or create a session and crush your goals.</div>
              <div className="mt-4 flex justify-center gap-3">
                <Link to="/events" className="btn btn-primary btn-sm">Events</Link>
                <Link to="/groups" className="btn btn-outline btn-sm">Groups</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
