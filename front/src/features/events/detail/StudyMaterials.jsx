import { useMemo } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faFile, faDownload } from "@fortawesome/free-solid-svg-icons"

function parseStudyMaterials(json) {
  if (!json) return []
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function formatFileSize(bytes) {
  if (!bytes) return "Unknown size"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(type = "") {
  if (type.includes("pdf")) return "📄"
  if (type.includes("word") || type.includes("document")) return "📝"
  if (type.includes("excel") || type.includes("spreadsheet")) return "📊"
  if (type.includes("image")) return "🖼️"
  if (type.includes("video")) return "🎥"
  if (type.includes("audio")) return "🎵"
  if (type.includes("zip") || type.includes("archive")) return "📦"
  return "📎"
}

function download(material) {
  const link = document.createElement("a")
  link.href = material.data
  link.download = material.name
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// `json` is the event's study_materials field: a JSON array of { name, type, size, data }
export default function StudyMaterials({ json }) {
  const materials = useMemo(() => parseStudyMaterials(json), [json])
  if (materials.length === 0) return null

  return (
    <section className="bg-white rounded-2xl shadow-xl border border-gray-200/60 p-6 lg:p-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
          <FontAwesomeIcon icon={faFile} className="text-white text-xl" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Study Materials</h2>
          <p className="text-gray-600 text-sm">{materials.length} file{materials.length !== 1 ? "s" : ""} available</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {materials.map((material, index) => (
          <div
            key={`${material.name}-${index}`}
            className="group flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-lg flex items-center justify-center text-2xl shadow-md">
                {fileIcon(material.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{material.name}</p>
                <p className="text-xs text-gray-600">{formatFileSize(material.size)}</p>
              </div>
            </div>
            <button
              onClick={() => download(material)}
              className="ml-3 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 shadow-md hover:shadow-lg flex-shrink-0"
              title="Download file"
              aria-label={`Download ${material.name}`}
            >
              <FontAwesomeIcon icon={faDownload} className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
