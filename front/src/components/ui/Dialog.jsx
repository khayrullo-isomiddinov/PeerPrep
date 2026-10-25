import { useEffect, useId, useRef } from "react"
import { createPortal } from "react-dom"
import { faXmark } from "@fortawesome/free-solid-svg-icons"
import IconButton from "./IconButton"

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Accessible modal: focus is trapped inside, Escape closes, page scroll is locked, and focus returns
// to the opener on close. Renders as a bottom sheet on phones and a centered panel from `sm` up.
export default function Dialog({ open, onClose, title, description, children, footer, size = "md", dismissible = true, initialFocusRef }) {
  const panelRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const dismissibleRef = useRef(dismissible)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    onCloseRef.current = onClose
    dismissibleRef.current = dismissible
  })

  useEffect(() => {
    if (!open) return
    const opener = document.activeElement
    const panel = panelRef.current
    const target = initialFocusRef?.current || panel?.querySelector(FOCUSABLE) || panel
    target?.focus()

    const { overflow } = document.body.style
    document.body.style.overflow = "hidden"

    function onKeyDown(e) {
      if (e.key === "Escape" && dismissibleRef.current) {
        e.stopPropagation()
        onCloseRef.current?.()
        return
      }
      if (e.key !== "Tab" || !panel) return
      const items = [...panel.querySelectorAll(FOCUSABLE)]
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = overflow
      opener?.focus?.()
    }
  }, [open, initialFocusRef])

  if (!open) return null

  const width = { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-2xl" }[size]

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-6">
      <div className="absolute inset-0 bg-[var(--scrim)] backdrop-blur-[2px] animate-fade-in" onClick={() => dismissible && onClose?.()} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={`relative w-full ${width} max-h-[92dvh] flex flex-col bg-surface border border-line shadow-overlay rounded-t-2xl sm:rounded-2xl animate-sheet-up focus:outline-none`}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line-strong sm:hidden" aria-hidden />
        {(title || dismissible) && (
          <div className="flex items-start justify-between gap-4 px-5 pt-4 sm:px-6 sm:pt-6">
            <div className="min-w-0">
              {title && <h2 id={titleId} className="text-lg font-semibold text-fg">{title}</h2>}
              {description && <p id={descriptionId} className="mt-1 text-sm text-fg-muted">{description}</p>}
            </div>
            {dismissible && <IconButton icon={faXmark} label="Close" size="sm" onClick={onClose} className="-mr-2 -mt-1" />}
          </div>
        )}
        <div className="overflow-y-auto px-5 py-4 sm:px-6">{children}</div>
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end sm:px-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
