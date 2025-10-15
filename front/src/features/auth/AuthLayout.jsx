import { Link } from "react-router-dom"

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-[85vh] grid lg:grid-cols-2">
      <section className="relative hidden lg:flex items-center justify-center p-10">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full blur-3xl opacity-40" style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-soft))" }} />
          <div className="absolute -bottom-24 -right-24 h-[28rem] w-[28rem] rounded-full blur-3xl opacity-30" style={{ background: "linear-gradient(135deg, #60a5fa20, #a78bfa20)" }} />
        </div>

        <div className="max-w-xl w-full space-y-8 premium-fade-in">
          <div className="hero-accent blur-aura">
            <span className="badge">PeerPrep</span>
            <h1 className="mt-4 premium-heading">Study smarter with PeerPrep</h1>
            <p className="mt-3 text-muted text-lg">Find groups, plan events, and keep momentum. Your study crew, organized.</p>

            <div className="mt-8 grid grid-cols-3 gap-3">
              <div className="card text-center">
                <div className="text-sm text-muted">Active groups</div>
                <div className="text-2xl font-extrabold">1,248</div>
              </div>
              <div className="card text-center">
                <div className="text-sm text-muted">Sessions this week</div>
                <div className="text-2xl font-extrabold">3,972</div>
              </div>
              <div className="card text-center">
                <div className="text-sm text-muted">Avg. focus</div>
                <div className="text-2xl font-extrabold">87%</div>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-paper outline outline-1 outline-white/10 shadow-1 animate-float" />
                <div className="absolute -right-3 top-1 w-8 h-8 rounded-full bg-paper outline outline-1 outline-white/10 shadow-1 animate-float" style={{ animationDelay: ".2s" }} />
                <div className="absolute -left-4 -bottom-2 w-6 h-6 rounded-full bg-paper outline outline-1 outline-white/10 shadow-1 animate-float" style={{ animationDelay: ".4s" }} />
              </div>
              <div className="text-sm text-muted">Loved by students worldwide</div>
            </div>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="auth-card w-full premium-scale-in">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2">
              <span className="brand-mark" />
              <h2 className="text-3xl font-extrabold">{title}</h2>
            </div>
            {subtitle ? <p className="mt-2 text-muted">{subtitle}</p> : null}
          </div>
          {children}
          <div className="mt-8 text-center text-sm text-muted">
            <Link to="/" className="link-quiet hover:opacity-100">Back to Home</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
