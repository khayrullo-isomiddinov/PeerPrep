import { useEffect } from "react"
import { useLocation, Link } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faGlobe, faEnvelope, faBug, faLightbulb, faCodePullRequest, faArrowRight } from "@fortawesome/free-solid-svg-icons"
import founderPhoto from "../images/founder.jpg"
import Card from "../components/ui/Card"
import Badge from "../components/ui/Badge"
import Button from "../components/ui/Button"
import { usePageTitle } from "../hooks/usePageTitle"

const WEBSITE_URL = "https://www.khayrullo.com"
const EMAIL = "khayrullo2@outlook.com"
const GITHUB_PROFILE_URL = "https://github.com/khayrullo-isomiddinov"
const REPO_URL = "https://github.com/khayrullo-isomiddinov/PeerPrep"

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  )
}

const WAYS_TO_HELP = [
  { icon: faBug, title: "Report a bug", text: "Found something broken? Open an issue with what happened and how to reproduce it.", href: `${REPO_URL}/issues`, cta: "Open an issue" },
  { icon: faLightbulb, title: "Suggest an idea", text: "Have a feature in mind that would make studying together better? I'd love to hear it.", href: `${REPO_URL}/issues`, cta: "Share an idea" },
  { icon: faCodePullRequest, title: "Contribute code", text: "Fork the repo, pick something to improve and send a pull request. React + FastAPI.", href: REPO_URL, cta: "View the code" },
]

export default function About() {
  usePageTitle("About")
  const { hash } = useLocation()

  // Support links like /about#contribute from the footer
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0)
      return
    }
    document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [hash])

  return (
    <div className="page-container max-w-5xl space-y-6 py-8 sm:py-12">
      <Card padded={false}>
        <div className="ruled relative h-24 border-b border-line bg-surface-2 sm:h-28" aria-hidden><span className="absolute inset-y-0 left-8 w-px bg-danger/25" /></div>
        <div className="px-5 pb-8 sm:px-10">
          <div className="relative -mt-14 flex flex-col gap-5 sm:-mt-16 sm:flex-row sm:items-end">
            <img
              src={founderPhoto}
              alt="Khayrullo Isomiddinov"
              width="160"
              height="160"
              className="size-28 shrink-0 rounded-2xl bg-surface-3 object-cover ring-4 ring-surface sm:size-36"
            />
            <div className="min-w-0 sm:pb-1">
              <p className="label text-fg-subtle">Founder & developer</p>
              <h1 className="mt-2 text-3xl tracking-[-0.04em] text-fg sm:text-[2.6rem]">Khayrullo Isomiddinov</h1>
              <p className="serif text-xl text-fg-muted">call me Harry</p>
            </div>
          </div>

          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-fg">
            Computer Science graduate and software engineer. I love building things, and PeerPrep is one of them:
            a place where students can find each other, plan study sessions and prepare together.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button as="a" href={WEBSITE_URL} target="_blank" rel="noopener noreferrer">
              <FontAwesomeIcon icon={faGlobe} />
              khayrullo.com
            </Button>
            <Button as="a" href={GITHUB_PROFILE_URL} target="_blank" rel="noopener noreferrer" variant="secondary">
              <GitHubIcon />
              GitHub
            </Button>
            <Button as="a" href={`mailto:${EMAIL}`} variant="secondary">
              <FontAwesomeIcon icon={faEnvelope} />
              <span className="truncate">{EMAIL}</span>
            </Button>
          </div>
        </div>
      </Card>

      <Card id="contribute" padded={false} className="scroll-mt-24 p-5 sm:p-10">
        <h2 className="text-3xl tracking-[-0.04em] text-fg sm:text-4xl">Open to <span className="serif text-[1.1em]">contributors</span></h2>
        <p className="mt-2 max-w-3xl text-fg-muted">
          PeerPrep is open source, and help of any size is welcome, whether it's a typo fix, a bug report or a whole new feature.
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {WAYS_TO_HELP.map((way) => (
            <a
              key={way.title}
              href={way.href}
              target="_blank"
              rel="noopener noreferrer"
              className="card-hover group flex flex-col rounded-lg border border-line bg-surface p-5"
            >
              <FontAwesomeIcon icon={way.icon} className="text-fg-subtle" />
              <h3 className="mt-4 font-semibold text-fg">{way.title}</h3>
              <p className="mt-1 flex-1 text-sm text-fg-muted">{way.text}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-text">
                {way.cta}
                <FontAwesomeIcon icon={faArrowRight} className="text-xs transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:translate-x-1" />
              </span>
            </a>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-xl bg-surface-2 p-4 text-sm text-fg-muted sm:flex-row sm:items-center">
          <span className="flex-1">
            Not sure where to start? Email me at{" "}
            <a href={`mailto:${EMAIL}`} className="font-semibold text-accent-text hover:underline">{EMAIL}</a> and we'll find something that fits.
          </span>
          <Link to="/events" className="whitespace-nowrap font-semibold text-accent-text hover:underline">Or try PeerPrep first →</Link>
        </div>
      </Card>
    </div>
  )
}
