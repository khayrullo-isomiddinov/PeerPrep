import { useEffect, useMemo, useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faWandMagicSparkles, faLocationDot, faUsers } from "@fortawesome/free-solid-svg-icons"
import { refineEventText, getErrorMessage } from "../../../utils/api"
import { formatEventWhen } from "../../../utils/dates"
import { useToast } from "../../../components/ui/toastContext"
import Card from "../../../components/ui/Card"
import Button from "../../../components/ui/Button"
import Field, { Input, Select, Textarea } from "../../../components/ui/Field"
import EventCover from "../EventCover"
import CoverPicker from "./CoverPicker"
import MaterialsPicker from "./MaterialsPicker"
import { DURATIONS, LIMITS, startDate, toPayload, validate } from "./eventFormModel"

function Section({ title, description, children }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold text-fg">{title}</h2>
      {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </Card>
  )
}

function Counter({ value, max }) {
  return <span className={`text-xs tabular-nums ${value.length > max ? "text-danger" : "text-fg-subtle"}`}>{value.length}/{max}</span>
}

// "Improve with AI" for the title and description
function RefineButton({ text, field, onRefined }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  async function refine() {
    setBusy(true)
    try {
      onRefined(await refineEventText(text, field))
    } catch (e) {
      toast.error(getErrorMessage(e, "Couldn't improve the text right now."))
    } finally {
      setBusy(false)
    }
  }
  return (
    <button
      type="button"
      onClick={refine}
      disabled={busy || !text.trim()}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-text hover:underline disabled:opacity-40 disabled:no-underline"
    >
      <FontAwesomeIcon icon={faWandMagicSparkles} className={busy ? "animate-pulse" : ""} />
      {busy ? "Improving…" : "Improve with AI"}
    </button>
  )
}

function Preview({ values }) {
  const start = startDate(values)
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <EventCover
        event={{ title: values.title, description: values.description, exam: values.exam, cover_image_url: values.coverUrl }}
        className="aspect-[16/8] w-full"
      />
      <div className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-text">
          {start ? formatEventWhen(start.toISOString()) : "Pick a date"}
        </p>
        <p className="mt-1.5 line-clamp-2 font-semibold text-fg">{values.title.trim() || "Your session title"}</p>
        <p className="mt-2 flex items-center gap-2 text-sm text-fg-muted">
          <FontAwesomeIcon icon={faLocationDot} className="w-3.5 text-fg-subtle" />
          <span className="truncate">{values.location.trim() || "Location"}</span>
        </p>
        <p className="mt-1 flex items-center gap-2 text-sm text-fg-muted">
          <FontAwesomeIcon icon={faUsers} className="w-3.5 text-fg-subtle" />
          Up to {values.capacity || "–"} people
        </p>
      </div>
    </div>
  )
}

// Shared by "Host a session" and "Edit session". `onSubmit(payload)` should return a promise.
export default function EventForm({ initialValues, minCapacity, submitLabel, onSubmit, onCancel, busy }) {
  const toast = useToast()
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)

  const dirty = useMemo(() => JSON.stringify(values) !== JSON.stringify(initialValues), [values, initialValues])

  // Warn before closing the tab with unsaved changes
  useEffect(() => {
    if (!dirty || busy) return
    const warn = (e) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty, busy])

  function set(field, value) {
    setValues((prev) => {
      const next = { ...prev, [field]: value }
      // After the first submit attempt, re-validate as the user fixes things
      if (submitted) setErrors(validate(next, { minCapacity }))
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
    const found = validate(values, { minCapacity })
    setErrors(found)
    if (Object.keys(found).length > 0) {
      const firstInvalid = document.querySelector('[aria-invalid="true"]')
      firstInvalid?.focus()
      toast.error("Please fix the highlighted fields.")
      return
    }
    await onSubmit(toPayload(values))
  }

  const today = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  }, [])

  const actions = (
    <>
      <Button variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
      <Button type="submit" loading={busy} className="flex-1 lg:flex-none">{submitLabel}</Button>
    </>
  )

  return (
    <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-6 pb-24 lg:grid-cols-[1fr_20rem] lg:pb-0">
      <div className="min-w-0 space-y-6">
        <Section title="The basics" description="What will you study, and who is it for?">
          <Field
            label="Title"
            required
            error={errors.title}
            counter={<RefineButton text={values.title} field="title" onRefined={(t) => set("title", t)} />}
          >
            <Input value={values.title} onChange={(e) => set("title", e.target.value)} maxLength={LIMITS.title} placeholder="e.g. Organic chemistry: reaction mechanisms" />
          </Field>
          <Field
            label="Description"
            optional
            error={errors.description}
            hint="Topics you'll cover, what to bring, the level you're at."
            counter={
              <span className="flex items-center gap-3">
                <RefineButton text={values.description} field="description" onRefined={(t) => set("description", t)} />
                <Counter value={values.description} max={LIMITS.description} />
              </span>
            }
          >
            <Textarea rows={5} value={values.description} onChange={(e) => set("description", e.target.value)} placeholder="We'll go through chapters 4–6 and do two past papers together…" />
          </Field>
          <Field label="Preparing for" optional error={errors.exam} hint="An exam or course code helps others find your session.">
            <Input value={values.exam} onChange={(e) => set("exam", e.target.value)} maxLength={LIMITS.exam} placeholder="e.g. MCAT, CHEM 201 final" />
          </Field>
        </Section>

        <Section title="When & where">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Date" required error={errors.when}>
              <Input type="date" min={today} value={values.date} onChange={(e) => set("date", e.target.value)} />
            </Field>
            <Field label="Start time" required>
              <Input type="time" value={values.time} onChange={(e) => set("time", e.target.value)} aria-invalid={errors.when ? true : undefined} />
            </Field>
            <Field label="Duration">
              <Select value={values.duration} onChange={(e) => set("duration", Number(e.target.value))}>
                {DURATIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </Select>
            </Field>
            <Field label="Max participants" required error={errors.capacity} hint={minCapacity > LIMITS.minCapacity ? `At least ${minCapacity} (people already going).` : undefined}>
              <Input type="number" inputMode="numeric" min={minCapacity} max={LIMITS.maxCapacity} value={values.capacity} onChange={(e) => set("capacity", e.target.value)} />
            </Field>
          </div>
          <Field label="Location" required error={errors.location} hint="A room, a café, or a video-call link.">
            <Input value={values.location} onChange={(e) => set("location", e.target.value)} maxLength={LIMITS.location} placeholder="e.g. Main library, room 2.14" />
          </Field>
        </Section>

        <Section title="Cover & materials" description="Optional, but sessions with a cover stand out in the list.">
          <CoverPicker value={values.coverUrl} onChange={(url) => set("coverUrl", url)} onError={toast.error} />
          <MaterialsPicker value={values.materials} onChange={(list) => set("materials", list)} onError={toast.error} />
        </Section>
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Preview</p>
          <Preview values={values} />
          <div className="flex gap-2">{actions}</div>
        </div>
      </aside>

      {/* Phones and tablets: actions stay in reach, above the tab bar */}
      <div className="fixed inset-x-0 bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))] z-30 border-t border-line bg-surface/95 backdrop-blur-xl md:bottom-0 md:pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="page-container flex gap-2 py-3">{actions}</div>
      </div>
    </form>
  )
}
