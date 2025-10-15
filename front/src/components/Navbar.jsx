import { Link, NavLink, useLocation, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { useAuth } from "../features/auth/AuthContext"

export default function Navbar() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { isAuthenticated, user, logout } = useAuth()
  const loc = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    setMenuOpen(false)
    setDrawerOpen(false)
  }, [loc.pathname])

  function handleLogout() {
    logout()
    setMenuOpen(false)
    navigate("/", { replace: true })
  }

  const linkClass = ({ isActive }) =>
    `nav-link ${isActive ? "is-active" : ""}`

  return (
    <>
      <nav className="nav-root z-nav">
        <div className="nav-shell">
          <div className="nav-bar">
            <div className="nav-aura" />
            <div className="brand">
              <button
                className="lg:hidden btn-secondary px-2 py-2"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
              >
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z"/></svg>
              </button>
              <Link to="/" className="inline-flex items-center gap-2">
                <span className="brand-mark" />
                PeerPrep
              </Link>
              <ul className="nav-links ml-2">
                <li><NavLink to="/groups" className={linkClass}>Groups</NavLink></li>
                <li><NavLink to="/events" className={linkClass}>Events</NavLink></li>
              </ul>
            </div>

            <div className="nav-right">
              <div className="hidden md:block">
                <div className="search-pill">
                  <svg className="w-4 h-4 opacity-70" viewBox="0 0 24 24" fill="none">
                    <path d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <input placeholder="Search…" />
                </div>
              </div>

              {!isAuthenticated ? (
                <>
                  <Link to="/register" className="btn">Sign Up</Link>
                  <Link to="/login" className="btn-secondary">Login</Link>
                </>
              ) : (
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(v => !v)}
                    className="lang-button"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen ? "true" : "false"}
                  >
                    <img
                      src={`https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(user?.email || "user")}`}
                      alt="Profile"
                      className="nav-avatar"
                    />
                    <span className="hidden sm:inline">{user?.email}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" className="opacity-70">
                      <path fill="currentColor" d="M7 10l5 5 5-5z" />
                    </svg>
                  </button>

                  {menuOpen && (
                    <div className="lang-menu p-2">
                      <Link to="/profile" className="block px-3 py-2 nav-link" onClick={() => setMenuOpen(false)}>Profile</Link>
                      <button className="block w-full text-left px-3 py-2 nav-link" onClick={handleLogout}>Logout</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="nav-spacer" />

      {drawerOpen && (
        <div className="fixed inset-0 z-above-nav">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-80 surface inset-pad shadow-2">
            <div className="flex items-center justify-between mb-4">
              <div className="brand">
                <span className="brand-mark" />
                Menu
              </div>
              <button className="btn-secondary px-3 py-1.5" onClick={() => setDrawerOpen(false)}>Close</button>
            </div>
            <div className="grid gap-2">
              <NavLink to="/groups" className={linkClass} onClick={() => setDrawerOpen(false)}>Groups</NavLink>
              <NavLink to="/events" className={linkClass} onClick={() => setDrawerOpen(false)}>Events</NavLink>
              {!isAuthenticated ? (
                <>
                  <Link to="/register" className="btn" onClick={() => setDrawerOpen(false)}>Sign Up</Link>
                  <Link to="/login" className="btn-secondary" onClick={() => setDrawerOpen(false)}>Login</Link>
                </>
              ) : (
                <>
                  <Link to="/profile" className="nav-link" onClick={() => setDrawerOpen(false)}>Profile</Link>
                  <button className="nav-link text-left" onClick={() => { handleLogout(); setDrawerOpen(false) }}>Logout</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
