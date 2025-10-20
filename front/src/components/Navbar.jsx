import { Link, NavLink, useLocation, useNavigate } from "react-router-dom"
import { useEffect, useState, useRef } from "react"
import { useAuth } from "../features/auth/AuthContext"

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const { isAuthenticated, user, logout, isLoading } = useAuth()
  const loc = useLocation()
  const navigate = useNavigate()
  const createMenuRef = useRef(null)

  useEffect(() => {
    setMenuOpen(false)
    setCreateMenuOpen(false)
  }, [loc.pathname])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (createMenuRef.current && !createMenuRef.current.contains(event.target)) {
        setCreateMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  function handleLogout() {
    logout()
    setMenuOpen(false)
    navigate("/", { replace: true })
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
                  {/* Create Dropdown */}
                  <div className="relative" ref={createMenuRef}>
                    <button
                      onClick={() => setCreateMenuOpen(v => !v)}
                      className="nav-bell hover:bg-pink-50 hover:border-pink-200 transition-colors"
                      aria-label="Create"
                      title="Create Event or Group"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" className="text-pink-600">
                        <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                      </svg>
                    </button>

                    {createMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-dropdown">
                        <Link 
                          to="/events/create" 
                          className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-pink-50 transition-colors"
                          onClick={() => setCreateMenuOpen(false)}
                        >
                          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                            <svg width="16" height="16" viewBox="0 0 24 24" className="text-purple-600">
                              <path fill="currentColor" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                          </div>
                          <div>
                            <div className="font-medium">Create Event</div>
                            <div className="text-sm text-gray-500">Schedule a study session</div>
                          </div>
                        </Link>
                        <Link 
                          to="/groups/create" 
                          className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-pink-50 transition-colors"
                          onClick={() => setCreateMenuOpen(false)}
                        >
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg width="16" height="16" viewBox="0 0 24 24" className="text-blue-600">
                              <path fill="currentColor" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                            </svg>
                          </div>
                          <div>
                            <div className="font-medium">Create Group</div>
                            <div className="text-sm text-gray-500">Start a study group</div>
                          </div>
                        </Link>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setMenuOpen(v => !v)}
                    className="auth-chip"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen ? "true" : "false"}
                  >
                    {isLoading ? (
                      <div className="nav-avatar bg-gray-200 animate-pulse rounded-full flex items-center justify-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" className="text-gray-400">
                          <path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                      </div>
                    ) : (
                      <img
                        src={user?.photo_url || `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(user?.email || "user")}`}
                        alt="Profile"
                        className="nav-avatar"
                      />
                    )}
                    <span className="hidden sm:inline text-neutral-700">
                      {isLoading ? "Loading..." : (user?.name || user?.email)}
                    </span>
                    <svg width="14" height="14" viewBox="0 0 24 24" className="opacity-60">
                      <path fill="currentColor" d="M7 10l5 5 5-5z" />
                    </svg>
                  </button>

                  {menuOpen && (
                    <div className="profile-dropdown">
                      <Link to="/profile" className="profile-dropdown-item" onClick={() => setMenuOpen(false)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" className="mr-2">
                          <path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                        Profile
                      </Link>
                      <button className="profile-dropdown-item" onClick={handleLogout}>
                        <svg width="16" height="16" viewBox="0 0 24 24" className="mr-2">
                          <path fill="currentColor" d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                        </svg>
                        Logout
                      </button>
                    </div>
                  )}
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
