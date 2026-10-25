import { describe, expect, it } from "vitest"
import { emptyValues, toPayload, validate, valuesFromEvent } from "./eventFormModel"
import { parseUTCDate } from "../../../utils/dates"

const now = new Date(2026, 4, 10, 12, 0)
const valid = { ...emptyValues(now), title: "Calculus review", location: "Library room 3" }

describe("event form model", () => {
  it("defaults to tomorrow at 18:00", () => {
    expect(emptyValues(now)).toMatchObject({ date: "2026-05-11", time: "18:00", duration: 2 })
  })

  it("accepts a complete form", () => {
    expect(validate(valid, { now })).toEqual({})
  })

  it("requires a title, a place and a future start", () => {
    const errors = validate({ ...valid, title: "  ", location: "", date: "2026-05-10", time: "09:00" }, { now })
    expect(Object.keys(errors).sort()).toEqual(["location", "title", "when"])
  })

  it("rejects a capacity below the people already attending", () => {
    expect(validate({ ...valid, capacity: 3 }, { now, minCapacity: 5 }).capacity).toMatch(/between 5/)
  })

  it("sends the local start time as UTC and drops empty optional fields", () => {
    const payload = toPayload(valid)
    expect(payload.starts_at).toBe(new Date(2026, 4, 11, 18, 0).toISOString())
    expect(payload).toMatchObject({ title: "Calculus review", description: null, exam: null, study_materials: null })
  })

  it("round-trips an API event back into local form values", () => {
    const start = new Date(2026, 6, 4, 9, 30)
    const values = valuesFromEvent({ title: "T", location: "L", starts_at: start.toISOString(), duration: 3, capacity: 12 }, parseUTCDate)
    expect(values).toMatchObject({ date: "2026-07-04", time: "09:30", duration: 3, capacity: 12, materials: [] })
  })
})
