import { cloneElement, isValidElement, useId } from "react"
import { controlClasses } from "./fieldStyles"

// Wraps one form control with a label, hint and error, and wires up the accessibility attributes.
// <Field label="Title" error={errors.title} hint="Shown on the card"><Input value=... /></Field>
export default function Field({ label, hint, error, required = false, optional = false, counter, className = "", children }) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const control = isValidElement(children)
    ? cloneElement(children, {
        id: children.props.id || id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": [hintId, errorId].filter(Boolean).join(" ") || undefined,
        required: required || undefined,
      })
    : children

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={children?.props?.id || id} className="text-sm font-semibold text-fg">
            {label}
            {required && <span className="text-danger ml-0.5" aria-hidden>*</span>}
            {optional && <span className="ml-1.5 font-normal text-fg-subtle">Optional</span>}
          </label>
          {counter}
        </div>
      )}
      {control}
      {hint && !error && <p id={hintId} className="text-xs text-fg-subtle">{hint}</p>}
      {error && <p id={errorId} role="alert" className="text-xs font-medium text-danger">{error}</p>}
    </div>
  )
}

export function Input({ className = "", ...props }) {
  return <input className={`${controlClasses} h-11 ${className}`} {...props} />
}

export function Textarea({ className = "", rows = 4, ...props }) {
  return <textarea rows={rows} className={`${controlClasses} py-2.5 resize-y min-h-24 ${className}`} {...props} />
}

export function Select({ className = "", children, ...props }) {
  return (
    <select className={`${controlClasses} h-11 pr-9 appearance-none bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat bg-[image:var(--select-chevron)] ${className}`} {...props}>
      {children}
    </select>
  )
}
