import { describe, expect, it } from "vitest"
import { getBounds, hitTest, normalizeRect, translate } from "./elements"

const stroke = { id: "s", type: "stroke", color: "#000", width: 4, points: [[0, 0], [100, 0]] }
const rect = { id: "r", type: "rect", color: "#000", width: 2, x: 0, y: 0, w: 100, h: 50 }
const ellipse = { id: "e", type: "ellipse", color: "#000", width: 2, x: 0, y: 0, w: 100, h: 50 }

describe("normalizeRect", () => {
  it("handles dragging up and to the left", () => {
    expect(normalizeRect(10, 20, 0, 5)).toEqual({ x: 0, y: 5, w: 10, h: 15 })
  })
})

describe("getBounds", () => {
  it("pads strokes by half their width", () => {
    expect(getBounds(stroke)).toEqual({ x: -2, y: -2, w: 104, h: 4 })
  })
})

describe("hitTest", () => {
  it("hits a stroke near its line and misses far away", () => {
    expect(hitTest(stroke, 50, 3, 2)).toBe(true)
    expect(hitTest(stroke, 50, 20, 2)).toBe(false)
  })

  it("selects anywhere inside a rectangle", () => {
    expect(hitTest(rect, 50, 25, 1, "select")).toBe(true)
  })

  it("only erases a rectangle near its outline, so scribbles inside it can be erased alone", () => {
    expect(hitTest(rect, 50, 25, 1, "erase")).toBe(false)
    expect(hitTest(rect, 50, 1, 1, "erase")).toBe(true)
  })

  it("erases an ellipse only near its edge", () => {
    expect(hitTest(ellipse, 50, 25, 1, "erase")).toBe(false)
    expect(hitTest(ellipse, 100, 25, 1, "erase")).toBe(true)
  })
})

describe("translate", () => {
  it("moves point-based and box-based elements without mutating them", () => {
    expect(translate(stroke, 5, 5).points).toEqual([[5, 5], [105, 5]])
    expect(translate(rect, -10, 3)).toMatchObject({ x: -10, y: 3 })
    expect(stroke.points[0]).toEqual([0, 0])
  })
})
