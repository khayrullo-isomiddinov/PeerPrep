import { useState } from "react"
import { registerUser } from "../../utils/api"
import AuthLayout from "./AuthLayout"
import { Link } from "react-router-dom"

export default function RegisterForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
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
    } catch (err) {
      setMsg("Registration failed")
      setSuccess(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Create Account" subtitle="Join StudyHub today">
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full block rounded-xl border border-slate-300/60 dark:border-white/10 bg-white/90 dark:bg-white/5 px-4 py-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/60"
            placeholder="you@example.com"
            required
            disabled={loading}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full block rounded-xl border border-slate-300/60 dark:border-white/10 bg-white/90 dark:bg-white/5 px-4 py-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/60"
            placeholder="••••••••"
            required
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-xl px-4 py-3 font-semibold shadow-sm bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500/60 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Creating account..." : "Sign Up"}
        </button>
        {success && (
          <div className="text-center text-sm">
            <span className="text-slate-400">Already verified?</span>{" "}
            <Link to="/login" className="text-indigo-400 hover:underline">Sign in</Link>
          </div>
        )}
      </form>
      {msg && (
        <p className={`mt-5 text-center text-sm ${success ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
          {msg}
        </p>
      )}
    </AuthLayout>
  )
}
