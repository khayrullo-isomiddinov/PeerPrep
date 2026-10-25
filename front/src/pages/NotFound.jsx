import { Link } from "react-router-dom"
import Button from "../components/ui/Button"

export default function NotFound() {
  return (
    <div className="page-container flex flex-1 flex-col items-center justify-center py-24 text-center">
      <p className="font-display text-7xl font-bold text-gradient">404</p>
      <h1 className="mt-4 text-2xl font-bold text-fg">This page doesn't exist</h1>
      <p className="mt-2 max-w-sm text-fg-muted">The link may be broken, or the page may have moved.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button as={Link} to="/">Go home</Button>
        <Button as={Link} to="/events" variant="secondary">Browse events</Button>
      </div>
    </div>
  )
}
