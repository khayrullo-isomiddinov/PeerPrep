import { Link } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons"

export default function NotFound() {
  return (
    <div className="min-h-screen tap-safe bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50/30 route-transition">
      <div className="nav-spacer" />
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center">
          <p className="text-6xl font-extrabold text-pink-500 mb-2">404</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h2>
          <p className="text-gray-600 mb-6">The page you're looking for doesn't exist or has moved.</p>
          <Link to="/" className="btn-pink-pill">
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
