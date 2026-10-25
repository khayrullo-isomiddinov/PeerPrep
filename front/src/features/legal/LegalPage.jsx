import { useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import { usePageTitle } from "../../hooks/usePageTitle"
import { formatLegalDate } from "./legalFormat"
import { LEGAL, hasPendingInfo } from "./legalInfo"

// A detail the owner still has to provide. Shown openly rather than guessed.
export function Pending({ children }) {
  return (
    <span className="rounded-sm border border-dashed border-warning/60 bg-warning-soft px-1.5 py-px font-mono text-[0.8em] text-warning">
      to be confirmed: {children}
    </span>
  )
}

export function ExternalLink({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}

export function MailLink({ subject }) {
  const href = `mailto:${LEGAL.contactEmail}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`
  return <a href={href}>{LEGAL.contactEmail}</a>
}

function Contents({ sections }) {
  return (
    <ol className="space-y-0.5">
      {sections.map((section, index) => (
        <li key={section.id}>
          <a
            href={`#${section.id}`}
            className="flex gap-3 rounded-md px-2 py-1.5 text-sm text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <span className="w-5 shrink-0 font-mono text-xs leading-5 text-fg-subtle">{String(index + 1).padStart(2, "0")}</span>
            <span>{section.title}</span>
          </a>
        </li>
      ))}
    </ol>
  )
}

// Shared layout for Privacy, Terms: a notebook-page header, a short summary, contents and numbered sections.
// sections: [{ id, title, body }]
export default function LegalPage({ label, title, intro, summary, sections }) {
  usePageTitle(label)
  const { hash } = useLocation()

  // Links like /privacy#cookies: client-side navigation doesn't jump to the section on its own
  useEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView()
  }, [hash])

  return (
    <div className="page-container py-8 sm:py-14">
      <header className="relative overflow-hidden rounded-2xl border border-line bg-surface-2 ruled px-5 pb-7 pt-10 sm:px-12 sm:pb-10 sm:pt-14">
        <span className="absolute inset-y-0 left-3 w-px bg-danger/25 sm:left-7" aria-hidden />
        <p className="label text-fg-subtle">Legal · Updated {formatLegalDate(LEGAL.lastUpdated)}</p>
        <h1 className="mt-3 text-[2.25rem] leading-[1.02] tracking-[-0.045em] text-fg sm:text-[3.25rem]">{title}</h1>
        {intro && <p className="mt-4 max-w-2xl text-fg-muted sm:text-lg">{intro}</p>}
      </header>

      {hasPendingInfo && (
        <p className="mt-4 rounded-lg border border-dashed border-warning/50 bg-warning-soft px-4 py-3 text-sm text-fg">
          A few details on this page are still being finalised; they're marked <Pending>…</Pending> below.
        </p>
      )}

      <div className="mt-8 grid grid-cols-1 gap-10 lg:mt-12 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          {/* Phones: a collapsible contents list; desktop: always visible beside the text */}
          <details className="group rounded-xl border border-line bg-surface lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-fg [&::-webkit-details-marker]:hidden">
              On this page
              <span className="font-mono text-xs text-fg-subtle transition-transform group-open:rotate-45" aria-hidden>+</span>
            </summary>
            <nav aria-label="On this page" className="border-t border-line p-2">
              <Contents sections={sections} />
            </nav>
          </details>
          <nav aria-label="On this page" className="hidden lg:block">
            <p className="label mb-3 px-2 text-fg-subtle">On this page</p>
            <Contents sections={sections} />
            <p className="mt-6 border-t border-line px-2 pt-4 text-sm text-fg-muted">
              Questions? <Link to="/contact" className="font-medium text-accent-text hover:underline">Get in touch</Link>
            </p>
          </nav>
        </aside>

        <article className="min-w-0">
          {summary && (
            <section aria-labelledby="in-short" className="mb-12 rounded-xl border border-line bg-surface p-5 sm:p-7">
              <h2 id="in-short" className="label text-fg-subtle">In short</h2>
              <ul className="mt-4 space-y-3">
                {summary.map((point) => (
                  <li key={point} className="flex gap-3 text-[0.9375rem] text-fg">
                    <span className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-fg" aria-hidden />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="legal-prose">
            {sections.map((section, index) => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <h2>
                  <span className="mr-3 font-mono text-sm font-normal text-fg-subtle">{String(index + 1).padStart(2, "0")}</span>
                  {section.title}
                </h2>
                {section.body}
              </section>
            ))}
          </div>
        </article>
      </div>
    </div>
  )
}
