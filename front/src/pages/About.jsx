import { useEffect } from "react"
import { useLocation, Link } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faGlobe, faEnvelope, faBug, faLightbulb, faCodePullRequest, faArrowRight, faHeart
} from "@fortawesome/free-solid-svg-icons"
import founderPhoto from "../images/founder.jpg"

const WEBSITE_URL = "https://www.khayrullo.com"
const EMAIL = "khayrullo2@outlook.com"
const GITHUB_PROFILE_URL = "https://github.com/khayrullo-isomiddinov"
const REPO_URL = "https://github.com/khayrullo-isomiddinov/PeerPrep"

function GitHubIcon({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  )
}

const WAYS_TO_HELP = [
  {
    icon: faBug,
    title: "Report a bug",
    text: "Found something broken? Open an issue with what happened and how to reproduce it.",
    href: `${REPO_URL}/issues`,
    cta: "Open an issue",
  },
  {
    icon: faLightbulb,
    title: "Suggest an idea",
    text: "Have a feature in mind that would make studying together better? I'd love to hear it.",
    href: `${REPO_URL}/issues`,
    cta: "Share an idea",
  },
  {
    icon: faCodePullRequest,
    title: "Contribute code",
    text: "Fork the repo, pick something to improve, and send a pull request. React + FastAPI.",
    href: REPO_URL,
    cta: "View the code",
  },
]

export default function About() {
  const { hash } = useLocation()

  // Support links like /about#contribute from the footer
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0)
      return
    }
    const el = document.getElementById(hash.slice(1))
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [hash])

  return (
    <div className="min-h-screen tap-safe bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50/30 route-transition">
      <div className="nav-spacer" />

      <div className="container-page section space-y-8 max-w-5xl">
        <section className="bg-white rounded-2xl shadow-xl border border-gray-200/60 overflow-hidden">
          <div className="h-24 sm:h-32 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600" />
          <div className="px-6 sm:px-10 pb-8 sm:pb-10">
            <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 -mt-14 sm:-mt-16">
              <img
                src={founderPhoto}
                alt="Khayrullo Isomiddinov"
                width="160"
                height="160"
                className="w-28 h-28 sm:w-40 sm:h-40 rounded-2xl object-cover border-4 border-white shadow-lg flex-shrink-0 bg-gray-100"
              />
              <div className="sm:pt-20 min-w-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 text-pink-600 text-xs font-semibold mb-3">
                  <FontAwesomeIcon icon={faHeart} className="w-3 h-3" />
                  Founder &amp; Developer
                </span>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Khayrullo Isomiddinov</h1>
                <p className="text-gray-500 mt-1">Call me Harry</p>
              </div>
            </div>

            <p className="text-gray-700 text-lg leading-relaxed mt-6 max-w-3xl">
              Computer Science graduate and software engineer. I love building things, and PeerPrep is one of them:
              a place where students can find each other, plan study sessions and prepare together.
            </p>

            <div className="flex flex-wrap gap-3 mt-6">
              <a
                href={WEBSITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold shadow-md hover:shadow-lg"
              >
                <FontAwesomeIcon icon={faGlobe} />
                khayrullo.com
              </a>
              <a
                href={GITHUB_PROFILE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800"
              >
                <GitHubIcon />
                GitHub
              </a>
              <a
                href={`mailto:${EMAIL}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:border-pink-300 hover:text-pink-600"
              >
                <FontAwesomeIcon icon={faEnvelope} />
                {EMAIL}
              </a>
            </div>
          </div>
        </section>

        <section id="contribute" className="scroll-mt-24 bg-white rounded-2xl shadow-xl border border-gray-200/60 p-6 sm:p-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Open to contributors</h2>
          <p className="text-gray-600 mt-2 max-w-3xl">
            PeerPrep is open source, and help of any size is welcome, whether it's a typo fix, a bug report or a whole new feature.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {WAYS_TO_HELP.map((way) => (
              <a
                key={way.title}
                href={way.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col p-5 rounded-xl border-2 border-gray-200 hover:border-purple-300 hover:shadow-lg bg-gradient-to-br from-white to-gray-50"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 text-white flex items-center justify-center mb-4">
                  <FontAwesomeIcon icon={way.icon} />
                </div>
                <h3 className="font-bold text-gray-900">{way.title}</h3>
                <p className="text-sm text-gray-600 mt-1 flex-1">{way.text}</p>
                <span className="mt-4 text-sm font-semibold text-purple-600 inline-flex items-center gap-1.5">
                  {way.cta}
                  <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </a>
            ))}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-purple-50 text-sm text-gray-700">
            <span className="flex-1">
              Not sure where to start? Email me at{" "}
              <a href={`mailto:${EMAIL}`} className="font-semibold text-purple-700 hover:underline">{EMAIL}</a>
              {" "}and we'll find something that fits.
            </span>
            <Link to="/events" className="font-semibold text-purple-700 hover:underline whitespace-nowrap">
              Or try PeerPrep first →
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
