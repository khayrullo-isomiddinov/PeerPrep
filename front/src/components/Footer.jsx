import { Link } from "react-router-dom"
import { useAuth } from "../features/auth/AuthContext"

export default function Footer() {
  const year = new Date().getFullYear()
  const { isAuthenticated } = useAuth()
  
  return (
    <footer className="footer-pro">
      <div className="footer-inner">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="inline-flex items-center gap-2">
              <svg className="brand-ticket" viewBox="0 0 64 48" aria-hidden>
                <defs>
                  <linearGradient id="pinkGradFooter" x1="0" x2="1">
                    <stop offset="0%" stopColor="#fda4af"/>
                    <stop offset="100%" stopColor="#ec4899"/>
                  </linearGradient>
                </defs>
                <path fill="url(#pinkGradFooter)" d="M8 10c0-2.2 1.8-4 4-4h36c1.1 0 2 .9 2 2v4a4 4 0 1 0 0 8v8a4 4 0 1 0 0 8v4c0 1.1-.9 2-2 2H12c-2.2 0-4-1.8-4-4V10z"/>
                <path fill="#fff" opacity=".25" d="M22 10h2v28h-2zM30 10h2v28h-2zM38 10h2v28h-2z"/>
              </svg>
              <div className="brand-text"><span className="text-neutral-200">Peer</span><span className="text-pink-500">Prep</span></div>
            </div>
            <p className="footer-note" style={{ marginTop: '1rem', maxWidth: '280px' }}>
              Connect with peers, collaborate on study materials, and achieve your academic goals together.
            </p>
          </div>

          <nav className="footer-col">
            <h3 className="footer-title">Quick Links</h3>
            <ul className="footer-list">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/groups">Study Groups</Link></li>
              <li><Link to="/events">Events</Link></li>
            </ul>
          </nav>

          <nav className="footer-col">
            <h3 className="footer-title">Features</h3>
            <ul className="footer-list">
              <li><Link to="/groups">Study Groups</Link></li>
              <li><Link to="/events">Study Events</Link></li>
            </ul>
          </nav>

          <nav className="footer-col">
            <h3 className="footer-title">Account</h3>
            <ul className="footer-list">
              {isAuthenticated ? (
                <li><Link to="/profile">My Profile</Link></li>
              ) : (
                <>
                  <li><Link to="/login">Login</Link></li>
                  <li><Link to="/register">Register</Link></li>
                </>
              )}
            </ul>
          </nav>
        </div>

        <div className="footer-divider" />

        <div className="footer-bottom">
          <div className="legal">
            © {year} PeerPrep
          </div>
        </div>
      </div>
    </footer>
  )
}
