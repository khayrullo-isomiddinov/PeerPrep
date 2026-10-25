import { describe, expect, it } from "vitest"
import { getErrorMessage } from "./errors"

const httpError = (status: number, data?: unknown) => ({ response: { status, data } })

describe("getErrorMessage", () => {
  it("uses the server's message when it's a string", () => {
    expect(getErrorMessage(httpError(409, { detail: "Event is full" }))).toBe("Event is full")
  })

  it("joins FastAPI validation errors into one sentence and drops the 'Value error' prefix", () => {
    const err = httpError(422, {
      detail: [{ msg: "Value error, Title is required" }, { msg: "Value error, Start time must be in the future" }],
    })
    expect(getErrorMessage(err)).toBe("Title is required Start time must be in the future")
  })

  it("never returns an object (rendering one would crash React)", () => {
    const message = getErrorMessage(httpError(422, { detail: [{ loc: ["body"], type: "missing" }] }), "Fallback")
    expect(message).toBe("Fallback")
  })

  it("explains network failures", () => {
    expect(getErrorMessage({ message: "Network Error" })).toMatch(/can't reach the server/i)
  })

  it("has friendly defaults per status", () => {
    expect(getErrorMessage(httpError(401))).toMatch(/session has expired/i)
    expect(getErrorMessage(httpError(403))).toMatch(/permission/i)
    expect(getErrorMessage(httpError(404))).toMatch(/couldn't find/i)
    expect(getErrorMessage(httpError(502))).toMatch(/server ran into a problem/i)
    expect(getErrorMessage(httpError(418), "Custom fallback")).toBe("Custom fallback")
  })
})
