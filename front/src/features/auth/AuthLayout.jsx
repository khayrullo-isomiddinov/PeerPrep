import { Link } from "react-router-dom"
import { LogoMark } from "../../components/Logo"

// Split layout for sign-in/sign-up: a notebook page on large screens, the form everywhere
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex flex-1 lg:grid lg:grid-cols-[1fr_1fr]">
      <aside className="ruled relative hidden overflow-hidden border-r border-line bg-surface-2 lg:flex lg:flex-col lg:justify-between lg:p-14">
        {/* notebook margin line */}
        <span className="absolute inset-y-0 left-10 w-px bg-danger/25" aria-hidden />
        <Link to="/" className="relative w-fit text-fg" aria-label="PeerPrep home">
          <LogoMark className="size-9" />
        </Link>
        <blockquote className="relative max-w-md">
          <p className="text-[2.6rem] leading-[1.08] tracking-[-0.04em] text-fg">
            The best way to learn something is to <span className="mark">explain it</span> to someone
            <span className="serif text-[1.1em]"> else.</span>
          </p>
          <footer className="label mt-6 text-fg-subtle">Every study group, ever</footer>
        </blockquote>
        <p className="label relative text-fg-subtle">Free · No ads · Open source</p>
      </aside>

      <section className="flex flex-1 items-start justify-center px-4 py-12 sm:items-center sm:py-16">
        <div className="w-full max-w-sm">
          <h1 className="text-[2rem] leading-tight tracking-[-0.04em] text-fg">{title}</h1>
          {subtitle && <p className="mt-2 text-fg-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 border-t border-line pt-6 text-sm text-fg-muted">{footer}</div>}
        </div>
      </section>
    </div>
  )
}
