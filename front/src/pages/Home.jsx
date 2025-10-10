import { Link } from "react-router-dom"
import { useAuth } from "../features/auth/AuthContext"

export default function Home() {
  const { isAuthenticated, user, logout } = useAuth()

  return (
    <div className="px-4 pb-24">
      <section className="container-page mt-10 grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 relative hero-accent">
          <span className="badge">PeerPrep</span>
          <h1 className="mt-4 leading-[1.05] tracking-tight">
            Study groups, finally done right.
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted">
            Modern. Personalized. Effortless. Organize study groups, schedule sessions, and keep momentum with PeerPrep.
          </p>
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
        </div>
        <div className="lg:col-span-5">
          <div className="card h-full flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="text-2xl font-semibold">Next up</div>
              <div className="text-sm opacity-80">Join or create a session and crush your goals.</div>
              <div className="mt-4 flex justify-center gap-3">
                <Link to="/events" className="btn">Events</Link>
                <Link to="/groups" className="btn-secondary">Groups</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
