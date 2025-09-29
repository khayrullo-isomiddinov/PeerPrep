export default function Button({ children, variant = "primary", ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold transition focus:outline-none active:scale-[0.98]"

  const styles = {
    primary:
      "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500/60",
    secondary:
      "border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 focus:ring-2 focus:ring-slate-400/50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
  }

  return (
    <button className={`${base} ${styles[variant]}`} {...props}>
      {children}
    </button>
  )
}
