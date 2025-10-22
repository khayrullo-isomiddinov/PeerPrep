export default function Card({ 
  children, 
  variant = "default", 
  hover = true,
  className = "" 
}) {
  const base = {
    default: "card",
    premium: "premium-card",
    surface: "surface",
    glass: "premium-glass",
  }

  const cls = [
    base[variant] || base.default,
    hover ? "premium-hover" : "",
    "inset-pad rounded-l shadow-1 transition-all",
    className
  ].join(" ")

  return <div className={cls}>{children}</div>
}
