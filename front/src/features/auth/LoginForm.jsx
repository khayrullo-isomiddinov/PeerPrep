import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "./AuthContext"
import { loginUser } from "../../utils/api"
import AuthLayout from "./AuthLayout"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [msg, setMsg] = useState("")
  const [success, setSuccess] = useState(false)
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
    try {
      const data = await loginUser({ email, password })
      auth.login({ access_token: data.access_token, user: data.user })
      setMsg(`Welcome back, ${data.user.email}`)
      setSuccess(true)
      navigate("/profile", { replace: true })
    } catch (err) {
      setMsg(err?.response?.data?.detail || "Login failed")
      setSuccess(false)
    }
  }

  return (
    <AuthLayout title="Welcome Back" subtitle="Sign in to your account">
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full block rounded-xl border border-slate-300/60 dark:border-white/10 bg-white/90 dark:bg-white/5 px-4 py-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/60" placeholder="you@example.com" required />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full block rounded-xl border border-slate-300/60 dark:border-white/10 bg-white/90 dark:bg-white/5 px-4 py-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/60" placeholder="••••••••" required />
        </div>
        <button type="submit" className="w-full rounded-xl px-4 py-3 font-semibold shadow-sm bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500/60">
          Sign In
        </button>
      </form>
      {msg && <p className={`mt-5 text-center text-sm ${success ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>{msg}</p>}
    </AuthLayout>
  )
}
