import { useEffect, useState } from "react"
import { useLocation, useNavigate, Link } from "react-router-dom"
import { useAuth } from "./authContextValue"
import { loginUser, resendVerification, getErrorMessage, AUTH_NOTICE_KEY } from "../../utils/api"
import AuthLayout from "./AuthLayout"
import AuthNotice from "./AuthNotice"
import PasswordInput from "./PasswordInput"
import Field, { Input } from "../../components/ui/Field"
import Button from "../../components/ui/Button"
import { usePageTitle } from "../../hooks/usePageTitle"

function initialNotice(search) {
  const verified = new URLSearchParams(search).get("verified")
  if (verified === "1") return { tone: "success", text: "Email verified! You can now sign in." }
  if (verified === "0") return { tone: "error", text: "This verification link is invalid or has already been used. Sign in to request a new one." }
  try {
    const notice = sessionStorage.getItem(AUTH_NOTICE_KEY)
    if (notice) {
      sessionStorage.removeItem(AUTH_NOTICE_KEY)
      return { tone: "info", text: notice }
    }
  } catch { /* storage unavailable (private mode) */ }
  return null
}

export default function LoginForm() {
  usePageTitle("Sign in")
  const location = useLocation()
  const navigate = useNavigate()
  const auth = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [notice, setNotice] = useState(() => initialNotice(location.search))
  const [loading, setLoading] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [resending, setResending] = useState(false)
  const [verifyUrl, setVerifyUrl] = useState("")

  useEffect(() => {
    if (auth.isAuthenticated) navigate("/", { replace: true })
  }, [auth.isAuthenticated, navigate])

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    setNotice(null)
    setNeedsVerification(false)
    setVerifyUrl("")
    try {
      const data = await loginUser({ email, password })
      auth.login({ access_token: data.access_token, user: data.user })
      navigate("/", { replace: true })
    } catch (err) {
      setNeedsVerification(err?.response?.status === 403)
      setNotice({ tone: "error", text: getErrorMessage(err, "Sign in failed. Please try again.") })
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setResending(true)
    try {
      const data = await resendVerification(email)
      setNotice({ tone: data.email_sent === false ? "info" : "success", text: data.message })
      setVerifyUrl(data.verify_url || "")
      if (data.already_verified) setNeedsVerification(false)
    } catch (err) {
      setNotice({ tone: "error", text: getErrorMessage(err, "Couldn't resend the verification email.") })
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to see your study sessions."
      footer={<>New to PeerPrep? <Link to="/register" className="font-semibold text-accent-text hover:underline">Create an account</Link></>}
    >
      {notice && (
        <AuthNotice tone={notice.tone}>
          <p>{notice.text}</p>
          {needsVerification && (
            <button type="button" onClick={handleResend} disabled={resending || !email} className="font-semibold text-accent-text underline disabled:opacity-60">
              {resending ? "Sending…" : "Resend verification email"}
            </button>
          )}
          {verifyUrl && <a href={verifyUrl} className="block font-semibold text-accent-text underline">Verify my email</a>}
        </AuthNotice>
      )}

      <form onSubmit={submit} className="space-y-5">
        <Field label="Email">
          <Input type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@university.edu" required />
        </Field>
        <Field label="Password">
          <PasswordInput autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  )
}
