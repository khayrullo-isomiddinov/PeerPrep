import { createContext, useContext } from "react"

export const THEME_STORAGE_KEY = "peerprep-theme"
export const THEME_PREFERENCES = ["light", "dark", "system"]

export const ThemeContext = createContext(null)

// { preference: "light" | "dark" | "system", theme: "light" | "dark", setPreference }
export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error("useTheme must be used inside <ThemeProvider>")
  return value
}
