// Shared styling for text inputs, textareas and selects: the border darkens on focus, no glow
export const controlClasses =
  "w-full rounded-md border border-line-strong bg-surface text-fg text-base sm:text-[0.9375rem] px-3 transition-[border-color,box-shadow] duration-150 " +
  "placeholder:text-fg-subtle hover:border-fg-subtle " +
  "focus:outline-none focus:border-fg focus:ring-[3px] focus:ring-fg/[0.07] " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/15 " +
  "disabled:bg-surface-2 disabled:text-fg-subtle disabled:cursor-not-allowed"
