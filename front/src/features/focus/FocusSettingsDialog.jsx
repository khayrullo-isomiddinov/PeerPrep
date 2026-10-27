import { useState } from "react"
import Dialog from "../../components/ui/Dialog"
import Button from "../../components/ui/Button"
import Field, { Input } from "../../components/ui/Field"
import { SETTING_LIMITS } from "./focusTimerModel"

const LENGTHS = [
  { key: "focus", label: "Focus", unit: "Minutes" },
  { key: "short", label: "Short break", unit: "Minutes" },
  { key: "long", label: "Long break", unit: "Minutes" },
  { key: "longEvery", label: "Long break after", unit: "Focus blocks" },
]

function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3 hover:border-line-strong">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[var(--fg)]" />
      <span>
        <span className="block text-sm font-semibold text-fg">{label}</span>
        <span className="block text-xs text-fg-muted">{description}</span>
      </span>
    </label>
  )
}

// Mounted only while open, so it always starts from the saved settings
export default function FocusSettingsDialog({ settings, onSave, onClose }) {
  const [draft, setDraft] = useState(() => Object.fromEntries(LENGTHS.map(({ key }) => [key, String(settings[key])])))
  const [autoStart, setAutoStart] = useState(settings.autoStart)
  const [sound, setSound] = useState(settings.sound)

  const errors = Object.fromEntries(LENGTHS.map(({ key }) => {
    const [min, max] = SETTING_LIMITS[key]
    const n = Number(draft[key])
    return [key, Number.isInteger(n) && n >= min && n <= max ? "" : `Between ${min} and ${max}.`]
  }))
  const valid = Object.values(errors).every((e) => !e)

  function submit(e) {
    e.preventDefault()
    if (!valid) return
    onSave({ ...Object.fromEntries(LENGTHS.map(({ key }) => [key, Number(draft[key])])), autoStart, sound })
    onClose()
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Timer settings"
      description="Saved in this browser. A running or paused timer keeps its time; new lengths apply from the next phase."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="focus-settings" disabled={!valid}>Save</Button>
        </>
      }
    >
      <form id="focus-settings" onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          {LENGTHS.map(({ key, label, unit }) => (
            <Field key={key} label={label} error={errors[key]} hint={unit}>
              <Input
                type="number"
                inputMode="numeric"
                min={SETTING_LIMITS[key][0]}
                max={SETTING_LIMITS[key][1]}
                value={draft[key]}
                onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
              />
            </Field>
          ))}
        </div>
        <div className="space-y-2">
          <Toggle checked={autoStart} onChange={setAutoStart} label="Start the next phase automatically" description="Breaks and focus blocks follow each other without a tap." />
          <Toggle checked={sound} onChange={setSound} label="Play a chime when a phase ends" description="A short, quiet sound while PeerPrep is open in a tab." />
        </div>
      </form>
    </Dialog>
  )
}
