import { useCallback, useEffect, useMemo, useState } from "react"
import { ThemeContext, THEME_PREFERENCES, THEME_STORAGE_KEY } from "./themeContext"

const META_COLORS = { light: "#F7F6F2", dark: "#0F0F0E" }
const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)")

function readPreference() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    return THEME_PREFERENCES.includes(saved) ? saved : "system"
  } catch {
    return "system"
  }
}

function applyTheme(theme) {
  const root = document.documentElement
  if (root.dataset.theme === theme) return
  // Switch instantly: briefly disable transitions so every color changes in the same frame
  root.classList.add("theme-switching")
  root.dataset.theme = theme
  root.style.colorScheme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", META_COLORS[theme])
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("theme-switching")))
}

export default function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(readPreference)
  const [systemDark, setSystemDark] = useState(() => darkQuery().matches)

  // Follow the OS setting live while the preference is "system"
  useEffect(() => {
    const query = darkQuery()
    const onChange = (e) => setSystemDark(e.matches)
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [])

  const theme = preference === "system" ? (systemDark ? "dark" : "light") : preference

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setPreference = useCallback((next) => {
    setPreferenceState(next)
    try {
      if (next === "system") localStorage.removeItem(THEME_STORAGE_KEY)
      else localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch { /* storage unavailable: the choice still applies for this visit */ }
  }, [])

  const value = useMemo(() => ({ preference, theme, setPreference }), [preference, theme, setPreference])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
