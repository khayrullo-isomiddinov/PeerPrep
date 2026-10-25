import { useCallback, useMemo, useRef, useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCheckCircle, faCircleExclamation, faInfoCircle, faXmark } from "@fortawesome/free-solid-svg-icons"
import { ToastContext } from "./toastContext"

const DURATION_MS = { success: 4000, info: 5000, error: 7000 }
const STYLES = {
  success: { icon: faCheckCircle, accent: "text-green-500", border: "border-green-200" },
  error: { icon: faCircleExclamation, accent: "text-red-500", border: "border-red-200" },
  info: { icon: faInfoCircle, accent: "text-indigo-500", border: "border-indigo-200" },
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
      <div
        aria-live="polite"
        className="fixed top-20 right-4 left-4 sm:left-auto z-[10000] flex flex-col items-end gap-2 pointer-events-none"
      >
        {toasts.map((t) => {
          const style = STYLES[t.type]
          return (
            <div
              key={t.id}
              role={t.type === "error" ? "alert" : "status"}
              className={`pointer-events-auto w-full sm:w-96 flex items-start gap-3 bg-white border ${style.border} rounded-xl shadow-lg p-4`}
            >
              <FontAwesomeIcon icon={style.icon} className={`${style.accent} mt-0.5 flex-shrink-0`} />
              <p className="flex-1 text-sm text-gray-800">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
