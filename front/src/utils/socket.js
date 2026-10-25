// Builds a WebSocket URL for an API path, e.g. socketUrl("/api/events/5/ws", token)
export function socketUrl(path, token) {
  const apiBase = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "")
  const protocol = apiBase.startsWith("https") ? "wss" : "ws"
  const host = apiBase.replace(/^https?:\/\//, "")
  return `${protocol}://${host}${path}?token=${encodeURIComponent(token)}`
}
