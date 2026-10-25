// Opens an authenticated WebSocket to an API path, e.g. openSocket("/api/events/5/ws", token).
// The token travels as a subprotocol rather than in the URL, so it never shows up in server access logs.
const TOKEN_PROTOCOL = "peerprep.bearer"

export function socketUrl(path: string): string {
  const apiBase = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "")
  const protocol = apiBase.startsWith("https") ? "wss" : "ws"
  const host = apiBase.replace(/^https?:\/\//, "")
  return `${protocol}://${host}${path}`
}

export function openSocket(path: string, token: string): WebSocket {
  return new WebSocket(socketUrl(path), [TOKEN_PROTOCOL, token])
}
