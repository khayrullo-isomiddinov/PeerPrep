import { useRef, useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faImage, faWandMagicSparkles, faTrash, faArrowsRotate } from "@fortawesome/free-solid-svg-icons"
import { generateCoverImage, getErrorMessage } from "../../../utils/api"
import { readAsDataUrl } from "../../../utils/files"
import SegmentedControl from "../../../components/ui/SegmentedControl"
import Button from "../../../components/ui/Button"
import { Textarea } from "../../../components/ui/Field"

const MAX_COVER_BYTES = 5 * 1024 * 1024

// Cover image: upload one or generate it with AI. `value` is a data/remote URL or null.
export default function CoverPicker({ value, onChange, onError }) {
  const [mode, setMode] = useState("upload")
  const [prompt, setPrompt] = useState("")
  const [generating, setGenerating] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  async function takeFile(file) {
    if (!file) return
    if (!file.type.startsWith("image/")) return onError("Choose an image file (JPG, PNG, GIF or WebP).")
    if (file.size > MAX_COVER_BYTES) return onError("Cover images must be smaller than 5 MB.")
    try {
      onChange(await readAsDataUrl(file))
    } catch (e) {
      onError(e.message)
    }
  }

  async function generate() {
    setGenerating(true)
    try {
      onChange(await generateCoverImage(prompt.trim()))
    } catch (e) {
      onError(getErrorMessage(e, "Couldn't generate an image. Try a different description."))
    } finally {
      setGenerating(false)
    }
  }

  if (value) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-line">
        <img src={value} alt="Cover preview" className="aspect-[16/7] w-full object-cover" />
        <div className="absolute right-2 top-2 flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => onChange(null)}>
            <FontAwesomeIcon icon={faArrowsRotate} />
            Replace
          </Button>
          <Button size="sm" variant="danger" onClick={() => onChange(null)} aria-label="Remove cover image">
            <FontAwesomeIcon icon={faTrash} />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <SegmentedControl
        label="Cover source"
        value={mode}
        onChange={setMode}
        options={[
          { value: "upload", label: "Upload", icon: <FontAwesomeIcon icon={faImage} /> },
          { value: "generate", label: "Generate with AI", icon: <FontAwesomeIcon icon={faWandMagicSparkles} /> },
        ]}
      />

      {mode === "upload" ? (
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
            takeFile(e.dataTransfer.files?.[0])
          }}
          className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors ${
            dragging ? "border-accent bg-accent-soft" : "border-line-strong hover:border-accent hover:bg-surface-2"
          }`}
        >
          <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent-text"><FontAwesomeIcon icon={faImage} /></span>
          <span className="text-sm font-semibold text-fg">Drop an image or click to browse</span>
          <span className="text-xs text-fg-subtle">JPG, PNG, GIF or WebP · up to 5 MB</span>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => takeFile(e.target.files?.[0])} />
        </button>
      ) : (
        <div className="space-y-3 rounded-xl border border-line bg-surface-2 p-4">
          <label className="block text-sm font-semibold text-fg" htmlFor="cover-prompt">Describe the image</label>
          <Textarea
            id="cover-prompt"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. A clean illustration of a chemistry lab with molecules and notebooks"
          />
          <Button onClick={generate} loading={generating} disabled={!prompt.trim()}>
            {!generating && <FontAwesomeIcon icon={faWandMagicSparkles} />}
            {generating ? "Generating… this can take ~20 seconds" : "Generate cover"}
          </Button>
        </div>
      )}
    </div>
  )
}
