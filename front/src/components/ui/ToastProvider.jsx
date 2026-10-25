import { useCallback, useMemo, useRef, useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCheckCircle, faCircleExclamation, faInfoCircle, faXmark } from "@fortawesome/free-solid-svg-icons"
import { ToastContext } from "./toastContext"

const DURATION_MS = { success: 4000, info: 5000, error: 7000 }
const STYLES = {
  success: { icon: faCheckCircle, accent: "text-success" },
  error: { icon: faCircleExclamation, accent: "text-danger" },
  info: { icon: faInfoCircle, accent: "text-accent-text" },
}

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const show = useCallback((type, message) => {
    if (!message) return
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    // Collapse repeats of the same message instead of stacking duplicates
    setToasts((list) => [...list.filter((t) => t.message !== message).slice(-3), { id, type, message }])
    timers.current.set(id, setTimeout(() => dismiss(id), DURATION_MS[type]))
  }, [dismiss])

  const toast = useMemo(() => ({
    success: (message) => show("success", message),
    error: (message) => show("error", message),
    info: (message) => show("info", message),
  }), [show])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Above the mobile tab bar on phones, top-right on larger screens */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+0.75rem)] z-[200] flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-auto sm:right-5 sm:top-20 sm:items-end"
      >
        {toasts.map((t) => {
          const style = STYLES[t.type]
          return (
            <div
              key={t.id}
              role={t.type === "error" ? "alert" : "status"}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-overlay animate-pop-in"
            >
              <FontAwesomeIcon icon={style.icon} className={`mt-0.5 shrink-0 ${style.accent}`} />
              <p className="flex-1 text-sm text-fg">{t.message}</p>
              <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss notification" className="shrink-0 text-fg-subtle hover:text-fg">
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
