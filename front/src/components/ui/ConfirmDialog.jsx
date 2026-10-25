import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons"
import Button from "./Button"

// A modal "are you sure?" dialog. Set `requireText="DELETE"` to make the user type a word before confirming.
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  requireText,
  busy = false,
  onConfirm,
  onCancel,
}) {
  const [typed, setTyped] = useState("")
  const inputRef = useRef(null)
  const confirmRef = useRef(null)
  const cancelRef = useRef(onCancel)
  const busyRef = useRef(busy)

  useEffect(() => {
    cancelRef.current = onCancel
    busyRef.current = busy
  })

  // Reset and focus only when the dialog opens (callers often pass a new onCancel every render)
  useEffect(() => {
    if (!open) return
    setTyped("")
    const focusTarget = requireText ? inputRef.current : confirmRef.current
    focusTarget?.focus()
    const onKey = (e) => {
      if (e.key === "Escape" && !busyRef.current) cancelRef.current()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, requireText])

  if (!open) return null
  const canConfirm = !requireText || typed === requireText

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={() => !busy && onCancel()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-white text-xl" />
          </div>
          <div>
            <h3 id="confirm-dialog-title" className="text-xl font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600">This action cannot be undone</p>
          </div>
        </div>

        {description && <p className="text-gray-700 mb-4">{description}</p>}

        {requireText && (
          <label className="block mb-4 text-sm text-gray-700">
            Type <span className="font-mono font-bold">{requireText}</span> to confirm
            <input
              ref={inputRef}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="mt-2 w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-red-400 focus:outline-none font-mono"
              autoComplete="off"
            />
          </label>
        )}

        <div className="flex gap-3 mt-6">
          <Button ref={confirmRef} variant="danger" className="flex-1" loading={busy} disabled={!canConfirm} onClick={onConfirm}>
            {confirmLabel}
          </Button>
          <Button variant="muted" className="flex-1" disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
