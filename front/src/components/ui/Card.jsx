const TONES = {
  default: "bg-surface border-line",
  success: "bg-success-soft/40 border-success/35",
  danger: "bg-surface border-danger/30",
}

// The standard surface panel. `padded={false}` for cards that manage their own inner layout.
// Use `tone` for colored variants rather than overriding colors with className.
export default function Card({ as = "section", padded = true, interactive = false, tone = "default", className = "", children, ...props }) {
  const Component = as
  return (
    <Component
      className={`border rounded-2xl shadow-card ${TONES[tone]} ${padded ? "p-5 sm:p-6" : "overflow-hidden"} ${
        interactive ? "transition-[border-color,box-shadow,transform] duration-200 hover:border-line-strong hover:shadow-raised" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </Component>
  )
}
