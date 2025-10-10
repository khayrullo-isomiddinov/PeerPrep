import { useState } from "react"
import Button from "../../components/Button"
import Card from "../../components/Card"

export default function CreateGroupForm({ addGroup }) {
  const [form, setForm] = useState({
    name: "",
    field: "",
    exam: "",
    description: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!form.name.trim()) return setError("Group name is required.")
    if (!form.field.trim()) return setError("Field of study is required.")

    setError("")
    setLoading(true)

    try {
      await addGroup({
        name: form.name.trim(),
        field: form.field.trim(),
        exam: form.exam.trim(),
        description: form.description.trim(),
      })
      setForm({ name: "", field: "", exam: "", description: "" })
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create group")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-5">
        <h2 className="text-lg font-semibold">Create Study Group</h2>
        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="field-row">
          <label htmlFor="g_name" className="label">Group name</label>
          <input
            id="g_name"
            className="input"
            name="name"
            placeholder="e.g. Data Structures Study Group"
            value={form.name}
            onChange={handleChange}
          />
        </div>

        <div className="field-row">
          <label htmlFor="g_field" className="label">Field of study</label>
          <input
            id="g_field"
            className="input"
            name="field"
            placeholder="e.g. Computer Science, Biology"
            value={form.field}
            onChange={handleChange}
          />
        </div>

        <div className="field-row">
          <label htmlFor="g_exam" className="label">Upcoming exam (optional)</label>
          <input
            id="g_exam"
            className="input"
            name="exam"
            placeholder="e.g. CS2100 Midterm"
            value={form.exam}
            onChange={handleChange}
          />
        </div>

        <div className="field-row">
          <label htmlFor="g_desc" className="label">Short description</label>
          <textarea
            id="g_desc"
            className="textarea"
            name="description"
            placeholder="What is the group about?"
            value={form.description}
            onChange={handleChange}
            rows={3}
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Group"}
          </Button>
        </div>
      </form>
    </Card>
  )
}
