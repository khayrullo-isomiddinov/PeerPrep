import { Link } from "react-router-dom"
import Button from "../components/ui/Button"
import { usePageTitle } from "../hooks/usePageTitle"

export default function NotFound() {
  usePageTitle("Page not found")
  return (
    <div className="page-container flex flex-1 flex-col items-center justify-center py-24 text-center">
      <p className="serif text-8xl leading-none text-fg">404</p>
      <h1 className="mt-6 text-2xl tracking-[-0.03em] text-fg">This page isn't in the <span className="mark">notes</span>.</h1>
      <p className="mt-2 max-w-sm text-fg-muted">The link may be broken, or the page may have moved.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button as={Link} to="/">Go home</Button>
        <Button as={Link} to="/events" variant="secondary">Browse events</Button>
      </div>
    </div>
  )
}
