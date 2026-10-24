import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faRotateLeft, faRotateRight, faTrashCan } from "@fortawesome/free-solid-svg-icons"
import { PEN_COLORS, NOTE_COLORS, STROKE_WIDTHS } from "./elements"
import { TOOLS } from "./tools"

function ToolButton({ active, disabled, onClick, title, children }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm transition-colors ${
        active
          ? "bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-md"
          : "text-gray-600 hover:bg-gray-100 disabled:opacity-35 disabled:hover:bg-transparent"
      }`}
    >
      {children}
    </button>
  )
}

export default function WhiteboardToolbar({
  tool, setTool, color, setColor, width, setWidth, noteColor, setNoteColor,
  readOnly, canUndo, canRedo, onUndo, onRedo, canDelete, onDelete
}) {
  const showStrokeOptions = ["pen", "highlighter", "rect", "ellipse", "line", "arrow", "text"].includes(tool)
  const showWidths = tool !== "text"

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 max-w-[calc(100%-24px)] pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-0.5 bg-white/95 backdrop-blur rounded-xl shadow-lg border border-gray-200 p-1 overflow-x-auto max-w-full">
        {TOOLS.map((t) => (
          <ToolButton
            key={t.id}
            title={`${t.label} (${t.key})`}
            active={tool === t.id}
            disabled={readOnly && t.draws}
            onClick={() => setTool(t.id)}
          >
            {t.icon}
          </ToolButton>
        ))}
        <div className="w-px h-6 bg-gray-200 mx-1 flex-shrink-0" />
        <ToolButton title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={onUndo}>
          <FontAwesomeIcon icon={faRotateLeft} />
        </ToolButton>
        <ToolButton title="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={onRedo}>
          <FontAwesomeIcon icon={faRotateRight} />
        </ToolButton>
        <ToolButton title="Delete selected (Del)" disabled={!canDelete} onClick={onDelete}>
          <FontAwesomeIcon icon={faTrashCan} />
        </ToolButton>
      </div>

      {!readOnly && (showStrokeOptions || tool === "note") && (
        <div className="pointer-events-auto flex items-center gap-1.5 bg-white/95 backdrop-blur rounded-xl shadow-lg border border-gray-200 px-2 py-1.5 overflow-x-auto max-w-full">
          {(tool === "note" ? NOTE_COLORS : PEN_COLORS).map((c) => {
            const selected = (tool === "note" ? noteColor : color) === c
            return (
              <button
                key={c}
                type="button"
                title={c}
                aria-label={`Color ${c}`}
                onClick={() => (tool === "note" ? setNoteColor(c) : setColor(c))}
                className={`w-6 h-6 rounded-full flex-shrink-0 border border-black/10 transition-transform ${selected ? "ring-2 ring-offset-2 ring-purple-500 scale-110" : "hover:scale-110"}`}
                style={{ backgroundColor: c }}
              />
            )
          })}
          {showStrokeOptions && showWidths && (
            <>
              <div className="w-px h-5 bg-gray-200 mx-1 flex-shrink-0" />
              {STROKE_WIDTHS.map((w) => (
                <button
                  key={w}
                  type="button"
                  title={`Thickness ${w}`}
                  aria-label={`Thickness ${w}`}
                  onClick={() => setWidth(w)}
                  className={`w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg ${width === w ? "bg-purple-100" : "hover:bg-gray-100"}`}
                >
                  <span className="rounded-full bg-gray-800" style={{ width: Math.min(w + 2, 16), height: Math.min(w + 2, 16) }} />
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
