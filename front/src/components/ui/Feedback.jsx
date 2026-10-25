import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"

export function Spinner({ className = "size-5", label = "Loading" }) {
  return (
    <span role="status" aria-label={label} className={`inline-block rounded-full border-2 border-line-strong border-t-fg animate-spin ${className}`} />
  )
}

// Placeholder block shown while content loads
export function Skeleton({ className = "" }) {
  return <div aria-hidden className={`rounded-lg bg-surface-3/70 animate-pulse ${className}`} />
}

// Full-area loading state for pages
export function PageLoader({ label = "Loading" }) {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <Spinner className="size-8" label={label} />
    </div>
  )
}

// What to show when there's nothing yet, with the next useful action
export function EmptyState({ icon, title, description, action, className = "" }) {
  return (
    <div className={`flex flex-col items-center text-center px-6 py-12 sm:py-16 ${className}`}>
      {icon && (
        <FontAwesomeIcon icon={icon} className="mb-4 text-xl text-fg-subtle" />
      )}
      <h3 className="text-lg tracking-[-0.02em] text-fg">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  )
}
