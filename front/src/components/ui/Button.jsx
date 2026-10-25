const VARIANTS = {
  primary: "bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 text-white shadow-lg hover:shadow-xl",
  secondary: "bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50",
  muted: "bg-gray-100 text-gray-700 border-2 border-gray-300 hover:bg-gray-200",
  danger: "bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg hover:from-red-600 hover:to-pink-700 hover:shadow-xl",
  ghost: "text-gray-600 hover:bg-gray-100",
}

const SIZES = {
  sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
  md: "px-4 py-3 text-sm rounded-xl gap-2",
  lg: "px-8 py-4 text-base rounded-xl gap-2",
}

// <Button variant="primary" size="md" loading={busy}>Save</Button>
// Pass `as={Link}` (plus `to`) or `as="a"` to render a link that looks like a button.
export default function Button({
  as = "button",
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  className = "",
  children,
  ...props
}) {
  const Component = as
  const isButton = Component === "button"
  return (
    <Component
      {...(isButton && { type: props.type || "button", disabled: disabled || loading })}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden />}
      {children}
    </Component>
  )
}
