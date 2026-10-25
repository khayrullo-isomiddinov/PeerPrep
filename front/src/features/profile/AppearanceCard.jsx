import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useTheme } from "../../theme/themeContext"
import { THEME_OPTIONS } from "../../theme/themeOptions"
import Card from "../../components/ui/Card"
import SegmentedControl from "../../components/ui/SegmentedControl"

export default function AppearanceCard() {
  const { preference, setPreference } = useTheme()
  return (
    <Card>
      <h2 className="font-semibold text-fg">Appearance</h2>
      <p className="mt-1 text-sm text-fg-muted">System follows your device's light or dark setting.</p>
      <SegmentedControl
        label="Theme"
        value={preference}
        onChange={setPreference}
        className="mt-4 w-full"
        options={THEME_OPTIONS.map((o) => ({ value: o.value, label: o.label, icon: <FontAwesomeIcon icon={o.icon} className="text-xs" /> }))}
      />
    </Card>
  )
}
