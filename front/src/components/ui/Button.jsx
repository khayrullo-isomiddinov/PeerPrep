import { buttonClasses } from "./buttonStyles"

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
      className={buttonClasses({ variant, size, className })}
      {...props}
    >
      {loading && <span className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden />}
      {children}
    </Component>
  )
}
