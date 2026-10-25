import type { AxiosError } from "axios"

interface ValidationIssue {
  msg?: string
}

// Turns any API error into a sentence that's safe to show to the user.
// FastAPI returns `detail` as a string for HTTPExceptions but as a list of objects for validation errors.
export function getErrorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  const error = err as AxiosError<{ detail?: string | ValidationIssue[] }> | undefined
  if (!error?.response) {
    if (error?.code === "ERR_CANCELED") return fallback
    return "Can't reach the server. Check that the backend is running and try again."
  }
  const { status, data } = error.response
  const detail = data?.detail
  if (typeof detail === "string" && detail.trim()) return detail
  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((d) => (d?.msg || "").replace(/^Value error, /, ""))
      .filter(Boolean)
      .join(" ") || fallback
  }
  if (status === 401) return "Your session has expired. Please sign in again."
  if (status === 403) return "You don't have permission to do that."
  if (status === 404) return "We couldn't find what you were looking for."
  if (status >= 500) return "The server ran into a problem. Please try again in a moment."
  return fallback
}
