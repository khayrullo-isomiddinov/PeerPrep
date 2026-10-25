import { Link } from "react-router-dom"
import Logo from "./Logo"

const REPO_URL = "https://github.com/khayrullo-isomiddinov/PeerPrep"

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="page-container flex flex-col gap-8 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-sm text-fg-muted">
            Find a study group, plan the session together and work through it on a shared whiteboard.
          </p>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <p className="font-semibold text-fg">Product</p>
            <Link to="/events" className="text-fg-muted hover:text-fg">Browse events</Link>
            <Link to="/events/create" className="text-fg-muted hover:text-fg">Host an event</Link>
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-semibold text-fg">About</p>
            <Link to="/about" className="text-fg-muted hover:text-fg">Meet the founder</Link>
            <Link to="/about#contribute" className="text-fg-muted hover:text-fg">Contribute</Link>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="text-fg-muted hover:text-fg">
              GitHub<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-semibold text-fg">Help & legal</p>
            <Link to="/contact" className="text-fg-muted hover:text-fg">Contact & support</Link>
            <Link to="/privacy" className="text-fg-muted hover:text-fg">Privacy Policy</Link>
            <Link to="/terms" className="text-fg-muted hover:text-fg">Terms & Conditions</Link>
            <Link to="/privacy#cookies" className="text-fg-muted hover:text-fg">Cookies</Link>
          </div>
        </nav>
      </div>
      <div className="border-t border-line">
        <p className="page-container py-5 text-xs text-fg-subtle">© {new Date().getFullYear()} PeerPrep · No ads, no tracking</p>
      </div>
    </footer>
  )
}
