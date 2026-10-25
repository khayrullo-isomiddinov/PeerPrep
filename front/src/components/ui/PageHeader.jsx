// Top of a page: optional eyebrow/breadcrumb, title, description and actions
export default function PageHeader({ eyebrow, title, description, actions, className = "" }) {
  return (
    <header className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 text-sm font-medium text-fg-subtle">{eyebrow}</div>}
        <h1 className="text-[2rem] leading-[1.05] tracking-[-0.04em] text-fg sm:text-[2.5rem]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>}
    </header>
  )
}
