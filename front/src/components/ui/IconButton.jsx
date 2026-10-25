import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"

const VARIANTS = {
  ghost: "text-fg-muted hover:text-fg hover:bg-surface-2",
  outline: "text-fg-muted hover:text-fg bg-surface border border-line hover:border-line-strong",
  danger: "text-fg-subtle hover:text-danger hover:bg-danger-soft",
}

const SIZES = { sm: "size-8 pointer-coarse:size-10 text-sm", md: "size-10 pointer-coarse:size-11 text-base" }

// Icon-only button; `label` is required because it is the button's accessible name
export default function IconButton({ icon, label, variant = "ghost", size = "md", className = "", ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      <FontAwesomeIcon icon={icon} />
    </button>
  )
}
