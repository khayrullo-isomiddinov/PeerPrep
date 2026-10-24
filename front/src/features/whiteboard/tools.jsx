import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faArrowPointer, faHand, faPen, faHighlighter, faEraser, faFont, faNoteSticky } from "@fortawesome/free-solid-svg-icons"

const shapeIcon = (children) => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

export const TOOLS = [
  { id: "select", label: "Select & move", key: "V", icon: <FontAwesomeIcon icon={faArrowPointer} /> },
  { id: "hand", label: "Pan", key: "H", icon: <FontAwesomeIcon icon={faHand} /> },
  { id: "pen", label: "Pen", key: "P", icon: <FontAwesomeIcon icon={faPen} />, draws: true },
  { id: "highlighter", label: "Highlighter", key: "M", icon: <FontAwesomeIcon icon={faHighlighter} />, draws: true },
  { id: "eraser", label: "Eraser", key: "E", icon: <FontAwesomeIcon icon={faEraser} />, draws: true },
  { id: "rect", label: "Rectangle", key: "R", icon: shapeIcon(<rect x="4" y="5" width="16" height="14" rx="2" />), draws: true },
  { id: "ellipse", label: "Ellipse", key: "O", icon: shapeIcon(<ellipse cx="12" cy="12" rx="8.5" ry="6.5" />), draws: true },
  { id: "line", label: "Line", key: "L", icon: shapeIcon(<path d="M5 19 19 5" />), draws: true },
  { id: "arrow", label: "Arrow", key: "A", icon: shapeIcon(<path d="M5 19 19 5M10 5h9v9" />), draws: true },
  { id: "text", label: "Text", key: "T", icon: <FontAwesomeIcon icon={faFont} />, draws: true },
  { id: "note", label: "Sticky note", key: "N", icon: <FontAwesomeIcon icon={faNoteSticky} />, draws: true },
]
