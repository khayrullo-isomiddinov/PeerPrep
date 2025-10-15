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
    mission_title: "",
    mission_description: "",
    mission_deadline: "",
    mission_capacity: 10,
    mission_badge_name: "",
    mission_badge_description: "",
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [hasMission, setHasMission] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    if (!group) return
    setForm({
      name: group.name || "",
      field: group.field || "",
      exam: group.exam || "",
      description: group.description || "",
      mission_title: group.mission_title || "",
      mission_description: group.mission_description || "",
      mission_deadline: group.mission_deadline ? new Date(group.mission_deadline).toISOString().split("T")[0] : "",
      mission_capacity: group.mission_capacity || 10,
      mission_badge_name: group.mission_badge_name || "",
      mission_badge_description: group.mission_badge_description || "",
    })
    setHasMission(!!group.mission_title)
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
    if (hasMission) {
      if (!form.mission_title.trim()) next.mission_title = "Mission title is required"
      else if (form.mission_title.length > 100) next.mission_title = "Max 100 characters"
      if (!form.mission_description.trim()) next.mission_description = "Mission description is required"
      else if (form.mission_description.length > 1000) next.mission_description = "Max 1000 characters"
      if (!form.mission_deadline) next.mission_deadline = "Deadline is required"
      else if (new Date(form.mission_deadline) <= new Date()) next.mission_deadline = "Deadline must be in the future"
      if (form.mission_capacity < 1 || form.mission_capacity > 100) next.mission_capacity = "Capacity 1–100"
      if (form.mission_badge_name && form.mission_badge_name.length > 50) next.mission_badge_name = "Max 50 characters"
      if (form.mission_badge_description && form.mission_badge_description.length > 200) next.mission_badge_description = "Max 200 characters"
    }
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
      }
      if (hasMission) {
        payload.mission_title = form.mission_title.trim()
        payload.mission_description = form.mission_description.trim()
        payload.mission_deadline = new Date(form.mission_deadline).toISOString()
        payload.mission_capacity = form.mission_capacity
        payload.mission_badge_name = form.mission_badge_name.trim() || null
        payload.mission_badge_description = form.mission_badge_description.trim() || null
      } else {
        payload.mission_title = null
        payload.mission_description = null
        payload.mission_deadline = null
        payload.mission_capacity = 10
        payload.mission_badge_name = null
        payload.mission_badge_description = null
      }
      await onUpdate(group.id, payload)
    } catch (err) {
      const message = err?.response?.data?.detail || err?.response?.data?.message || "Failed to update group"
      setErrors({ submit: message })
    } finally {
      setLoading(false)
    }
  }

  function minDate() {
    const t = new Date()
    t.setDate(t.getDate() + 1)
    return t.toISOString().split("T")[0]
  }

  function daysUntil() {
    if (!form.mission_deadline) return null
    const d = new Date(form.mission_deadline)
    return Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24))
  }

  if (!group) return null

  return (
    <div className="fixed inset-0 z-above-nav bg-black/60 overflow-y-auto overscroll-contain">
      <div className="container-page min-h-screen py-8 grid place-items-center">
        <div className="auth-card w-full max-w-4xl p-0">
          <div className="sticky top-0 z-10 px-6 py-4 rounded-t-xl" style={{ background: "rgba(23,28,43,.92)", backdropFilter: "blur(8px)" }}>
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2">
                <span className="badge">Edit</span>
                <h2 className="premium-heading">Update group</h2>
              </div>
              <button onClick={onCancel} className="btn-secondary">Close</button>
            </div>
          </div>

          <div className="max-h-[78vh] overflow-y-auto premium-scrollbar px-6 pb-6 pt-2">
            {errors.submit && (
              <div className="premium-card inset-pad mt-2">
                <div className="inline-flex items-center gap-2 premium-text-error">
                  <FontAwesomeIcon icon={faExclamationTriangle} />
                  <span>{errors.submit}</span>
                </div>
              </div>
            )}

            <form onSubmit={submit} className="mt-4 space-y-8">
              <section className="surface inset-pad rounded-l space-y-6">
                <div className="inline-flex items-center gap-2">
                  <FontAwesomeIcon icon={faUsers} />
                  <h3 className="text-xl font-bold">Basic information</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="field-row">
                    <label className="label">Group name *</label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      className={`input ${errors.name ? "ring-soft" : ""}`}
                      placeholder="e.g., Data Structures Study Group"
                      maxLength={100}
                    />
                    <div className="flex items-center justify-between text-sm text-muted">
                      <span>Clear and memorable</span>
                      <span className={form.name.length > 80 ? "premium-text-warning" : ""}>{form.name.length}/100</span>
                    </div>
                    {errors.name && <div className="premium-text-error text-sm">{errors.name}</div>}
                  </div>

                  <div className="field-row">
                    <label className="label">Field of study *</label>
                    <select
                      name="field"
                      value={form.field}
                      onChange={handleChange}
                      className={`input ${errors.field ? "ring-soft" : ""}`}
                    >
                      <option value="">Select a field…</option>
                      {fieldOptions.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                    {errors.field && <div className="premium-text-error text-sm">{errors.field}</div>}
                  </div>

                  <div className="field-row">
                    <label className="label">Upcoming exam</label>
                    <input
                      name="exam"
                      value={form.exam}
                      onChange={handleChange}
                      className={`input ${errors.exam ? "ring-soft" : ""}`}
                      placeholder="e.g., Midterm, Final, Certification"
                      maxLength={100}
                    />
                    <div className="flex items-center justify-between text-sm text-muted">
                      <span>What are you preparing for?</span>
                      <span>{form.exam.length}/100</span>
                    </div>
                    {errors.exam && <div className="premium-text-error text-sm">{errors.exam}</div>}
                  </div>

                  <div className="field-row">
                    <label className="label">Description</label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      className={`textarea ${errors.description ? "ring-soft" : ""}`}
                      placeholder="What will you study and how will you collaborate?"
                      rows={4}
                      maxLength={500}
                    />
                    <div className="flex items-center justify-between text-sm text-muted">
                      <span>Help others understand the focus</span>
                      <span className={form.description.length > 400 ? "premium-text-warning" : ""}>{form.description.length}/500</span>
                    </div>
                    {errors.description && <div className="premium-text-error text-sm">{errors.description}</div>}
                  </div>
                </div>
              </section>

              <section className="surface inset-pad rounded-l space-y-6">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2">
                    <FontAwesomeIcon icon={faTrophy} />
                    <h3 className="text-xl font-bold">Mission challenge</h3>
                    <span className="badge">Optional</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHasMission(v => !v)}
                    className={hasMission ? "btn" : "btn-secondary"}
                  >
                    {hasMission ? "Disable mission" : "Enable mission"}
                  </button>
                </div>

                {hasMission && (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 field-row">
                      <label className="label">Mission title *</label>
                      <input
                        name="mission_title"
                        value={form.mission_title}
                        onChange={handleChange}
                        className={`input ${errors.mission_title ? "ring-soft" : ""}`}
                        placeholder="e.g., 30-Day Algorithms Sprint"
                        maxLength={100}
                      />
                      <div className="flex items-center justify-between text-sm text-muted">
                        <span>Main goal</span>
                        <span className={form.mission_title.length > 80 ? "premium-text-warning" : ""}>{form.mission_title.length}/100</span>
                      </div>
                      {errors.mission_title && <div className="premium-text-error text-sm">{errors.mission_title}</div>}
                    </div>

                    <div className="md:col-span-2 field-row">
                      <label className="label">Mission description *</label>
                      <textarea
                        name="mission_description"
                        value={form.mission_description}
                        onChange={handleChange}
                        className={`textarea ${errors.mission_description ? "ring-soft" : ""}`}
                        placeholder="Describe requirements, proof, and how success is judged."
                        rows={4}
                        maxLength={1000}
                      />
                      <div className="flex items-center justify-between text-sm text-muted">
                        <span>Be specific about submissions</span>
                        <span className={form.mission_description.length > 800 ? "premium-text-warning" : ""}>{form.mission_description.length}/1000</span>
                      </div>
                      {errors.mission_description && <div className="premium-text-error text-sm">{errors.mission_description}</div>}
                    </div>

                    <div className="field-row">
                      <label className="label inline-flex items-center gap-2"><FontAwesomeIcon icon={faClock} /> Deadline *</label>
                      <input
                        type="date"
                        name="mission_deadline"
                        value={form.mission_deadline}
                        onChange={handleChange}
                        min={minDate()}
                        className={`input ${errors.mission_deadline ? "ring-soft" : ""}`}
                      />
                      {form.mission_deadline && <div className="text-sm text-muted mt-1">{daysUntil()} days remaining</div>}
                      {errors.mission_deadline && <div className="premium-text-error text-sm">{errors.mission_deadline}</div>}
                    </div>

                    <div className="field-row">
                      <label className="label inline-flex items-center gap-2"><FontAwesomeIcon icon={faUsers} /> Maximum participants *</label>
                      <input
                        type="number"
                        name="mission_capacity"
                        value={form.mission_capacity}
                        onChange={handleChange}
                        className={`input ${errors.mission_capacity ? "ring-soft" : ""}`}
                        min="1"
                        max="100"
                      />
                      <div className="text-sm text-muted mt-1">How many can join</div>
                      {errors.mission_capacity && <div className="premium-text-error text-sm">{errors.mission_capacity}</div>}
                    </div>

                    <div className="field-row">
                      <label className="label">Badge name</label>
                      <input
                        name="mission_badge_name"
                        value={form.mission_badge_name}
                        onChange={handleChange}
                        className={`input ${errors.mission_badge_name ? "ring-soft" : ""}`}
                        placeholder="e.g., Sprint Champion"
                        maxLength={50}
                      />
                      <div className="flex items-center justify-between text-sm text-muted">
                        <span>What participants earn</span>
                        <span>{form.mission_badge_name.length}/50</span>
                      </div>
                      {errors.mission_badge_name && <div className="premium-text-error text-sm">{errors.mission_badge_name}</div>}
                    </div>

                    <div className="field-row">
                      <label className="label">Badge description</label>
                      <textarea
                        name="mission_badge_description"
                        value={form.mission_badge_description}
                        onChange={handleChange}
                        className={`textarea ${errors.mission_badge_description ? "ring-soft" : ""}`}
                        placeholder="What does this badge represent?"
                        rows={2}
                        maxLength={200}
                      />
                      <div className="flex items-center justify-between text-sm text-muted">
                        <span>Explain the achievement</span>
                        <span className={form.mission_badge_description.length > 160 ? "premium-text-warning" : ""}>{form.mission_badge_description.length}/200</span>
                      </div>
                      {errors.mission_badge_description && <div className="premium-text-error text-sm">{errors.mission_badge_description}</div>}
                    </div>
                  </div>
                )}
              </section>

              <section className="surface inset-pad rounded-l">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2">
                    <span className="badge">{hasMission ? "Mission challenge" : "Basic group"}</span>
                    <span className="text-muted">Review and save</span>
                  </div>
                  <div className="inline-flex gap-2">
                    <button type="button" onClick={() => setShowPreview(v => !v)} className="btn-secondary">
                      {showPreview ? "Hide preview" : "Preview"}
                    </button>
                    <button type="submit" disabled={loading} className="btn">
                      {loading ? "Updating…" : (<span className="inline-flex items-center gap-2"><FontAwesomeIcon icon={faSave} />Save changes</span>)}
                    </button>
                  </div>
                </div>

                {showPreview && (
                  <div className="premium-card inset-pad mt-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-muted">Name</div>
                        <div className="font-semibold">{form.name || "—"}</div>
                      </div>
                      <div>
                        <div className="text-muted">Field</div>
                        <div className="font-semibold">{form.field || "—"}</div>
                      </div>
                      <div className="md:col-span-2">
                        <div className="text-muted">Description</div>
                        <div>{form.description || "—"}</div>
                      </div>
                      <div>
                        <div className="text-muted">Exam</div>
                        <div>{form.exam || "—"}</div>
                      </div>
                      <div>
                        <div className="text-muted">Type</div>
                        <div className="font-semibold">{hasMission ? "Mission challenge" : "Basic group"}</div>
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
