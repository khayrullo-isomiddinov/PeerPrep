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
      setTimeout(() => {
        navigate("/groups", { replace: true })
      }, 500)
    } catch (err) {
      setMsg(err?.response?.data?.detail || "Login failed")
      setSuccess(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Welcome Back" subtitle="Sign in to your account">
      <form onSubmit={submit} className="space-y-5 premium-fade-in">
        <div className="field-row">
          <label className="label">Email</label>
          <input
            type="email"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            className="input premium-input"
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
              className="input premium-input pr-12"
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
          className="btn w-full premium-focus disabled:opacity-60"
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
