import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Fresh module per test: the store keeps state between requests by design
async function load() {
  vi.resetModules()
  return import("./serverStatus")
}

describe("serverStatus", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("says the server is waking only when a cold request is slow", async () => {
    const s = await load()
    s.requestSent()
    vi.advanceTimersByTime(2000)
    expect(s.getServerStatus().waking).toBe(false)
    vi.advanceTimersByTime(600)
    expect(s.getServerStatus()).toMatchObject({ waking: true })
    s.responseReceived()
    expect(s.getServerStatus()).toMatchObject({ waking: false, since: null })
  })

  it("stays quiet when the server answers quickly", async () => {
    const s = await load()
    s.requestSent()
    vi.advanceTimersByTime(300)
    s.responseReceived()
    vi.advanceTimersByTime(5000)
    expect(s.getServerStatus().waking).toBe(false)
  })

  it("treats requests to a recently awake server as warm, even if slow", async () => {
    const s = await load()
    s.responseReceived()
    vi.advanceTimersByTime(60 * 1000)
    s.requestSent() // e.g. a big upload to an awake server
    vi.advanceTimersByTime(10 * 1000)
    expect(s.getServerStatus().waking).toBe(false)
  })

  it("assumes the server may be asleep again after a long quiet spell", async () => {
    const s = await load()
    s.responseReceived()
    vi.advanceTimersByTime(11 * 60 * 1000)
    s.requestSent()
    vi.advanceTimersByTime(3000)
    expect(s.getServerStatus().waking).toBe(true)
  })

  it("ignores the background warm-up ping and gives up on network failures", async () => {
    const s = await load()
    s.requestSent({ background: true })
    vi.advanceTimersByTime(5000)
    expect(s.getServerStatus().waking).toBe(false)

    s.requestSent()
    vi.advanceTimersByTime(3000)
    s.requestFailed()
    expect(s.getServerStatus().waking).toBe(false)
  })
})
