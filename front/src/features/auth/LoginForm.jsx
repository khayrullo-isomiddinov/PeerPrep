import { useEffect, useState } from "react"
import { useLocation, useNavigate, Link } from "react-router-dom"
import { useAuth } from "./AuthContext"
import { loginUser, resendVerification, getErrorMessage, AUTH_NOTICE_KEY } from "../../utils/api"
import AuthLayout from "./AuthLayout"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [msg, setMsg] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [resending, setResending] = useState(false)
  const [verifyUrl, setVerifyUrl] = useState("")
  const location = useLocation()
  const navigate = useNavigate()
  const auth = useAuth()

  useEffect(() => {
    if (auth.isAuthenticated) navigate("/events", { replace: true })
  }, [auth.isAuthenticated, navigate])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const verified = params.get("verified")
    if (verified === "1") {
      setMsg("Email verified! You can now sign in.")
      setSuccess(true)
    } else if (verified === "0") {
      setMsg("This verification link is invalid or has already been used. Sign in to request a new one.")
      setSuccess(false)
    } else {
      try {
        const notice = sessionStorage.getItem(AUTH_NOTICE_KEY)
        if (notice) {
          sessionStorage.removeItem(AUTH_NOTICE_KEY)
          setMsg(notice)
          setSuccess(false)
        }
      } catch { /* storage unavailable (private mode) */ }
    }
  }, [location.search])

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    setMsg("")
    setNeedsVerification(false)
    setVerifyUrl("")
    try {
      const data = await loginUser({ email, password })
      auth.login({ access_token: data.access_token, user: data.user })
      navigate("/events", { replace: true })
    } catch (err) {
      setNeedsVerification(err?.response?.status === 403)
      setMsg(getErrorMessage(err, "Sign in failed. Please try again."))
      setSuccess(false)
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setResending(true)
    try {
      const data = await resendVerification(email)
      setMsg(data.message)
      setSuccess(true)
      setVerifyUrl(data.verify_url || "")
      if (data.already_verified) setNeedsVerification(false)
    } catch (err) {
      setMsg(getErrorMessage(err, "Couldn't resend the verification email."))
      setSuccess(false)
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthLayout title="Welcome Back" subtitle="Sign in to your account">
      <form onSubmit={submit} className="space-y-4">
        <div className="field-row">
          <label className="label" htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="auth-input"
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="field-row">
          <label className="label" htmlFor="login-password">Password</label>
          <div className="relative">
            <input
              id="login-password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="auth-input pr-12"
              placeholder="••••••••"
              required
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
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-pink-pill w-full premium-focus disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <div className="text-center text-sm">
          <span className="text-muted">Don't have an account?</span>{" "}
          <Link to="/register" className="link-quiet">Sign up</Link>
        </div>
      </form>

      {msg && (
        <p role="status" className={`mt-5 text-center text-sm ${success ? "premium-text-success" : "premium-text-error"}`}>
          {msg}
        </p>
      )}

      {needsVerification && (
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || !email}
            className="text-sm font-semibold link-quiet underline disabled:opacity-60"
          >
            {resending ? "Sending..." : "Resend verification email"}
          </button>
        </div>
      )}

      {verifyUrl && (
        <p className="mt-3 text-center text-sm break-all">
          <a href={verifyUrl} className="link-quiet underline">Verify my email</a>
        </p>
      )}
    </AuthLayout>
  )
}
