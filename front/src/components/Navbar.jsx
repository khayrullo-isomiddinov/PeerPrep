import { useEffect, useState } from "react"
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faPlus, faUser, faArrowRightFromBracket, faCircleInfo, faBars, faXmark, faChevronDown
} from "@fortawesome/free-solid-svg-icons"
import { useAuth } from "../features/auth/authContextValue"
import { usePrefetchEvents } from "../hooks/useEvents"
import { usePrefetchProfile } from "../hooks/useProfile"
import Logo from "./Logo"
import ThemeToggle from "./ThemeToggle"
import Avatar from "./ui/Avatar"
import Button from "./ui/Button"
import { Menu, MenuItem, MenuSeparator } from "./ui/Menu"

const navLinkClass = ({ isActive }) =>
  `relative inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold transition-colors ${
    isActive ? "text-fg bg-surface-2" : "text-fg-muted hover:text-fg"
  }`

function AccountMenu({ user, onSignOut, onPrefetchProfile }) {
  const name = user.name || user.email.split("@")[0]
  return (
    <Menu
      label="Account menu"
      buttonClassName="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-surface-2"
      button={
        <>
          <Avatar name={user.name || user.email} src={user.photo_url} id={user.id} size="sm" />
          <span className="hidden max-w-32 truncate text-sm font-semibold text-fg lg:inline">{name}</span>
          <FontAwesomeIcon icon={faChevronDown} className="hidden text-[0.65rem] text-fg-subtle lg:inline" />
        </>
      }
    >
      <div className="px-2.5 py-2">
        <p className="truncate text-sm font-semibold text-fg">{name}</p>
        <p className="truncate text-xs text-fg-subtle">{user.email}</p>
      </div>
      <MenuSeparator />
      <MenuItem as={Link} to="/profile" icon={faUser} onMouseEnter={onPrefetchProfile}>Your profile</MenuItem>
      <MenuItem as={Link} to="/about" icon={faCircleInfo}>About PeerPrep</MenuItem>
      <MenuSeparator />
      <MenuItem icon={faArrowRightFromBracket} onSelect={onSignOut}>Sign out</MenuItem>
    </Menu>
  )
}

// Phones, signed out: a compact sheet with the public links
function GuestMobileMenu() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-grid size-10 place-items-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg"
      >
        <FontAwesomeIcon icon={open ? faXmark : faBars} />
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full border-b border-line bg-surface shadow-raised animate-pop-in">
          <nav className="page-container flex flex-col gap-1 py-3" aria-label="Main">
            <NavLink to="/events" className={navLinkClass}>Browse events</NavLink>
            <NavLink to="/about" className={navLinkClass}>About</NavLink>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button as={Link} to="/login" variant="secondary">Log in</Button>
              <Button as={Link} to="/register">Get started</Button>
            </div>
          </nav>
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const { prefetchEventList } = usePrefetchEvents()
  const prefetchProfile = usePrefetchProfile()

  function signOut() {
    logout()
    navigate("/", { replace: true })
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-xl supports-[backdrop-filter]:bg-canvas/70 pt-[env(safe-area-inset-top)]">
      <div className="page-container relative flex h-14 items-center gap-2 md:h-16">
        <Link to="/" className="mr-2 rounded-lg" aria-label="PeerPrep home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {isAuthenticated && <NavLink to="/" end className={navLinkClass}>Home</NavLink>}
          <NavLink to="/events" className={navLinkClass} onMouseEnter={() => prefetchEventList()}>Events</NavLink>
          {!isAuthenticated && <NavLink to="/about" className={navLinkClass}>About</NavLink>}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {/* Phones create from the tab bar; visibility lives on a wrapper so it can't clash with the button's display */}
          {isAuthenticated && (
            <div className="hidden md:block">
              <Button as={Link} to="/events/create" size="sm">
                <FontAwesomeIcon icon={faPlus} />
                New event
              </Button>
            </div>
          )}
          <ThemeToggle />
          {isAuthenticated && user ? (
            <AccountMenu user={user} onSignOut={signOut} onPrefetchProfile={() => prefetchProfile(user.id, { own: true })} />
          ) : (
            <>
              <div className="hidden items-center gap-2 md:flex">
                <Button as={Link} to="/login" variant="ghost" size="sm">Log in</Button>
                <Button as={Link} to="/register" size="sm">Get started</Button>
              </div>
              <GuestMobileMenu />
            </>
          )}
        </div>
      </div>
    </header>
  )
}
