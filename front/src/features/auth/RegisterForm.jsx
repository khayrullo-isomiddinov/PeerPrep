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
  const [agree, setAgree] = useState(false)

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
      <div className="form-divider"><span>or sign up with email</span></div>
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
            disabled={loading}
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
              disabled={loading}
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
          <div className="h-1 rounded-s bg-white/10 overflow-hidden">
            <div
              className="h-full premium-bg-primary transition-all"
              style={{ width: Math.min(100, Math.max(10, password.length * 10)) + "%" }}
            />
          </div>
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" className="checkbox checkbox-sm" checked={agree} onChange={e=>setAgree(e.target.checked)} required />
          I agree to the <a className="link-quiet" href="#">Privacy Policy</a>
        </label>

        <button
          type="submit"
          className="btn-pink-pill w-full premium-focus disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={loading || !agree}
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
