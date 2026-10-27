import { useEffect } from "react"
import { useToast } from "../../components/ui/toastContext"
import { useNow } from "../../hooks/useNow"
import { playChime } from "./chime"
import { useFocus } from "./useFocus"

// Mounted once in the app shell: notices when the running phase ends, wherever you are in the app,
// logs it and plays the chime. Renders nothing.
export default function FocusWatcher() {
  const { timer, settings, actions } = useFocus()
  const toast = useToast()
  const running = timer.status === "running"
  const now = useNow(running ? 500 : null)

  useEffect(() => {
    if (!running || now < timer.endsAt) return
    const finished = actions.completeIfDue()
    if (!finished) return
    if (settings.sound) playChime()
    toast.info(finished.phase === "focus"
      ? `Focus block done: ${finished.minutes} minutes. Time for a break.`
      : "Break's over. Ready for the next focus block?")
  }, [running, now, timer.endsAt, actions, settings.sound, toast])

  return null
}
