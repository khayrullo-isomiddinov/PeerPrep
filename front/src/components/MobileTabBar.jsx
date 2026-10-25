import { Link, useLocation } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faHouse, faCalendarDays, faPlus, faUser } from "@fortawesome/free-solid-svg-icons"

const TABS = [
  { to: "/", label: "Home", icon: faHouse, match: (p) => p === "/" },
  // Event pages (/events/5, /events/5/edit) belong to Events; creating one has its own tab
  { to: "/events", label: "Events", icon: faCalendarDays, match: (p) => p.startsWith("/events") && p !== "/events/create" },
  { to: "/events/create", label: "Create", icon: faPlus, primary: true, match: (p) => p === "/events/create" },
  { to: "/profile", label: "Profile", icon: faUser, match: (p) => p.startsWith("/profile") },
]

// Bottom navigation for signed-in users on phones and small tablets
export default function MobileTabBar() {
  const { pathname } = useLocation()
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 select-none border-t border-line bg-canvas/85 backdrop-blur-xl [-webkit-touch-callout:none] md:hidden pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid h-[var(--tabbar-h)] max-w-md grid-cols-4">
        {TABS.map((tab) => {
          const active = tab.match(pathname)
          return (
            <li key={tab.to} className="flex">
              <Link
                to={tab.to}
                aria-current={active ? "page" : undefined}
                className={`group flex flex-1 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors ${
                  active ? "text-fg" : "text-fg-subtle"
                }`}
              >
                <span
                  className={`grid h-7 w-12 place-items-center rounded-md transition-[background-color,transform] duration-200 group-active:scale-90 ${
                    tab.primary ? "bg-accent text-accent-fg" : active ? "bg-surface-3" : ""
                  }`}
                >
                  <FontAwesomeIcon icon={tab.icon} />
                </span>
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
