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
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-lg font-semibold">Create Study Group</h2>
        {error && <p className="text-sm text-red-600">{error}</p>}

        <input
          className="w-full rounded-lg border p-2 dark:bg-slate-900"
          name="name"
          placeholder="Group name (e.g. Data Structures Study Group)"
          value={form.name}
          onChange={handleChange}
        />

        <input
          className="w-full rounded-lg border p-2 dark:bg-slate-900"
          name="field"
          placeholder="Field of study (e.g. Computer Science, Biology)"
          value={form.field}
          onChange={handleChange}
        />

        <input
          className="w-full rounded-lg border p-2 dark:bg-slate-900"
          name="exam"
          placeholder="Upcoming exam (optional)"
          value={form.exam}
          onChange={handleChange}
        />

        <textarea
          className="w-full rounded-lg border p-2 dark:bg-slate-900"
          name="description"
          placeholder="Short description"
          value={form.description}
          onChange={handleChange}
        />

        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Group"}
        </Button>
      </form>
    </Card>
  )
}
