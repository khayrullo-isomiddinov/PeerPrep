import { useState, useEffect, useRef } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faTimes, faCalendarAlt, faMapMarkerAlt, faUsers, faSave, faExclamationTriangle, faImage, faUpload, faWandMagicSparkles } from "@fortawesome/free-solid-svg-icons"
import { useAuth } from "../auth/AuthContext"
import { generateCoverImage } from "../../utils/api"

export default function EditEventForm({ event, onUpdate, onCancel }) {
  const { isAuthenticated } = useAuth()
  const [form, setForm] = useState({
    title: "",
    starts_at: "",
    location: "",
    capacity: 10,
    description: "",
    exam: "",
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [coverImageFile, setCoverImageFile] = useState(null)
  const [coverImagePreview, setCoverImagePreview] = useState(null)
  const [coverMode, setCoverMode] = useState("upload")
  const [aiPrompt, setAiPrompt] = useState("")
  const [generatingCover, setGeneratingCover] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
  if (!event) return

  // Parse UTC date correctly (backend sends UTC)
  const parseUTCDate = (dateString) => {
    if (!dateString) return null
    // If already has timezone info, use as-is
    if (dateString.includes('Z') || dateString.includes('+') || dateString.match(/-\d{2}:\d{2}$/)) {
      return new Date(dateString)
    }
    // Otherwise, treat as UTC by appending 'Z'
    return new Date(dateString + 'Z')
  }

  const date = parseUTCDate(event.starts_at)
  if (!date || isNaN(date.getTime())) {
    setForm({
      title: event.title || "",
      starts_at: "",
      location: event.location || "",
      capacity: event.capacity || 10,
      description: event.description || "",
      exam: event.exam || "",
    })
    return
  }

  // Format in local time for datetime-local input (not UTC!)
  // datetime-local expects YYYY-MM-DDTHH:mm in local timezone
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const localDateTime = `${year}-${month}-${day}T${hours}:${minutes}`

  setForm({
    title: event.title || "",
    starts_at: localDateTime,
    location: event.location || "",
    capacity: event.capacity || 10,
    description: event.description || "",
    exam: event.exam || "",
  })
}, [event])

  function handleChange(e) {
    const { name, value, type } = e.target
    const v = type === "number" ? (parseInt(value) || 0) : value
    setForm(prev => ({ ...prev, [name]: v }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }))
  }

  function validateForm() {
    const next = {}
    if (!form.title.trim()) next.title = "Event title is required"
    else if (form.title.length > 200) next.title = "Max 200 characters"
    if (!form.location.trim()) next.location = "Location is required"
    if (!form.starts_at) next.starts_at = "Start date and time is required"
    else if (new Date(form.starts_at) <= new Date()) next.starts_at = "Event must be in the future"
    if (form.capacity < 1 || form.capacity > 1000) next.capacity = "Capacity must be 1–1000"
    if (form.description && form.description.length > 1000) next.description = "Max 1000 characters"
    if (form.exam && form.exam.length > 100) next.exam = "Max 100 characters"
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleCoverImageChange(e) {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, coverImage: "Image must be less than 5MB" }))
        return
      }
      setCoverImageFile(file)
      setCoverImagePreview(URL.createObjectURL(file))
      if (errors.coverImage) setErrors(prev => ({ ...prev, coverImage: "" }))
    }
  }

  async function handleGenerateCoverImage() {
    if (!aiPrompt.trim()) {
      setErrors(prev => ({ ...prev, coverImage: "Please enter a prompt to generate an image" }))
      return
    }

    setGeneratingCover(true)
    setErrors(prev => ({ ...prev, coverImage: "" }))
    try {
      const imageUrl = await generateCoverImage(aiPrompt.trim())
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const file = new File([blob], "ai-generated-cover.png", { type: "image/png" })
      setCoverImageFile(file)
      setCoverImagePreview(URL.createObjectURL(file))
    } catch (e) {
      setErrors(prev => ({ ...prev, coverImage: e?.response?.data?.detail || "Failed to generate image. Please try again." }))
    } finally {
      setGeneratingCover(false)
    }
  }

  async function submit(e) {
    e.preventDefault()
    if (!isAuthenticated) {
      setErrors({ submit: "You must be logged in to edit events" })
      return
    }
    if (!validateForm()) return
    setLoading(true)
    try {
      // form.starts_at is in format "YYYY-MM-DDTHH:mm" (local time, no timezone)
      // new Date() interprets it as local time, then toISOString() converts to UTC
      const local = new Date(form.starts_at)
      const utcIso = local.toISOString()

      const payload = {
        title: form.title.trim(),
        starts_at: utcIso,  // UTC ISO string for backend
        location: form.location.trim(),
        capacity: form.capacity,
        description: form.description.trim() || null,
        exam: form.exam.trim() || null,
      }

      // If a new cover image was selected, convert it to base64
      if (coverImageFile) {
        const reader = new FileReader()
        await new Promise((resolve, reject) => {
          reader.onload = () => {
            payload.cover_image_url = reader.result
            resolve()
          }
          reader.onerror = reject
          reader.readAsDataURL(coverImageFile)
        })
      }

      await onUpdate(event.id, payload)
    } catch (err) {
      const message = err?.response?.data?.detail || err?.response?.data?.message || "Failed to update event"
      setErrors({ submit: message })
    } finally {
      setLoading(false)
    }
  }

  if (!event) return null

  return (
    <div className="fixed inset-0 z-above-nav bg-black/50 overflow-y-auto overscroll-contain">
      <div className="min-h-screen py-8 px-4 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden">
          <div className="sticky top-0 z-10 px-6 py-4 bg-white border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-3">
                <span className="px-3 py-1 bg-pink-100 text-pink-700 text-sm font-medium rounded-full">Edit</span>
                <h2 className="text-2xl font-bold text-gray-900">Update Event</h2>
              </div>
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>

          <div className="max-h-[78vh] overflow-y-auto px-6 pb-6 pt-4">
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="inline-flex items-center gap-2 text-red-600">
                  <FontAwesomeIcon icon={faExclamationTriangle} />
                  <span className="font-medium">{errors.submit}</span>
                </div>
              </div>
            )}

            <form onSubmit={submit} className="space-y-8">
              <section className="bg-gray-50 rounded-xl p-6 space-y-6">
                <div className="inline-flex items-center gap-3">
                  <FontAwesomeIcon icon={faCalendarAlt} className="w-5 h-5 text-pink-500" />
                  <h3 className="text-xl font-bold text-gray-900">Basic Information</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Event Title *</label>
                    <input
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-gray-900 bg-white ${errors.title ? 'border-red-300' : 'border-gray-300'
                        }`}
                      placeholder="e.g., Study Session for Midterm"
                      maxLength={200}
                    />
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>Clear and descriptive</span>
                      <span className={form.title.length > 180 ? "text-orange-600" : ""}>{form.title.length}/200</span>
                    </div>
                    {errors.title && <div className="text-red-600 text-sm">{errors.title}</div>}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Start Date & Time *</label>
                    <input
                      type="datetime-local"
                      name="starts_at"
                      value={form.starts_at}
                      onChange={handleChange}
                      min={new Date().toISOString().slice(0, 16)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-gray-900 bg-white ${errors.starts_at ? 'border-red-300' : 'border-gray-300'
                        }`}
                    />
                    {errors.starts_at && <div className="text-red-600 text-sm">{errors.starts_at}</div>}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Location *</label>
                    <input
                      name="location"
                      value={form.location}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-gray-900 bg-white ${errors.location ? 'border-red-300' : 'border-gray-300'
                        }`}
                      placeholder="e.g., Library Room 201"
                    />
                    {errors.location && <div className="text-red-600 text-sm">{errors.location}</div>}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Capacity *</label>
                    <input
                      type="number"
                      name="capacity"
                      value={form.capacity}
                      onChange={handleChange}
                      min="1"
                      max="1000"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-gray-900 bg-white ${errors.capacity ? 'border-red-300' : 'border-gray-300'
                        }`}
                    />
                    {errors.capacity && <div className="text-red-600 text-sm">{errors.capacity}</div>}
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Description</label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-gray-900 bg-white ${errors.description ? 'border-red-300' : 'border-gray-300'
                        }`}
                      placeholder="What will happen at this event?"
                      rows={4}
                      maxLength={1000}
                    />
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>Help attendees understand the event</span>
                      <span className={form.description.length > 900 ? "text-orange-600" : ""}>{form.description.length}/1000</span>
                    </div>
                    {errors.description && <div className="text-red-600 text-sm">{errors.description}</div>}
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Upcoming exam (optional)</label>
                    <input
                      name="exam"
                      value={form.exam}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-gray-900 bg-white ${errors.exam ? 'border-red-300' : 'border-gray-300'
                        }`}
                      placeholder="e.g., Final Exam, Midterm, Bar Exam"
                      maxLength={100}
                    />
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>Optional: What exam is this event preparing for?</span>
                      <span>{form.exam.length}/100</span>
                    </div>
                    {errors.exam && <div className="text-red-600 text-sm">{errors.exam}</div>}
                  </div>
                </div>
              </section>

              <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
                <div className="inline-flex items-center gap-3">
                  <FontAwesomeIcon icon={faImage} className="w-5 h-5 text-pink-500" />
                  <h3 className="text-xl font-bold text-gray-900">Cover Image</h3>
                </div>

                {/* Mode Toggle */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCoverMode("upload")}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${coverMode === "upload"
                      ? "bg-pink-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    disabled={loading}
                  >
                    <FontAwesomeIcon icon={faUpload} className="w-4 h-4 mr-2" />
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoverMode("generate")}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${coverMode === "generate"
                      ? "bg-pink-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    disabled={loading}
                  >
                    <FontAwesomeIcon icon={faWandMagicSparkles} className="w-4 h-4 mr-2" />
                    Generate with AI
                  </button>
                </div>

                {/* Current Cover Image Preview */}
                {!coverImagePreview && event.cover_image_url && (
                  <div className="relative">
                    <img
                      src={event.cover_image_url}
                      alt="Current cover"
                      className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <p className="text-xs text-gray-500 mt-1">Current cover image</p>
                  </div>
                )}

                {/* Upload Mode */}
                {coverMode === "upload" && (
                  <div className="space-y-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleCoverImageChange}
                      className="hidden"
                    />
                    {coverImagePreview ? (
                      <div className="relative">
                        <img
                          src={coverImagePreview}
                          alt="Preview"
                          className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setCoverImageFile(null)
                            setCoverImagePreview(null)
                            if (fileInputRef.current) fileInputRef.current.value = ""
                          }}
                          className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                        </button>
                        <p className="text-xs text-gray-500 mt-1">New cover image preview</p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-pink-500 hover:bg-pink-50 transition-colors text-gray-600"
                      >
                        <FontAwesomeIcon icon={faUpload} className="w-6 h-6 mx-auto mb-2" />
                        <p className="text-sm font-medium">Click to upload or drag and drop</p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                      </button>
                    )}
                    {errors.coverImage && <div className="text-red-600 text-sm">{errors.coverImage}</div>}
                  </div>
                )}

                {/* Generate Mode */}
                {coverMode === "generate" && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="Describe the cover image you want..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-gray-900 bg-white"
                        disabled={generatingCover || loading}
                      />
                      <button
                        type="button"
                        onClick={handleGenerateCoverImage}
                        disabled={generatingCover || loading || !aiPrompt.trim()}
                        className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {generatingCover ? "Generating..." : "Generate"}
                      </button>
                    </div>
                    {coverImagePreview && (
                      <div className="relative">
                        <img
                          src={coverImagePreview}
                          alt="AI Generated"
                          className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setCoverImageFile(null)
                            setCoverImagePreview(null)
                            setAiPrompt("")
                          }}
                          className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                        </button>
                        <p className="text-xs text-gray-500 mt-1">AI-generated cover image</p>
                      </div>
                    )}
                  </div>
                )}
              </section>

              <section className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-3">
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                      Event
                    </span>
                    <span className="text-gray-500">Review and save</span>
                  </div>
                  <div className="inline-flex gap-3">
                    <button
                      type="button"
                      onClick={onCancel}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {loading ? "Updating…" : (
                        <span className="inline-flex items-center gap-2">
                          <FontAwesomeIcon icon={faSave} className="w-4 h-4" />
                          Save changes
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </section>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

