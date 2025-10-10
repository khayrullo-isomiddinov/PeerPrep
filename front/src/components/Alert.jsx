export default function Alert({ kind = "info", title, children }) {
  const kindMap = {
    info: {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      ring: "ring-blue-200/60 dark:ring-blue-800/40",
      text: "text-blue-900 dark:text-blue-200",
    },
    success: {
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      ring: "ring-emerald-200/60 dark:ring-emerald-800/40",
      text: "text-emerald-900 dark:text-emerald-200",
    },
    warning: {
      bg: "bg-amber-50 dark:bg-amber-900/20",
      ring: "ring-amber-200/60 dark:ring-amber-800/40",
      text: "text-amber-900 dark:text-amber-200",
    },
    error: {
      bg: "bg-red-50 dark:bg-red-900/20",
      ring: "ring-red-200/60 dark:ring-red-800/40",
      text: "text-red-900 dark:text-red-200",
    },
  }
  const c = kindMap[kind] || kindMap.info
  return (
    <div className={`rounded-lg ${c.bg} ring-1 ${c.ring} px-3 py-2`}> 
      {title && <div className={`font-semibold text-sm ${c.text}`}>{title}</div>}
      {children && <div className="text-sm opacity-90">{children}</div>}
    </div>
  )
}


