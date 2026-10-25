import { useRef, useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPaperclip, faXmark } from "@fortawesome/free-solid-svg-icons"
import { fileIcon, formatFileSize, readAsDataUrl } from "../../../utils/files"

const MAX_FILE_BYTES = 10 * 1024 * 1024

// Study materials attached to the event: [{ name, type, size, data }]
export default function MaterialsPicker({ value, onChange, onError }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  async function addFiles(fileList) {
    const added = []
    for (const file of Array.from(fileList || [])) {
      if (file.size > MAX_FILE_BYTES) {
        onError(`${file.name} is larger than 10 MB.`)
        continue
      }
      try {
        added.push({ name: file.name, type: file.type, size: file.size, data: await readAsDataUrl(file) })
      } catch (e) {
        onError(e.message)
      }
    }
    if (added.length) onChange([...value, ...added])
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {value.map((file, index) => (
            <li key={`${file.name}-${index}`} className="flex items-center gap-3 px-3 py-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-aqua-soft text-aqua"><FontAwesomeIcon icon={fileIcon(file.type)} /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-fg">{file.name}</span>
                <span className="block text-xs text-fg-subtle">{formatFileSize(file.size)}</span>
              </span>
              <button
                type="button"
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                aria-label={`Remove ${file.name}`}
                className="grid size-8 place-items-center rounded-md text-fg-subtle hover:bg-danger-soft hover:text-danger"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          addFiles(e.dataTransfer.files)
        }}
        className={`flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 text-sm font-semibold transition-colors ${
          dragging ? "border-accent bg-accent-soft text-accent-text" : "border-line-strong text-fg-muted hover:border-accent hover:text-fg"
        }`}
      >
        <FontAwesomeIcon icon={faPaperclip} />
        {value.length ? "Attach more files" : "Attach notes, slides or past papers"}
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
      </button>
      <p className="text-xs text-fg-subtle">Up to 10 MB per file. Members can download them from the event page.</p>
    </div>
  )
}
