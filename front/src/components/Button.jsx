export default function Button({
  children,
  variant = "primary",
  block = false,
  loading = false,
  className = "",
  ...props
}) {
  const variants = {
    primary: "btn",
    secondary: "btn-secondary",
    cta: "cta",
    premium: "premium-btn",
    glass: "premium-glass",
    ghost: "ghost",
  }

  const cls = [
    variants[variant] || variants.primary,
    block ? "w-full" : "",
    "premium-focus disabled:opacity-60 disabled:cursor-not-allowed tap-safe",
    className,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <button className={cls} disabled={loading || props.disabled} {...props}>
      {loading && (
        <span className="inline-flex items-center mr-2">
          <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-transparent" />
        </span>
      )}
      <span>{children}</span>
    </button>
  )
}
