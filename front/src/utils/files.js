import {
  faFilePdf, faFileWord, faFileExcel, faFileImage, faFileVideo, faFileAudio, faFileZipper, faFile,
} from "@fortawesome/free-solid-svg-icons"

export function formatFileSize(bytes) {
  if (!bytes) return "Unknown size"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function fileIcon(type = "") {
  if (type.includes("pdf")) return faFilePdf
  if (type.includes("word") || type.includes("document")) return faFileWord
  if (type.includes("excel") || type.includes("spreadsheet")) return faFileExcel
  if (type.includes("image")) return faFileImage
  if (type.includes("video")) return faFileVideo
  if (type.includes("audio")) return faFileAudio
  if (type.includes("zip") || type.includes("archive")) return faFileZipper
  return faFile
}

export function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error(`Couldn't read ${file.name}`))
    reader.readAsDataURL(file)
  })
}
