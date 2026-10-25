import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faSun, faMoon } from "@fortawesome/free-solid-svg-icons"
import { useTheme } from "../theme/themeContext"
import { THEME_OPTIONS } from "../theme/themeOptions"
import { Menu, MenuRadioItem } from "./ui/Menu"

// Navbar button: shows the active theme, opens a Light / Dark / System menu
export default function ThemeToggle() {
  const { preference, theme, setPreference } = useTheme()
  return (
    <Menu
      label={`Theme: ${preference === "system" ? `system (${theme})` : theme}`}
      width="w-44"
      buttonClassName="inline-grid size-10 place-items-center rounded-lg text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
      button={<FontAwesomeIcon icon={theme === "dark" ? faMoon : faSun} />}
    >
      {THEME_OPTIONS.map((option) => (
        <MenuRadioItem key={option.value} icon={option.icon} checked={preference === option.value} onSelect={() => setPreference(option.value)}>
          {option.label}
        </MenuRadioItem>
      ))}
    </Menu>
  )
}
