import { Link, NavLink, useLocation, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { useAuth } from "../features/auth/AuthContext"
import { useRef } from "react"

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { isAuthenticated, user, logout, setUser } = useAuth()
  const loc = useLocation()
  const navigate = useNavigate()
  const fileRef = useRef(null)

  useEffect(() => {
    setMenuOpen(false)
  }, [loc.pathname])

  function handleLogout() {
    logout()
    setMenuOpen(false)
    navigate("/", { replace: true })
  }

  function onPickPhoto() {
    try { fileRef.current?.click() } catch {}
  }

  function onPhotoSelected(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const photoUrl = String(reader.result || "")
      const updated = { ...(user || {}), photoUrl }
      try { localStorage.setItem("user", JSON.stringify(updated)) } catch {}
      setUser?.(updated)
      setMenuOpen(false)
    }
    reader.readAsDataURL(file)
  }

  return (
    <>
      <nav className="nav-root z-nav nav-clean">
        <div className="nav-shell">
          <div className="nav-bar nav-clean-bar">
            <div className="inline-flex items-center gap-5">
              <Link to="/" className="brand-new">
                <svg className="brand-ticket" viewBox="0 0 64 48" aria-hidden>
                  <defs>
                    <linearGradient id="pinkGrad" x1="0" x2="1">
                      <stop offset="0%" stopColor="#fda4af"/>
                      <stop offset="100%" stopColor="#ec4899"/>
                    </linearGradient>
                  </defs>
                  <path fill="url(#pinkGrad)" d="M8 10c0-2.2 1.8-4 4-4h36c1.1 0 2 .9 2 2v4a4 4 0 1 0 0 8v8a4 4 0 1 0 0 8v4c0 1.1-.9 2-2 2H12c-2.2 0-4-1.8-4-4V10z"/>
                  <path fill="#fff" opacity=".25" d="M22 10h2v28h-2zM30 10h2v28h-2zM38 10h2v28h-2z"/>
                </svg>
                <span className="brand-text">
                  <span className="text-neutral-800">Peer</span>
                  <span className="text-pink-600">Prep</span>
                </span>
              </Link>
              {!isAuthenticated && (
                <div className="nav-pages">
                  <NavLink to="/groups" className={({isActive}) => `nav-link-clean ${isActive ? 'is-active' : ''}`}>Groups</NavLink>
                  <NavLink to="/events" className={({isActive}) => `nav-link-clean ${isActive ? 'is-active' : ''}`}>Events</NavLink>
                </div>
              )}
            </div>

            {isAuthenticated && (
              <ul className="nav-tabs">
                <li><NavLink to="/" end className={({isActive}) => `tab-link ${isActive ? 'is-active' : ''}`}>Explore</NavLink></li>
                <li><NavLink to="/groups" className={({isActive}) => `tab-link ${isActive ? 'is-active' : ''}`}>Groups</NavLink></li>
                <li><NavLink to="/events" className={({isActive}) => `tab-link ${isActive ? 'is-active' : ''}`}>Upcoming Events</NavLink></li>
              </ul>
            )}

            <div className="nav-right gap-2">
              {!isAuthenticated ? (
                <>
                  <Link to="/login" className="btn-ghost-pink">Log in</Link>
                  <Link to="/register" className="btn-pink">Sign up</Link>
                </>
              ) : (
                <div className="relative inline-flex items-center gap-2">
                  <Link 
                    to="/events/create" 
                    className="nav-bell hover:bg-pink-50 hover:border-pink-200 transition-colors"
                    aria-label="Create Event"
                    title="Create Event"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" className="text-pink-600">
                      <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                  </Link>
                  <button className="nav-bell" aria-label="Notifications">
                    <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2zm6-6V11a6 6 0 1 0-12 0v5l-2 2v1h16v-1l-2-2z"/></svg>
                  </button>
                  <button
                    onClick={() => setMenuOpen(v => !v)}
                    className="auth-chip"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen ? "true" : "false"}
                  >
                    <img
                      src={user?.photoUrl || user?.avatarUrl || `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(user?.email || "user")}`}
                      alt="Profile"
                      className="nav-avatar"
                    />
                    <span className="hidden sm:inline text-neutral-700">{user?.name || user?.email}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" className="opacity-60">
                      <path fill="currentColor" d="M7 10l5 5 5-5z" />
                    </svg>
                  </button>

                  {menuOpen && (
                    <div className="lang-menu p-2">
                      <button className="block w-full text-left px-3 py-2 nav-link" onClick={onPickPhoto}>Change Photo</button>
                      <Link to="/profile" className="block px-3 py-2 nav-link" onClick={() => setMenuOpen(false)}>Profile</Link>
                      <button className="block w-full text-left px-3 py-2 nav-link" onClick={handleLogout}>Logout</button>
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhotoSelected} />
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="nav-spacer" />
    </>
  )
}
