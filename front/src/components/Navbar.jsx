import { Link, NavLink, useLocation, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { useAuth } from "../features/auth/AuthContext"

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { isAuthenticated, user, logout } = useAuth()
  const loc = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    setMenuOpen(false)
  }, [loc.pathname])

  const linkClass = ({ isActive }) =>
    `px-3 py-2 text-sm font-medium ${isActive ? "text-[--brand]" : "opacity-80 hover:opacity-100"}`

  function handleLogout() {
    logout()
    setMenuOpen(false)
    navigate("/", { replace: true })
  }

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-[1000]">
        <div className="w-full border-b border-white/10 bg-[#0f1420]/70 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 h-12">
            <div className="h-full flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  className="lg:hidden inline-flex h-8 w-8 items-center justify-center rounded-md ring-1 ring-white/10 bg-white/5"
                  onClick={() => setOpen(true)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z"/></svg>
                </button>

                <Link to="/" className="font-extrabold text-base leading-none flex items-center gap-2">
                  <span className="inline-block h-5 w-5 rounded-md" style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-soft))" }} />
                  StudyHub
                </Link>

                <ul className="hidden lg:flex items-center gap-2 ml-4">
                  <li><NavLink to="/groups" className={linkClass}>Groups</NavLink></li>
                  <li><NavLink to="/events" className={linkClass}>Events</NavLink></li>
                </ul>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-2">
                  <div className="rounded-full ring-1 ring-white/10 bg-white/5 px-3 py-1.5">
                    <input type="text" placeholder="Search…" className="bg-transparent outline-none w-48 md:w-60 text-sm placeholder:text-white/50" />
                  </div>
                </div>

                {!isAuthenticated ? (
                  <>
                    <Link to="/register" className="rounded-full px-4 py-1.5 text-sm font-semibold text-black bg-[rgb(129,236,178)] hover:opacity-90 transition">Sign Up</Link>
                    <Link to="/login" className="rounded-full px-4 py-1.5 text-sm font-semibold ring-1 ring-white/10 bg-white/5 hover:bg-white/10 transition">Login</Link>
                  </>
                ) : (
                  <div className="relative">
                    <button
                      className="rounded-full ring-1 ring-white/10 bg-white/5 hover:bg-white/10 transition flex items-center gap-2 px-2 py-1.5"
                      onClick={() => setMenuOpen(v => !v)}
                      aria-haspopup="menu"
                      aria-expanded={menuOpen ? "true" : "false"}
                    >
                      <img
                        src={`https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(user?.email || "user")}`}
                        alt="Profile"
                        className="h-8 w-8 rounded-full ring-1 ring-white/10 object-cover"
                      />
                      <span className="hidden sm:inline text-sm opacity-80">{user?.email}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" className="opacity-70">
                        <path fill="currentColor" d="M7 10l5 5 5-5z" />
                      </svg>
                    </button>

                    {menuOpen && (
                      <div className="dropdown-surface p-2 mt-2 right-0 absolute">
                        <Link className="nav-link block px-3 py-2 hover:opacity-100" to="/profile" onClick={() => setMenuOpen(false)}>Profile</Link>
                        <button className="nav-link block w-full text-left px-3 py-2 hover:opacity-100" onClick={handleLogout}>Logout</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {open && (
        <div className="lg:hidden fixed inset-0 z:[1200]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-80 bg-[#141a2a] shadow-xl p-6 flex flex-col gap-4">
            <NavLink to="/groups" className="py-2" onClick={() => setOpen(false)}>Groups</NavLink>
            <NavLink to="/events" className="py-2" onClick={() => setOpen(false)}>Events</NavLink>
            {isAuthenticated ? (
              <>
                <NavLink to="/profile" className="py-2" onClick={() => setOpen(false)}>Profile</NavLink>
                <button className="py-2 text-left opacity-80 hover:opacity-100" onClick={() => { handleLogout(); setOpen(false) }}>Logout</button>
              </>
            ) : (
              <>
                <div className="h-px bg-white/10 my-2" />
                <Link to="/register" className="rounded-full px-4 py-2 text-sm font-semibold text-black bg-[rgb(129,236,178)]" onClick={() => setOpen(false)}>Sign Up</Link>
                <Link to="/login" className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-white/10 bg-white/5" onClick={() => setOpen(false)}>Login</Link>
              </>
            )}
          </div>
        </div>
      )}
      <div className="h-12" />
    </>
  )
}
