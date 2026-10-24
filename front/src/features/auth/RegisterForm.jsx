import { useState } from "react"
import { registerUser, getErrorMessage } from "../../utils/api"
import AuthLayout from "./AuthLayout"
import { Link } from "react-router-dom"

const MIN_PASSWORD_LENGTH = 8

export default function RegisterForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [show, setShow] = useState(false)
  const [msg, setMsg] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [verifyUrl, setVerifyUrl] = useState("")

  async function submit(e) {
    e.preventDefault()
    setMsg("")
    setVerifyUrl("")
    if (password.length < MIN_PASSWORD_LENGTH) {
      setMsg(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      setSuccess(false)
      return
    }
    setLoading(true)
    try {
      const data = await registerUser({ email, password })
      setMsg(data?.message || "Account created! Check your email to verify your account.")
      setVerifyUrl(data?.verify_url || "")
      setSuccess(true)
      setEmail("")
      setPassword("")
    } catch (err) {
      setMsg(getErrorMessage(err, "Registration failed. Please try again."))
      setSuccess(false)
    } finally {
      setLoading(false)
    }
  }

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH

  return (
    <AuthLayout title="Create Account" subtitle="Join PeerPrep today">
      <form onSubmit={submit} className="space-y-4">
        <div className="field-row">
          <label className="label" htmlFor="register-email">Email</label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="auth-input"
            placeholder="you@example.com"
            required
            disabled={loading}
          />
        </div>

        <div className="field-row">
          <label className="label" htmlFor="register-password">Password</label>
          <div className="relative">
            <input
              id="register-password"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="auth-input pr-12"
              placeholder="••••••••"
              required
              minLength={MIN_PASSWORD_LENGTH}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShow(s => !s)}
              className="absolute inset-y-0 right-2 my-auto px-2 rounded-s text-muted"
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? "Hide" : "Show"}
            </button>
          </div>
          <div className="h-1 rounded-s bg-white/10 overflow-hidden">
            <div
              className="h-full premium-bg-primary"
              style={{ width: Math.min(100, Math.max(10, password.length * 10)) + "%" }}
            />
          </div>
          <p className={`text-xs mt-1 ${tooShort ? "premium-text-error" : "text-muted"}`}>
            At least {MIN_PASSWORD_LENGTH} characters
          </p>
        </div>

        <button
          type="submit"
          className="btn-pink-pill w-full premium-focus disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? "Creating account..." : "Sign Up"}
        </button>

        <div className="text-center text-sm mt-2">
          <span className="text-muted">{success ? "Already verified?" : "Already have an account?"}</span>{" "}
          <Link to="/login" className="link-quiet">Sign in</Link>
        </div>
      </form>

      {msg && (
        <p role="status" className={`mt-5 text-center text-sm ${success ? "premium-text-success" : "premium-text-error"}`}>
          {msg}
        </p>
      )}

      {verifyUrl && (
        <p className="mt-3 text-center text-sm break-all">
          <a href={verifyUrl} className="link-quiet underline">Verify my email</a>
        </p>
      )}
    </AuthLayout>
  )
}
