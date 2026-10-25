import { useMemo } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faDownload } from "@fortawesome/free-solid-svg-icons"
import Card from "../../../components/ui/Card"
import { fileIcon, formatFileSize } from "../../../utils/files"

function parseStudyMaterials(json) {
  if (!json) return []
  try {
    const parsed = JSON.parse(json)
    // Only uploaded files (data: URLs) become links; anything else, like a javascript: URL, is dropped
    return Array.isArray(parsed) ? parsed.filter((m) => typeof m?.data === "string" && m.data.startsWith("data:")) : []
  } catch {
    return []
  }
}

// `json` is the event's study_materials field: a JSON array of { name, type, size, data }
export default function StudyMaterials({ json }) {
  const materials = useMemo(() => parseStudyMaterials(json), [json])
  if (materials.length === 0) return null

  return (
    <Card padded={false}>
      <h2 className="px-5 pb-3 pt-5 font-semibold text-fg">
        Study materials <span className="font-normal text-fg-subtle">{materials.length}</span>
      </h2>
      <ul className="px-2 pb-3">
        {materials.map((material, index) => (
          <li key={`${material.name}-${index}`}>
            <a
              href={material.data}
              download={material.name}
              aria-label={`Download ${material.name}`}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-2"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-aqua-soft text-aqua">
                <FontAwesomeIcon icon={fileIcon(material.type)} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-fg">{material.name}</span>
                <span className="block text-xs text-fg-subtle">{formatFileSize(material.size)}</span>
              </span>
              <FontAwesomeIcon icon={faDownload} className="text-sm text-fg-subtle" />
            </a>
          </li>
        ))}
      </ul>
    </Card>
  )
}
