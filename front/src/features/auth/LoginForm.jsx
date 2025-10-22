import { useEffect, useState } from "react"
import { useLocation, useNavigate, Link } from "react-router-dom"
import { useAuth } from "./AuthContext"
import { loginUser } from "../../utils/api"
import AuthLayout from "./AuthLayout"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [msg, setMsg] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const auth = useAuth()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const verified = params.get("verified")
    if (verified === "1") {
      setMsg("Email verified! You can now sign in.")
      setSuccess(true)
    } else if (verified === "0") {
      setMsg("Verification link is invalid or expired.")
      setSuccess(false)
    }
  }, [location.search])

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await loginUser({ email, password })
      auth.login({ access_token: data.access_token, user: data.user })
      setMsg(`Welcome back, ${data.user.email}`)
      setSuccess(true)
      navigate("/groups", { replace: true })
    } catch (err) {
      setMsg(err?.response?.data?.detail || "Login failed")
      setSuccess(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Welcome Back" subtitle="Sign in to your account">
      <div className="social-compact">
        <button className="social-box google" type="button">
          <svg viewBox="0 0 24 24" width="16" height="16"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.7 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.6l2.6-2.5C16.7 3 14.6 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.9 0-.7-.1-1.2-.2-1.9H12z"/></svg>
          Google
        </button>
        <button className="social-box facebook" type="button">
          <svg viewBox="0 0 24 24" width="16" height="16"><path fill="#1877F2" d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.4V12h3V9.7c0-3 1.8-4.6 4.5-4.6 1.3 0 2.6.2 2.6.2v2.9h-1.5c-1.5 0-2 1-2 2V12h3.4l-.5 2.9H14V22A10 10 0 0 0 22 12"/></svg>
          Facebook
        </button>
      </div>
      <div className="form-divider"><span>or continue with email</span></div>
      <form onSubmit={submit} className="space-y-4 premium-fade-in">
        <div className="field-row">
          <label className="label">Email</label>
          <input
            type="email"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            className="auth-input"
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="field-row">
          <label className="label">Password</label>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={e=>setPassword(e.target.value)}
              className="auth-input pr-12"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={()=>setShow(s=>!s)}
              className="absolute inset-y-0 right-2 my-auto px-2 rounded-s premium-hover text-muted"
              aria-label="Toggle password visibility"
            >
              {show ? "Hide" : "Show"}
            </button>
          </div>
          <div className="flex items-center justify-between mt-1">
            <label className="inline-flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" className="checkbox checkbox-sm" />
              Remember me
            </label>
            <Link to="/forgot" className="text-sm link-quiet">Forgot password?</Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-pink-pill w-full premium-focus disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      {msg && (
        <p className={`mt-5 text-center text-sm ${success ? "premium-text-success" : "premium-text-error"}`}>
          {msg}
        </p>
      )}
    </AuthLayout>
  )
}
