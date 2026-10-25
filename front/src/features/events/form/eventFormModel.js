// Pure helpers for the event form: API event <-> form values, validation and the API payload.
// Dates are edited in the user's local time and sent to the API as UTC ISO strings.

export const LIMITS = { title: 200, description: 1000, exam: 100, location: 300, minCapacity: 2, maxCapacity: 1000 }
export const DURATIONS = [
  { value: 1, label: "1 hour" },
  { value: 2, label: "2 hours" },
  { value: 3, label: "3 hours" },
  { value: 4, label: "4 hours" },
  { value: 8, label: "All day" },
]

const pad = (n) => String(n).padStart(2, "0")
const toLocalDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const toLocalTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

function parseMaterials(json) {
  if (!json) return []
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// Sensible defaults for a new event: tomorrow at 18:00
export function emptyValues(now = new Date()) {
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return {
    title: "",
    description: "",
    exam: "",
    date: toLocalDate(tomorrow),
    time: "18:00",
    duration: 2,
    location: "",
    capacity: 8,
    coverUrl: null,
    materials: [],
  }
}

// `parseDate` turns the API's UTC timestamp into a Date (see utils/dates parseUTCDate)
export function valuesFromEvent(event, parseDate) {
  const start = parseDate(event.starts_at)
  return {
    title: event.title || "",
    description: event.description || "",
    exam: event.exam || "",
    date: start ? toLocalDate(start) : "",
    time: start ? toLocalTime(start) : "",
    duration: event.duration || 2,
    location: event.location || "",
    capacity: event.capacity || 8,
    coverUrl: event.cover_image_url || null,
    materials: parseMaterials(event.study_materials),
  }
}

export function startDate(values) {
  if (!values.date || !values.time) return null
  const d = new Date(`${values.date}T${values.time}`)
  return isNaN(d.getTime()) ? null : d
}

export function validate(values, { now = new Date(), minCapacity = LIMITS.minCapacity } = {}) {
  const errors = {}
  const title = values.title.trim()
  if (!title) errors.title = "Give your session a name."
  else if (title.length > LIMITS.title) errors.title = `Keep it under ${LIMITS.title} characters.`
  if (values.description.length > LIMITS.description) errors.description = `Keep it under ${LIMITS.description} characters.`
  if (values.exam.length > LIMITS.exam) errors.exam = `Keep it under ${LIMITS.exam} characters.`
  if (!values.location.trim()) errors.location = "Where will you meet? A room, a café or a video link all work."

  const start = startDate(values)
  if (!start) errors.when = "Pick a date and a start time."
  else if (start <= now) errors.when = "The session needs to start in the future."

  const capacity = Number(values.capacity)
  if (!Number.isInteger(capacity) || capacity < minCapacity || capacity > LIMITS.maxCapacity) {
    errors.capacity = `Choose between ${minCapacity} and ${LIMITS.maxCapacity} people.`
  }
  return errors
}

export function toPayload(values) {
  return {
    title: values.title.trim(),
    description: values.description.trim() || null,
    exam: values.exam.trim() || null,
    starts_at: startDate(values).toISOString(),
    duration: Number(values.duration),
    location: values.location.trim(),
    capacity: Number(values.capacity),
    cover_image_url: values.coverUrl || null,
    study_materials: values.materials.length ? JSON.stringify(values.materials) : null,
  }
}
