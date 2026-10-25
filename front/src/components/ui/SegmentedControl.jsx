// A row of mutually exclusive options (e.g. Upcoming / Live / Past), exposed as radio buttons
export default function SegmentedControl({ label, options, value, onChange, className = "" }) {
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex rounded-xl bg-surface-2 border border-line p-1 ${className}`}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 h-8 px-2.5 sm:px-3.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-[background-color,color,box-shadow] duration-150 ${
              selected ? "bg-surface text-fg shadow-card" : "text-fg-muted hover:text-fg"
            }`}
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
