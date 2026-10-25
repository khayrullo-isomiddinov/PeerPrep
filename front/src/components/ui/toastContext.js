import { createContext, useContext } from "react"

export const ToastContext = createContext(null)

// toast.success("Saved"), toast.error("Something failed"), toast.info("Heads up")
export function useToast() {
  const toast = useContext(ToastContext)
  if (!toast) throw new Error("useToast must be used inside <ToastProvider>")
  return toast
}
