import { createRoot } from "react-dom/client"
import { useEffect, useState } from "react"

let toastRoot
let container

export function ensureToastContainer() {
  if (container) return
  container = document.createElement("div")
  container.id = "toast-root"
  container.style.position = "fixed"
  container.style.top = "16px"
  container.style.right = "16px"
  container.style.zIndex = 2000
  document.body.appendChild(container)
  toastRoot = createRoot(container)
  toastRoot.render(<ToastHost />)
}

export function toast(message, kind = "info", timeout = 3000) {
  ensureToastContainer()
  const event = new CustomEvent("toast:add", { detail: { id: crypto.randomUUID(), message, kind, timeout } })
  window.dispatchEvent(event)
}

function ToastHost() {
  const [items, setItems] = useState([])
  useEffect(() => {
    function onAdd(e) {
      const item = e.detail
      setItems(prev => [...prev, item])
      if (item.timeout) {
        setTimeout(() => setItems(prev => prev.filter(i => i.id !== item.id)), item.timeout)
      }
    }
    window.addEventListener("toast:add", onAdd)
    return () => window.removeEventListener("toast:add", onAdd)
  }, [])
  return (
    <div className="space-y-2">
      {items.map(i => (
        <div key={i.id} className={`rounded-lg px-3 py-2 text-sm shadow-2 ring-1 ${
          i.kind === "success" ? "bg-emerald-600/95 ring-emerald-400/30 text-white" :
          i.kind === "error" ? "bg-red-600/95 ring-red-400/30 text-white" :
          i.kind === "warning" ? "bg-amber-500/95 ring-amber-300/30 text-black" :
          "bg-slate-800/95 ring-white/10 text-white"
        }`}>
          {i.message}
        </div>
      ))}
    </div>
  )
}


