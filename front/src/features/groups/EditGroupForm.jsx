import { useState, useEffect } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faTimes, faUsers, faTrophy, faClock, faSave, faExclamationTriangle } from "@fortawesome/free-solid-svg-icons"
import { useAuth } from "../auth/AuthContext"

export default function EditGroupForm({ group, onUpdate, onCancel }) {
  const { isAuthenticated } = useAuth()
  const [form, setForm] = useState({
    name: "",
    field: "",
    exam: "",
    description: "",
    deadline: "",
    capacity: 10,
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    if (!group) return
    setForm({
      name: group.name || "",
      field: group.field || "",
      exam: group.exam || "",
      description: group.description || "",
      deadline: group.deadline ? new Date(group.deadline).toISOString().split("T")[0] : "",
      capacity: group.capacity || 10,
    })
  }, [group])

  const fieldOptions = [
    "Computer Science","Mathematics","Physics","Chemistry","Biology",
    "Engineering","Medicine","Business","Economics","Psychology",
    "Languages","History","Literature","Art","Music","Sports",
    "Wellness","Productivity","Other"
  ]

  function handleChange(e) {
    const { name, value, type } = e.target
    const v = type === "number" ? (parseInt(value) || 0) : value
    setForm(prev => ({ ...prev, [name]: v }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }))
  }

  function validateForm() {
    const next = {}
    if (!form.name.trim()) next.name = "Group name is required"
    else if (form.name.length > 100) next.name = "Max 100 characters"
    if (!form.field.trim()) next.field = "Field of study is required"
    if (form.description && form.description.length > 500) next.description = "Max 500 characters"
    if (form.exam && form.exam.length > 100) next.exam = "Max 100 characters"
    if (form.deadline && new Date(form.deadline) <= new Date()) next.deadline = "Deadline must be in the future"
    if (form.capacity < 1 || form.capacity > 100) next.capacity = "Capacity 1–100"
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function submit(e) {
    e.preventDefault()
    if (!isAuthenticated) {
      setErrors({ submit: "You must be logged in to edit groups" })
      return
    }
    if (!validateForm()) return
    setLoading(true)
    try {
      const payload = {
        name: form.name.trim(),
        field: form.field.trim(),
        exam: form.exam.trim() || null,
        description: form.description.trim() || null,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
        capacity: form.capacity,
      }
      await onUpdate(group.id, payload)
    } catch (err) {
      const message = err?.response?.data?.detail || err?.response?.data?.message || "Failed to update group"
      setErrors({ submit: message })
    } finally {
      setLoading(false)
    }
  }


  if (!group) return null

  return (
    <div className="fixed inset-0 z-above-nav bg-black/50 overflow-y-auto overscroll-contain">
      <div className="min-h-screen py-8 px-4 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden">
          <div className="sticky top-0 z-10 px-6 py-4 bg-white border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-3">
                <span className="px-3 py-1 bg-pink-100 text-pink-700 text-sm font-medium rounded-full">Edit</span>
                <h2 className="text-2xl font-bold text-gray-900">Update Group</h2>
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
                  <FontAwesomeIcon icon={faUsers} className="w-5 h-5 text-pink-500" />
                  <h3 className="text-xl font-bold text-gray-900">Basic Information</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Group name *</label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-gray-900 bg-white ${
                        errors.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="e.g., Data Structures Study Group"
                      maxLength={100}
                    />
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>Clear and memorable</span>
                      <span className={form.name.length > 80 ? "text-orange-600" : ""}>{form.name.length}/100</span>
                    </div>
                    {errors.name && <div className="text-red-600 text-sm">{errors.name}</div>}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Field of study *</label>
                    <select
                      name="field"
                      value={form.field}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-gray-900 bg-white ${
                        errors.field ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select a field…</option>
                      {fieldOptions.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                    {errors.field && <div className="text-red-600 text-sm">{errors.field}</div>}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Upcoming exam</label>
                    <input
                      name="exam"
                      value={form.exam}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-gray-900 bg-white ${
                        errors.exam ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="e.g., Midterm, Final, Certification"
                      maxLength={100}
                    />
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>What are you preparing for?</span>
                      <span>{form.exam.length}/100</span>
                    </div>
                    {errors.exam && <div className="text-red-600 text-sm">{errors.exam}</div>}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Description</label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-gray-900 bg-white ${
                        errors.description ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="What will you study and how will you collaborate?"
                      rows={4}
                      maxLength={500}
                    />
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>Help others understand the focus</span>
                      <span className={form.description.length > 400 ? "text-orange-600" : ""}>{form.description.length}/500</span>
                    </div>
                    {errors.description && <div className="text-red-600 text-sm">{errors.description}</div>}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Group Deadline</label>
                    <input
                      type="date"
                      name="deadline"
                      value={form.deadline}
                      onChange={handleChange}
                      min={new Date().toISOString().split('T')[0]}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-gray-900 bg-white ${
                        errors.deadline ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.deadline && <div className="text-red-600 text-sm">{errors.deadline}</div>}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Maximum Participants</label>
                    <input
                      type="number"
                      name="capacity"
                      value={form.capacity}
                      onChange={handleChange}
                      min="1"
                      max="100"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-gray-900 bg-white ${
                        errors.capacity ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.capacity && <div className="text-red-600 text-sm">{errors.capacity}</div>}
                  </div>
                </div>
              </section>

              <section className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-3">
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                      Study Group
                    </span>
                    <span className="text-gray-500">Review and save</span>
                  </div>
                  <div className="inline-flex gap-3">
                    <button 
                      type="button" 
                      onClick={() => setShowPreview(v => !v)} 
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                      {showPreview ? "Hide preview" : "Preview"}
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

                {showPreview && (
                  <div className="bg-gray-50 rounded-lg p-4 mt-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-gray-500 text-sm">Name</div>
                        <div className="font-semibold text-gray-900">{form.name || "—"}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-sm">Field</div>
                        <div className="font-semibold text-gray-900">{form.field || "—"}</div>
                      </div>
                      <div className="md:col-span-2">
                        <div className="text-gray-500 text-sm">Description</div>
                        <div className="text-gray-900">{form.description || "—"}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-sm">Exam</div>
                        <div className="text-gray-900">{form.exam || "—"}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-sm">Deadline</div>
                        <div className="text-gray-900">{form.deadline ? new Date(form.deadline).toLocaleDateString() : "—"}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-sm">Capacity</div>
                        <div className="text-gray-900">{form.capacity} members</div>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
