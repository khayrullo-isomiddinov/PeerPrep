import { describe, expect, it } from "vitest"
import { levelProgress } from "./badgeLevels"

describe("levelProgress", () => {
  it("explains what's missing when XP alone isn't enough to level up", () => {
    const p = levelProgress({ badge: { name: "Beginner" }, total_xp: 320, events_attended: 1, weekly_streak: 1, engagement_score: 0.1 })
    expect(p.next.name).toBe("Learner")
    expect(p.missing).toEqual(["1 more session", "20% engagement"])
    expect(p.percent).toBeLessThan(100)
  })

  it("reports the top level as complete", () => {
    expect(levelProgress({ badge: { name: "Master" }, total_xp: 5000 })).toMatchObject({ next: null, percent: 100 })
  })
})
