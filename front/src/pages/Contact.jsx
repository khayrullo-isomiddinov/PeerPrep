import { Link } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faArrowRight, faBug, faFlag, faLifeRing, faShieldHalved, faUserShield } from "@fortawesome/free-solid-svg-icons"
import { usePageTitle } from "../hooks/usePageTitle"
import { LEGAL } from "../features/legal/legalInfo"

const mail = (subject) => `mailto:${LEGAL.contactEmail}?subject=${encodeURIComponent(subject)}`

const CHANNELS = [
  {
    icon: faLifeRing,
    title: "Help with PeerPrep",
    text: "Stuck signing in, creating an event, or something just isn't working for you.",
    href: mail("Help with PeerPrep"),
    cta: "Email us",
  },
  {
    icon: faBug,
    title: "Report a bug",
    text: "Bug reports and ideas go on GitHub, in public. Leave out personal details.",
    href: LEGAL.issuesUrl,
    cta: "Open an issue",
    external: true,
  },
  {
    icon: faFlag,
    title: "Report a person or event",
    text: "Harassment, spam, unsafe sessions or content that breaks the rules. Include a link to the event or profile.",
    href: mail("Report: person or event"),
    cta: "Send a report",
  },
  {
    icon: faUserShield,
    title: "Privacy request",
    text: "Get a copy of your data, correct it or have it deleted. Write from your account's email address.",
    href: mail("Privacy request"),
    cta: "Make a request",
  },
  {
    icon: faShieldHalved,
    title: "Security issue",
    text: "Found a vulnerability? Tell us privately first, please don't post it publicly.",
    href: mail("Security report"),
    cta: "Report privately",
  },
]

const FAQ = [
  {
    q: "I didn't get the verification email.",
    a: <>Check your spam folder. On the <Link to="/login">sign-in page</Link>, sign in with your email and password and you'll be offered a new link.</>,
  },
  {
    q: "How do I delete my account?",
    a: <>Open your <Link to="/profile">profile</Link> and choose “Delete account” at the bottom. It removes your data straight away; see the <Link to="/privacy#delete">Privacy Policy</Link> for exactly what's deleted.</>,
  },
  {
    q: "Who can see my email address?",
    a: <>Nobody but you. Other people see your name and photo, or the first part of your email until you set a name.</>,
  },
]

export default function Contact() {
  usePageTitle("Contact & support")

  return (
    <div className="page-container py-8 sm:py-14">
      <header className="max-w-2xl">
        <p className="label text-fg-subtle">Contact & support</p>
        <h1 className="mt-3 text-[2.25rem] leading-[1.02] tracking-[-0.045em] text-fg sm:text-[3.25rem]">
          How can we <span className="serif">help?</span>
        </h1>
        <p className="mt-4 text-fg-muted sm:text-lg">
          PeerPrep is run by one developer who reads every message. Pick the closest option below so it reaches the
          right place, or write directly to{" "}
          <a href={`mailto:${LEGAL.contactEmail}`} className="font-medium text-accent-text underline underline-offset-4">{LEGAL.contactEmail}</a>.
        </p>
      </header>

      <ul className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CHANNELS.map((channel) => (
          <li key={channel.title} className="flex">
            <a
              href={channel.href}
              {...(channel.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="card-hover group flex w-full flex-col rounded-xl border border-line bg-surface p-5"
            >
              <FontAwesomeIcon icon={channel.icon} className="text-fg-subtle" />
              <h2 className="mt-4 text-base font-semibold tracking-[-0.01em] text-fg">{channel.title}</h2>
              <p className="mt-1 flex-1 text-sm text-fg-muted">{channel.text}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent-text">
                {channel.cta}
                {channel.external && <span className="sr-only">(opens in a new tab)</span>}
                <FontAwesomeIcon icon={faArrowRight} className="text-xs transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:translate-x-1" />
              </span>
            </a>
          </li>
        ))}
      </ul>

      <section aria-labelledby="faq" className="mt-16 max-w-2xl">
        <h2 id="faq" className="text-[1.375rem] tracking-[-0.025em] text-fg">Quick answers</h2>
        <dl className="mt-4 divide-y divide-line border-y border-line">
          {FAQ.map((item) => (
            <div key={item.q} className="py-5">
              <dt className="font-medium text-fg">{item.q}</dt>
              <dd className="mt-1.5 text-fg-muted [&_a]:text-accent-text [&_a]:underline [&_a]:underline-offset-4">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
