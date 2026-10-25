// Shared button styling, also used for links styled as buttons
const VARIANTS = {
  primary: "bg-accent text-accent-fg shadow-card hover:bg-accent-hover",
  secondary: "bg-surface text-fg border border-line-strong hover:bg-surface-2",
  soft: "bg-accent-soft text-accent-text hover:bg-accent-soft/70",
  ghost: "text-fg-muted hover:text-fg hover:bg-surface-2",
  danger: "bg-danger-solid text-white shadow-card hover:brightness-110",
  // White button for use on the brand gradient, in both themes
  inverse: "bg-white text-[#0A1124] shadow-raised hover:bg-white/90",
  "danger-soft": "bg-danger-soft text-danger hover:brightness-95 dark:hover:brightness-125",
}

const SIZES = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-md",
  md: "h-10 px-4 text-sm gap-2 rounded-lg",
  lg: "h-12 px-6 text-base gap-2 rounded-xl",
}

export function buttonClasses({ variant = "primary", size = "md", className = "" } = {}) {
  return `inline-flex items-center justify-center font-semibold whitespace-nowrap select-none transition-[background-color,color,box-shadow,filter,transform] duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] ${VARIANTS[variant]} ${SIZES[size]} ${className}`
}
