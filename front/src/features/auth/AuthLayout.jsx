import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faUsers, faComments, faChalkboard } from "@fortawesome/free-solid-svg-icons"
import { LogoMark } from "../../components/Logo"

const HIGHLIGHTS = [
  { icon: faUsers, text: "Find study groups for your exams, or host your own" },
  { icon: faComments, text: "Plan the session together in a live group chat" },
  { icon: faChalkboard, text: "Work through problems on a shared whiteboard" },
]

// Split layout for sign-in/sign-up: brand panel on large screens, focused form everywhere
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex flex-1 lg:grid lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between p-12 text-white" style={{ background: "var(--brand-gradient)" }}>
        <div className="absolute inset-0 bg-grid opacity-40 [--grid-line:rgb(255_255_255/0.08)]" aria-hidden />
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="relative">
          <LogoMark className="size-10" />
        </div>
        <div className="relative max-w-md">
          <h2 className="text-4xl font-bold leading-tight">Study together.<br />Prepare better.</h2>
          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map((item) => (
              <li key={item.text} className="flex items-center gap-3 text-white/90">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/15 backdrop-blur-sm">
                  <FontAwesomeIcon icon={item.icon} />
                </span>
                {item.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/70">Free and open source.</p>
      </aside>

      <section className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center sm:py-16">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-bold text-fg">{title}</h1>
          {subtitle && <p className="mt-2 text-fg-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-center text-sm text-fg-muted">{footer}</div>}
        </div>
      </section>
    </div>
  )
}
