import { Link } from "react-router-dom"
import { useEffect, useRef, useState } from "react"
import SearchBar from "./SearchBar"

/* Small, self-contained language dropdown */
function LanguageDropdown({ onChange }) {
  const [open, setOpen] = useState(false)
  const [lang, setLang] = useState("en")
  const btnRef = useRef(null)
  const menuRef = useRef(null)

  const LANGS = [
    { code: "en", label: "English" },
    { code: "de", label: "Deutsch" },
    { code: "hu", label: "Magyar" },
  ]

  // Initialize from localStorage or browser
  useEffect(() => {
    const saved = localStorage.getItem("lang")
    if (saved) {
      setLang(saved)
      onChange?.(saved)
    } else {
      const guess = (navigator.language || "en").slice(0, 2)
      const supported = LANGS.some(l => l.code === guess) ? guess : "en"
      setLang(supported)
      onChange?.(supported)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => {
      if (
        !btnRef.current?.contains(e.target) &&
        !menuRef.current?.contains(e.target)
      ) {
        setOpen(false)
      }
    }
    const onEsc = (e) => e.key === "Escape" && setOpen(false)
    document.addEventListener("mousedown", onDocClick)
    document.addEventListener("keydown", onEsc)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      document.removeEventListener("keydown", onEsc)
    }
  }, [open])

  const selectLang = (code) => {
    setLang(code)
    localStorage.setItem("lang", code)
    onChange?.(code)
    setOpen(false)
  }

  const current = LANGS.find(l => l.code === lang)?.label ?? "English"

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className={[
          "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
          "border border-slate-300/70 bg-white/70 backdrop-blur",
          // ⬇️ Light mode: gentle hover background + readable text
          "hover:bg-slate-100 hover:text-slate-900 active:scale-[0.98]",
          // ⬇️ Dark mode: never go white on hover
          "dark:border-slate-600/60 dark:bg-slate-800/90 dark:text-slate-100",
          "dark:hover:!bg-slate-700 dark:hover:!text-slate-100"
        ].join(" ")}
        title="Change language"
      >
        {/* tiny globe icon (no extra deps) */}
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2m0 2c1.93 0 3.68.71 5.03 1.88H6.97A7.94 7.94 0 0 1 12 4m-7.46 6c.1-1.11.47-2.14 1.05-3.03h12.82c.58.89.95 1.92 1.05 3.03zM4.54 14h14.92a7.96 7.96 0 0 1-1.05 3.03H5.59A7.96 7.96 0 0 1 4.54 14M12 20a7.94 7.94 0 0 1-5.03-1.88h10.06A7.94 7.94 0 0 1 12 20Z"
          />
        </svg>
        <span className="font-medium">{current}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M7 10l5 5 5-5z" />
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          className={[
            "absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border z-50",
            "border-slate-200/80 bg-white shadow-lg ring-1 ring-black/5",
            "dark:border-slate-700 dark:bg-slate-800 dark:shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
          ].join(" ")}
        >
          {LANGS.map(({ code, label }) => (
            <button
              key={code}
              role="menuitem"
              onClick={() => selectLang(code)}
              className={[
                "w-full text-left px-3 py-2 text-sm transition",
                // Base text color per item (don’t inherit parent hovers)
                "text-slate-700 dark:text-slate-100",
                // Hover only changes bg; keep text explicit
                "hover:bg-slate-100 focus:bg-slate-100 hover:text-slate-900 focus:text-slate-900",
                "dark:hover:bg-slate-700/60 dark:focus:bg-slate-700/60 dark:hover:text-slate-100 dark:focus:text-slate-100",
                code === lang
                  ? "font-semibold text-[--color-accent] dark:text-[--color-accent-dark]"
                  : "opacity-90"
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const [hidden, setHidden] = useState(false)
  const lastY = useRef(0)
  const buffer = 80

  useEffect(() => {
    let ticking = false
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const y = window.scrollY || 0
          const diff = y - lastY.current

          if (y < 12) {
            setHidden(false)
          } else if (diff > buffer) {
            setHidden(true)
            lastY.current = y
          } else if (diff < -buffer / 2) {
            setHidden(false)
            lastY.current = y
          }

          ticking = false
        })
        ticking = true
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={[
        "sticky top-0 z-30 will-change-transform",
        "bg-[color-mix(in_srgb,var(--color-bg-light)_90%,#ffffff_10%)]",
        "dark:bg-[color-mix(in_srgb,var(--color-bg-dark)_90%,#000000_10%)]",
        "shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.5)]",
        "transition-[transform,opacity,background-color,box-shadow] duration-600 ease-in-out",
        hidden ? "-translate-y-[110%] opacity-0" : "translate-y-0 opacity-100",
      ].join(" ")}
    >
      <nav className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 py-5">
        {/* left brand */}
        <Link
          to="/"
          className="flex items-center gap-2 font-bold text-[--color-accent] dark:text-[--color-accent-dark]"
        >
          <span className="inline-block h-6 w-6 rounded-md bg-[--color-accent] dark:bg-[--color-accent-dark]" />
          StudyHub
        </Link>

        {/* center nav */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          <Link className="opacity-80 hover:opacity-100" to="/groups">Groups</Link>
          <Link className="opacity-80 hover:opacity-100" to="/events">Events</Link>
        </div>

        {/* right: search + language + profile */}
        <div className="flex items-center gap-3">
          <SearchBar onSearch={(p) => console.log("search:", p)} />
          <LanguageDropdown onChange={(code) => console.log("lang:", code)} />

          {/* Profile avatar icon */}
          <Link to="/profile" className="ml-2">
            <img
              src="https://ui-avatars.com/api/?name=User&background=6366f1&color=fff"
              alt="Profile"
              className="h-9 w-9 rounded-full border border-slate-300 dark:border-slate-600 object-cover hover:opacity-90 transition"
            />
            <span className="sr-only">Profile</span>
          </Link>
        </div>
      </nav>
    </header>
  )
}
