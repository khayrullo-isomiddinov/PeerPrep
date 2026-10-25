// Shared button styling, also used for links styled as buttons
const VARIANTS = {
  // Ink on paper (paper on ink in dark mode)
  primary: "bg-accent text-accent-fg hover:bg-accent-hover",
  secondary: "bg-surface text-fg border border-line-strong hover:border-fg-subtle hover:bg-surface-2",
  soft: "bg-surface-2 text-fg hover:bg-surface-3",
  ghost: "text-fg-muted hover:text-fg hover:bg-surface-2",
  // The highlighter as a button, for the single most important action on a marketing page
  highlight: "bg-highlight text-[#141413] hover:brightness-95",
  danger: "bg-danger-solid text-white hover:brightness-110",
  "danger-soft": "border border-danger/30 text-danger hover:bg-danger-soft",
}

const SIZES = {
  sm: "h-8 pointer-coarse:h-10 px-3 text-[0.8125rem] gap-1.5 rounded-md",
  md: "h-10 pointer-coarse:h-11 px-4 text-sm gap-2 rounded-md",
  lg: "h-12 px-5 text-[0.9375rem] gap-2 rounded-lg",
}

export function buttonClasses({ variant = "primary", size = "md", className = "" } = {}) {
  return `inline-flex items-center justify-center font-medium whitespace-nowrap select-none transition-[background-color,border-color,color,filter,transform] duration-150 active:translate-y-px disabled:opacity-45 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] ${VARIANTS[variant]} ${SIZES[size]} ${className}`
}
