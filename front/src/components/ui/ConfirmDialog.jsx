import { useEffect, useRef, useState } from "react"
import Dialog from "./Dialog"
import Button from "./Button"
import { Input } from "./Field"

// "Are you sure?" for destructive actions. `requireText="DELETE"` makes the user type a word first.
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
  const cancelRef = useRef(null)

  useEffect(() => {
    if (open) setTyped("")
  }, [open])

  const canConfirm = !requireText || typed === requireText

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      description="This can't be undone."
      size="sm"
      dismissible={!busy}
      initialFocusRef={requireText ? inputRef : cancelRef}
      footer={
        <>
          <Button ref={cancelRef} variant="secondary" disabled={busy} onClick={onCancel}>{cancelLabel}</Button>
          <Button variant="danger" loading={busy} disabled={!canConfirm} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      {description && <div className="text-sm text-fg-muted">{description}</div>}
      {requireText && (
        <label className="mt-4 block text-sm text-fg">
          Type <span className="font-mono font-semibold">{requireText}</span> to confirm
          <Input
            ref={inputRef}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            className="mt-2 font-mono"
          />
        </label>
      )}
    </Dialog>
  )
}
