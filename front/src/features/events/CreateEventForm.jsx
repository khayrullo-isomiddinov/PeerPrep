import { useState } from "react"
import Button from "../../components/Button"
import Card from "../../components/Card"

export default function CreateEventForm({ addEvent }) {
  const [form, setForm] = useState({
    title: "",
    date: "",
    time: "",
    location: "",
    description: "",
    tag: "",
  })

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.title || !form.date) return
    addEvent({ id: crypto.randomUUID(), ...form })
    setForm({
      title: "",
      date: "",
      time: "",
      location: "",
      description: "",
      tag: "",
    })
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-lg font-semibold">Create Event</h2>
        <input
          className="w-full rounded-lg border p-2 dark:bg-slate-900"
          name="title"
          placeholder="Event title"
          value={form.title}
          onChange={handleChange}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            className="w-full rounded-lg border p-2 dark:bg-slate-900"
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
          />
          <input
            className="w-full rounded-lg border p-2 dark:bg-slate-900"
            type="time"
            name="time"
            value={form.time}
            onChange={handleChange}
          />
        </div>
        <input
          className="w-full rounded-lg border p-2 dark:bg-slate-900"
          name="location"
          placeholder="Location"
          value={form.location}
          onChange={handleChange}
        />
        <input
          className="w-full rounded-lg border p-2 dark:bg-slate-900"
          name="tag"
          placeholder="Tag (Study, Workshop, etc.)"
          value={form.tag}
          onChange={handleChange}
        />
        <textarea
          className="w-full rounded-lg border p-2 dark:bg-slate-900"
          name="description"
          placeholder="Description"
          value={form.description}
          onChange={handleChange}
        />
        <Button type="submit">Save Event</Button>
      </form>
    </Card>
  )
}
