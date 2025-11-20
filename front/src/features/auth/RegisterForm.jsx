import { useState } from "react"
import { registerUser } from "../../utils/api"
import AuthLayout from "./AuthLayout"
import { Link } from "react-router-dom"

export default function RegisterForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [show, setShow] = useState(false)
  const [msg, setMsg] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    setMsg("")
    try {
      const data = await registerUser({ email, password })
      setMsg(data?.message || "Registration successful. Please check your email to verify your account.")
      setSuccess(true)
      setEmail("")
      setPassword("")
    } catch {
      setMsg("Registration failed")
      setSuccess(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Create Account" subtitle="Join PeerPrep today">
      <form onSubmit={submit} className="space-y-4">
        <div className="field-row">
          <label className="label">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="auth-input"
            placeholder="you@example.com"
            required
            disabled={loading}
          />
        </div>

        <div className="field-row">
          <label className="label">Password</label>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="auth-input pr-12"
              placeholder="••••••••"
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShow(s => !s)}
              className="absolute inset-y-0 right-2 my-auto px-2 rounded-s premium-hover text-muted"
              aria-label="Toggle password visibility"
            >
              {show ? "Hide" : "Show"}
            </button>
          </div>
          <div className="h-1 rounded-s bg-white/10 overflow-hidden">
            <div
              className="h-full premium-bg-primary transition-all"
              style={{ width: Math.min(100, Math.max(10, password.length * 10)) + "%" }}
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn-pink-pill w-full premium-focus disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? "Creating account..." : "Sign Up"}
        </button>

        {success && (
          <div className="text-center text-sm mt-2">
            <span className="text-muted">Already verified?</span>{" "}
            <Link to="/login" className="link-quiet">Sign in</Link>
          </div>
        )}
      </form>

      {msg && (
        <p className={`mt-5 text-center text-sm ${success ? "premium-text-success" : "premium-text-error"}`}>
          {msg}
        </p>
      )}
    </AuthLayout>
  )
}
