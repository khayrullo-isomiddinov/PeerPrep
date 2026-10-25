import { createContext, useContext, useEffect, useId, useRef, useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCheck } from "@fortawesome/free-solid-svg-icons"

const MenuContext = createContext(null)
const ITEM_SELECTOR = '[role="menuitem"], [role="menuitemradio"]'

// Dropdown menu with keyboard support (arrows, Home/End, Escape) and click-outside to close.
// <Menu label="Account" button={<Avatar .../>}><MenuItem onSelect={...}>Sign out</MenuItem></Menu>
export function Menu({ label, button, buttonClassName = "", align = "end", width = "w-56", children }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const listRef = useRef(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector(ITEM_SELECTOR)?.focus()
    function onPointerDown(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open])

  function close({ restoreFocus = true } = {}) {
    setOpen(false)
    if (restoreFocus) buttonRef.current?.focus()
  }

  function onKeyDown(e) {
    const items = [...(listRef.current?.querySelectorAll(ITEM_SELECTOR) || [])]
    const index = items.indexOf(document.activeElement)
    const focusAt = (i) => items[(i + items.length) % items.length]?.focus()
    if (e.key === "ArrowDown") { e.preventDefault(); focusAt(index + 1) }
    else if (e.key === "ArrowUp") { e.preventDefault(); focusAt(index - 1) }
    else if (e.key === "Home") { e.preventDefault(); focusAt(0) }
    else if (e.key === "End") { e.preventDefault(); focusAt(items.length - 1) }
    else if (e.key === "Escape") { e.preventDefault(); close() }
    else if (e.key === "Tab") setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) { e.preventDefault(); setOpen(true) }
        }}
        className={buttonClassName}
      >
        {button}
      </button>
      {open && (
        <MenuContext.Provider value={{ close }}>
          <div
            ref={listRef}
            id={menuId}
            role="menu"
            aria-label={label}
            onKeyDown={onKeyDown}
            className={`absolute z-50 mt-2 ${align === "end" ? "right-0" : "left-0"} ${width} rounded-xl border border-line bg-surface p-1.5 shadow-overlay animate-pop-in origin-top`}
          >
            {children}
          </div>
        </MenuContext.Provider>
      )}
    </div>
  )
}

const itemClasses =
  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-fg text-left transition-colors hover:bg-surface-2 focus:bg-surface-2 focus:outline-none"

// A menu row. Pass `as={Link}` + `to` for navigation, or `onSelect` for an action.
export function MenuItem({ as = "button", icon, onSelect, danger = false, children, ...props }) {
  const { close } = useContext(MenuContext)
  const Component = as
  return (
    <Component
      role="menuitem"
      tabIndex={-1}
      {...(Component === "button" && { type: "button" })}
      className={`${itemClasses} ${danger ? "text-danger" : ""}`}
      onClick={() => {
        onSelect?.()
        close({ restoreFocus: false })
      }}
      {...props}
    >
      {icon && <FontAwesomeIcon icon={icon} className={`w-4 ${danger ? "" : "text-fg-subtle"}`} />}
      {children}
    </Component>
  )
}

// One choice in a group of options (e.g. theme)
export function MenuRadioItem({ checked, icon, onSelect, children }) {
  const { close } = useContext(MenuContext)
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={checked}
      tabIndex={-1}
      className={itemClasses}
      onClick={() => {
        onSelect()
        close({ restoreFocus: false })
      }}
    >
      {icon && <FontAwesomeIcon icon={icon} className="w-4 text-fg-subtle" />}
      <span className="flex-1">{children}</span>
      {checked && <FontAwesomeIcon icon={faCheck} className="text-accent-text text-xs" />}
    </button>
  )
}

export function MenuLabel({ children }) {
  return <div className="px-2.5 pb-1 pt-2 text-[0.7rem] font-semibold uppercase tracking-wider text-fg-subtle">{children}</div>
}

export function MenuSeparator() {
  return <div role="separator" className="my-1.5 h-px bg-line" />
}
