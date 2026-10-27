import { useState } from "react"
import { useServerStatus } from "../hooks/useServerStatus"
import WakeUpPanel from "./ui/WakeUpPanel"

// Small floating card while the API wakes up, for pages that show skeletons rather than a full-page loader.
// Hidden while a PageLoader is already explaining the wait. Dismissing it lasts until the server is awake.
export default function ServerWakeNotice() {
  const { waking, since, inlineLoaders } = useServerStatus()
  const [dismissedFor, setDismissedFor] = useState(null)
  if (!waking || inlineLoaders > 0 || dismissedFor === since) return null

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+0.75rem)] z-[150] flex justify-center sm:inset-x-auto sm:bottom-5 sm:left-5 sm:justify-start">
      <div className="pointer-events-auto w-full max-w-sm rounded-xl border border-line bg-surface p-4 shadow-overlay animate-pop-in">
        <WakeUpPanel compact since={since} onDismiss={() => setDismissedFor(since)} />
      </div>
    </div>
  )
}
