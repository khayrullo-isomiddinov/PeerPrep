// "2026-10-25" -> "25 October 2026" (the date is a plain calendar date, so no time zone shifting)
export function formatLegalDate(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  })
}
