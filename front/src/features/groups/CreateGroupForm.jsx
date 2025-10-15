import { useState } from "react"
import { useAuth } from "../auth/AuthContext"

export default function CreateGroupForm({ addGroup }) {
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

    if (hasMission) {
      if (!form.mission_title.trim()) next.mission_title = "Mission title is required"
      else if (form.mission_title.length > 100) next.mission_title = "Max 100 characters"

      if (!form.mission_description.trim()) next.mission_description = "Mission description is required"
      else if (form.mission_description.length > 1000) next.mission_description = "Max 1000 characters"

      if (!form.mission_deadline) next.mission_deadline = "Deadline is required"
      else {
        const d = new Date(form.mission_deadline)
        if (d <= new Date()) next.mission_deadline = "Deadline must be in the future"
      }

      if (form.mission_capacity < 1 || form.mission_capacity > 100) next.mission_capacity = "Capacity 1–100"

      if (form.mission_badge_name && form.mission_badge_name.length > 50) next.mission_badge_name = "Max 50 characters"
      if (form.mission_badge_description && form.mission_badge_description.length > 200) next.mission_badge_description = "Max 200 characters"
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isAuthenticated) {
      setErrors({ submit: "You must be logged in to create groups" })
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
      }
      await addGroup(payload)
      setForm({
        name: "", field: "", exam: "", description: "",
        mission_title: "", mission_description: "", mission_deadline: "",
        mission_capacity: 10, mission_badge_name: "", mission_badge_description: ""
      })
      setHasMission(false)
      setShowPreview(false)
      setErrors({})
    } catch (err) {
      const message = err?.response?.data?.detail || err?.response?.data?.message || "Failed to create group"
      setErrors({ submit: message })
    } finally {
      setLoading(false)
    }
  }

  function getMinDate() {
    const t = new Date()
    t.setDate(t.getDate() + 1)
    return t.toISOString().split("T")[0]
  }

  function daysUntil() {
    if (!form.mission_deadline) return null
    const d = new Date(form.mission_deadline)
    const diff = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <div className="space-y-8">
      <div className="hero-accent premium-scale-in">
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="badge">Create</span>
            <h2 className="mt-3 premium-heading">Launch a study group</h2>
            <p className="text-muted mt-1">Set the basics, optionally add a mission challenge.</p>
          </div>
          <div className="inline-flex items-center gap-2">
            <span className="pill bg-paper text-muted">Step 1 · Basics</span>
            <span className="pill bg-paper text-muted">Step 2 · Mission</span>
          </div>
        </div>
      </div>

      {errors.submit && (
        <div className="premium-card premium-scale-in">
          <div className="text-sm premium-text-error">{errors.submit}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="surface inset-pad rounded-l premium-scale-in space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="field-row">
              <label className="label">Group name *</label>
              <input
                className={`input ${errors.name ? "ring-soft" : ""}`}
                name="name"
                placeholder="e.g., Data Structures Study Group"
                value={form.name}
                onChange={handleChange}
                maxLength={100}
              />
              <div className="flex items-center justify-between text-sm text-muted">
                <span>Choose a memorable name</span>
                <span className={form.name.length > 80 ? "premium-text-warning" : ""}>{form.name.length}/100</span>
              </div>
              {errors.name && <div className="premium-text-error text-sm">{errors.name}</div>}
            </div>

            <div className="field-row">
              <label className="label">Field of study *</label>
              <select
                className={`input ${errors.field ? "ring-soft" : ""}`}
                name="field"
                value={form.field}
                onChange={handleChange}
              >
                <option value="">Select a field…</option>
                {fieldOptions.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              {errors.field && <div className="premium-text-error text-sm">{errors.field}</div>}
            </div>
          </div>

          <div className="field-row">
            <label className="label">Upcoming exam (optional)</label>
            <input
              className="input"
              name="exam"
              placeholder="e.g., CS2100 Midterm, Final, Certification"
              value={form.exam}
              onChange={handleChange}
              maxLength={100}
            />
            <div className="flex items-center justify-between text-sm text-muted">
              <span>What are you preparing for?</span>
              <span>{form.exam.length}/100</span>
            </div>
          </div>

          <div className="field-row">
            <label className="label">Description</label>
            <textarea
              className={`textarea ${errors.description ? "ring-soft" : ""}`}
              name="description"
              placeholder="What is the group about? What will you study together? How will you help each other?"
              value={form.description}
              onChange={handleChange}
              rows={5}
              maxLength={500}
            />
            <div className="flex items-center justify-between text-sm text-muted">
              <span>Help others understand your purpose</span>
              <span className={form.description.length > 400 ? "premium-text-warning" : ""}>{form.description.length}/500</span>
            </div>
            {errors.description && <div className="premium-text-error text-sm">{errors.description}</div>}
          </div>
        </section>

        <section className="surface inset-pad rounded-l premium-scale-in space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="badge">Optional</span>
              <h3 className="text-xl font-bold">Mission challenge</h3>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 field-row">
                <label className="label">Mission title *</label>
                <input
                  className={`input ${errors.mission_title ? "ring-soft" : ""}`}
                  name="mission_title"
                  placeholder="e.g., Master Dynamic Programming"
                  value={form.mission_title}
                  onChange={handleChange}
                  maxLength={100}
                />
                <div className="flex items-center justify-between text-sm text-muted">
                  <span>Main goal participants need to achieve</span>
                  <span className={form.mission_title.length > 80 ? "premium-text-warning" : ""}>{form.mission_title.length}/100</span>
                </div>
                {errors.mission_title && <div className="premium-text-error text-sm">{errors.mission_title}</div>}
              </div>

              <div className="md:col-span-2 field-row">
                <label className="label">Mission description *</label>
                <textarea
                  className={`textarea ${errors.mission_description ? "ring-soft" : ""}`}
                  name="mission_description"
                  placeholder="Describe requirements, proof to submit, and how you’ll judge success."
                  value={form.mission_description}
                  onChange={handleChange}
                  rows={4}
                  maxLength={1000}
                />
                <div className="flex items-center justify-between text-sm text-muted">
                  <span>Be specific about submission format</span>
                  <span className={form.mission_description.length > 800 ? "premium-text-warning" : ""}>{form.mission_description.length}/1000</span>
                </div>
                {errors.mission_description && <div className="premium-text-error text-sm">{errors.mission_description}</div>}
              </div>

              <div className="field-row">
                <label className="label">Deadline *</label>
                <input
                  type="date"
                  className={`input ${errors.mission_deadline ? "ring-soft" : ""}`}
                  name="mission_deadline"
                  value={form.mission_deadline}
                  onChange={handleChange}
                  min={getMinDate()}
                />
                {form.mission_deadline && (
                  <div className="text-sm text-muted mt-1">{daysUntil()} days until deadline</div>
                )}
                {errors.mission_deadline && <div className="premium-text-error text-sm">{errors.mission_deadline}</div>}
              </div>

              <div className="field-row">
                <label className="label">Maximum participants *</label>
                <input
                  type="number"
                  className={`input ${errors.mission_capacity ? "ring-soft" : ""}`}
                  name="mission_capacity"
                  value={form.mission_capacity}
                  onChange={handleChange}
                  min="1"
                  max="100"
                />
                <div className="text-sm text-muted mt-1">How many people can join?</div>
                {errors.mission_capacity && <div className="premium-text-error text-sm">{errors.mission_capacity}</div>}
              </div>

              <div className="field-row">
                <label className="label">Badge name (optional)</label>
                <input
                  className={`input ${errors.mission_badge_name ? "ring-soft" : ""}`}
                  name="mission_badge_name"
                  placeholder="e.g., DP Ace"
                  value={form.mission_badge_name}
                  onChange={handleChange}
                  maxLength={50}
                />
                <div className="flex items-center justify-between text-sm text-muted">
                  <span>What will successful participants earn?</span>
                  <span>{form.mission_badge_name.length}/50</span>
                </div>
                {errors.mission_badge_name && <div className="premium-text-error text-sm">{errors.mission_badge_name}</div>}
              </div>

              <div className="field-row">
                <label className="label">Badge description (optional)</label>
                <textarea
                  className={`textarea ${errors.mission_badge_description ? "ring-soft" : ""}`}
                  name="mission_badge_description"
                  placeholder="What does earning this badge mean?"
                  value={form.mission_badge_description}
                  onChange={handleChange}
                  rows={2}
                  maxLength={200}
                />
                <div className="flex items-center justify-between text-sm text-muted">
                  <span>Explain the significance of this achievement</span>
                  <span className={form.mission_badge_description.length > 160 ? "premium-text-warning" : ""}>{form.mission_badge_description.length}/200</span>
                </div>
                {errors.mission_badge_description && <div className="premium-text-error text-sm">{errors.mission_badge_description}</div>}
              </div>

              {(form.mission_title && form.mission_description) && (
                <div className="premium-card inset-pad md:col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="badge">Preview</span>
                    <h4 className="text-lg font-semibold">Mission overview</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted">Challenge</div>
                      <div className="font-semibold">{form.mission_title}</div>
                    </div>
                    <div>
                      <div className="text-muted">Description</div>
                      <div>{form.mission_description}</div>
                    </div>
                    {form.mission_deadline && (
                      <div>
                        <div className="text-muted">Deadline</div>
                        <div>{new Date(form.mission_deadline).toLocaleDateString()} ({daysUntil()} days)</div>
                      </div>
                    )}
                    <div>
                      <div className="text-muted">Capacity</div>
                      <div>{form.mission_capacity} participants</div>
                    </div>
                    {form.mission_badge_name && (
                      <div className="md:col-span-2">
                        <div className="text-muted">Badge</div>
                        <div className="font-semibold">{form.mission_badge_name}</div>
                        {form.mission_badge_description && <div className="mt-1">{form.mission_badge_description}</div>}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="surface inset-pad rounded-l premium-scale-in space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2">
              <span className="badge">{hasMission ? "Mission challenge" : "Basic group"}</span>
              <span className="text-muted">Almost there</span>
            </div>
            <div className="inline-flex gap-2">
              <button
                type="button"
                onClick={() => setShowPreview(v => !v)}
                disabled={loading}
                className="btn-secondary"
              >
                {showPreview ? "Hide preview" : "Preview"}
              </button>
              <button
                type="submit"
                disabled={loading || !isAuthenticated}
                className="btn"
              >
                {loading ? "Creating…" : isAuthenticated ? "Launch group" : "Login required"}
              </button>
            </div>
          </div>

          {showPreview && (
            <div className="premium-card inset-pad">
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
  )
}
