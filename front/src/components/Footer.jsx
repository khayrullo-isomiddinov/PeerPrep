export default function Footer() {
  const year = new Date().getFullYear()
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
          </div>

          <nav className="footer-col">
            <h3 className="footer-title">Categories</h3>
            <ul className="footer-list">
              <li><a href="#">All</a></li>
              <li><a href="#">Music</a></li>
              <li><a href="#">Sport</a></li>
              <li><a href="#">Exhibition</a></li>
              <li><a href="#">Business</a></li>
              <li><a href="#">Photography</a></li>
            </ul>
          </nav>

          <nav className="footer-col">
            <h3 className="footer-title">Resources</h3>
            <ul className="footer-list">
              <li><a href="#">User guides</a></li>
              <li><a href="#">Help Center</a></li>
              <li><a href="#">Partners</a></li>
              <li><a href="#">Taxes</a></li>
            </ul>
          </nav>

          <nav className="footer-col">
            <h3 className="footer-title">Company</h3>
            <ul className="footer-list">
              <li><a href="#">About</a></li>
              <li><a href="#">Join us</a></li>
            </ul>
          </nav>

          <div className="footer-subscribe">
            <h3 className="footer-title accent">Stay in the loop</h3>
            <p className="footer-note">For product announcements and exclusive insights</p>
            <form className="subscribe-wrap" onSubmit={(e)=>e.preventDefault()}>
              <div className="subscribe-field">
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden><path fill="currentColor" d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z"/></svg>
                <input placeholder="Input your email" type="email" />
              </div>
              <button className="btn-pink square" type="submit">Subscribe</button>
            </form>
          </div>
        </div>

        <div className="footer-divider" />

        <div className="footer-bottom">
          <div className="lang-select">
            <select aria-label="Language">
              <option>English</option>
              <option>Deutsch</option>
              <option>Français</option>
            </select>
          </div>
          <div className="legal">
            © {year} PeerPrep · <a href="#">Privacy</a> · <a href="#">Terms</a> · <a href="#">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
