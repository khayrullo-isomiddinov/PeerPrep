import { Link } from "react-router-dom"

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth-overlay">
      <div className="auth-bg" />
      <div className="auth-modal">
        <button as="a" aria-label="Close" className="auth-close" onClick={() => (window.location.hash = "#/")}>×</button>
        <div className="text-center auth-header">
          <h2 className="auth-title">{title || "Welcome."}</h2>
          {subtitle ? <p className="auth-subtitle">{subtitle}</p> : null}
        </div>
        {children}
        <div className="auth-footer">
          <Link to="/" className="link-quiet">Back to Home</Link>
        </div>
      </div>
    </div>
  )
}
