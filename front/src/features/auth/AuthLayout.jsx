import { Link } from "react-router-dom"

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-[80vh] grid lg:grid-cols-2 gap-0">
      <section className="relative hidden lg:flex items-center justify-center overflow-hidden p-12">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full blur-3xl opacity-40 bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-emerald-400" />
          <div className="absolute -bottom-24 -right-24 h-[28rem] w-[28rem] rounded-full blur-3xl opacity-40 bg-gradient-to-tr from-emerald-400 via-sky-400 to-indigo-500" />
          <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_20%_20%,rgba(255,255,255,0.12),transparent_60%),radial-gradient(60%_50%_at_80%_80%,rgba(255,255,255,0.06),transparent_60%)] dark:bg-[radial-gradient(70%_60%_at_20%_20%,rgba(255,255,255,0.06),transparent_60%),radial-gradient(60%_50%_at_80%_80%,rgba(255,255,255,0.03),transparent_60%)]" />
        </div>

        <div className="max-w-xl w-full text-center space-y-8">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Study smarter with <span className="text-[--color-accent]">PeerPrep</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-lg">
            Find groups, plan events, and keep momentum. Your study crew, organized.
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl p-4 card">
              <div className="text-sm opacity-80">Active groups</div>
              <div className="text-2xl font-bold">1,248</div>
            </div>
            <div className="rounded-2xl p-4 card">
              <div className="text-sm opacity-80">Sessions this week</div>
              <div className="text-2xl font-bold">3,972</div>
            </div>
            <div className="rounded-2xl p-4 card">
              <div className="text-sm opacity-80">Avg. focus</div>
              <div className="text-2xl font-bold">87%</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6">
            <img className="h-10 w-10 rounded-full ring-2 ring-white/60 dark:ring-white/10" src="https://i.pravatar.cc/100?img=1" />
            <img className="h-10 w-10 rounded-full ring-2 ring-white/60 dark:ring-white/10" src="https://i.pravatar.cc/100?img=2" />
            <img className="h-10 w-10 rounded-full ring-2 ring-white/60 dark:ring-white/10" src="https://i.pravatar.cc/100?img=3" />
            <div className="text-sm text-slate-600 dark:text-slate-300">
              Loved by students worldwide
            </div>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-12">
        <div className="auth-card w-full">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-extrabold">{title}</h2>
            {subtitle ? <p className="mt-2 text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
          </div>
          {children}
          <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
            <Link to="/" className="hover:underline">Back to Home</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
