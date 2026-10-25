import { useState } from "react"
import { Link } from "react-router-dom"
import { registerUser, getErrorMessage } from "../../utils/api"
import AuthLayout from "./AuthLayout"
import AuthNotice from "./AuthNotice"
import PasswordInput from "./PasswordInput"
import Field, { Input } from "../../components/ui/Field"
import Button from "../../components/ui/Button"
import { usePageTitle } from "../../hooks/usePageTitle"

const MIN_PASSWORD_LENGTH = 8

// 0–3, for the strength meter: length plus a mix of character types
function passwordStrength(password) {
  if (password.length < MIN_PASSWORD_LENGTH) return 0
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length
  return Math.min(3, 1 + (password.length >= 12 ? 1 : 0) + (variety >= 3 ? 1 : 0))
}

const STRENGTH = [
  { label: `At least ${MIN_PASSWORD_LENGTH} characters`, bar: "" },
  { label: "Okay", bar: "bg-warning" },
  { label: "Good", bar: "bg-aqua" },
  { label: "Strong", bar: "bg-success" },
]

export default function RegisterForm() {
  usePageTitle("Create an account")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [notice, setNotice] = useState(null)
  const [verifyUrl, setVerifyUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const strength = passwordStrength(password)
  const passwordError = submitted && password.length < MIN_PASSWORD_LENGTH ? `Use at least ${MIN_PASSWORD_LENGTH} characters.` : ""

  async function submit(e) {
    e.preventDefault()
    setSubmitted(true)
    setNotice(null)
    setVerifyUrl("")
    if (password.length < MIN_PASSWORD_LENGTH) return
    setLoading(true)
    try {
      const data = await registerUser({ email, password })
      setNotice({ tone: data?.email_sent === false ? "info" : "success", text: data?.message || "Account created! Check your email to verify your account." })
      setVerifyUrl(data?.verify_url || "")
      setRegistered(true)
      setPassword("")
      setSubmitted(false)
    } catch (err) {
      setNotice({ tone: "error", text: getErrorMessage(err, "Registration failed. Please try again.") })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title={registered ? "Check your inbox" : "Create your account"}
      subtitle={registered ? `We sent a verification link to ${email}.` : "Join study groups and start preparing together. It's free."}
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-accent-text hover:underline">Sign in</Link></>}
    >
      {notice && (
        <AuthNotice tone={notice.tone}>
          <p>{notice.text}</p>
          {verifyUrl && <a href={verifyUrl} className="block font-semibold text-accent-text underline">Verify my email</a>}
        </AuthNotice>
      )}

      {!registered && (
        <form onSubmit={submit} className="space-y-5">
          <Field label="Email">
            <Input type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@university.edu" required disabled={loading} />
          </Field>
          <Field label="Password" error={passwordError}>
            <PasswordInput autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={MIN_PASSWORD_LENGTH} required disabled={loading} />
          </Field>
          <div className="-mt-2" aria-live="polite">
            <div className="flex gap-1.5" aria-hidden>
              {[1, 2, 3].map((level) => (
                <span key={level} className={`h-1 flex-1 rounded-full transition-colors ${strength >= level ? STRENGTH[strength].bar : "bg-surface-3"}`} />
              ))}
            </div>
            <p className="mt-1.5 text-xs text-fg-subtle">{password ? STRENGTH[strength].label : STRENGTH[0].label}</p>
          </div>
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            {loading ? "Creating account…" : "Create account"}
          </Button>
          <p className="text-center text-xs text-fg-subtle">
            By creating an account you agree to the <Link to="/terms" className="underline underline-offset-2 hover:text-fg">Terms</Link> and
            confirm you've read the <Link to="/privacy" className="underline underline-offset-2 hover:text-fg">Privacy Policy</Link>.
          </p>
        </form>
      )}

      {registered && (
        <Button as={Link} to="/login" variant="secondary" size="lg" className="w-full">Go to sign in</Button>
      )}
    </AuthLayout>
  )
}
