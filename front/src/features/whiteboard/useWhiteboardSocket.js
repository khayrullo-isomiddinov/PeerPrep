import { useEffect, useRef, useState, useCallback } from "react"
import { socketUrl } from "../../utils/socket"

// Messages that change the board are queued while offline and replayed after reconnecting.
// Ephemeral ones (cursor, draft) are simply dropped.
const DURABLE_TYPES = new Set(["upsert", "delete", "clear"])

export function useWhiteboardSocket(eventId, { enabled, onMessage }) {
  const [status, setStatus] = useState("connecting") // connecting | open | closed | denied
  const wsRef = useRef(null)
  const readyRef = useRef(false) // true once the server's "init" snapshot has arrived
  const queueRef = useRef([])
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  useEffect(() => {
    if (!enabled || !eventId) return
    const token = localStorage.getItem("access_token")
    if (!token) return

    let attempts = 0
    let reconnectTimer = null
    let disposed = false

    function connect() {
      const ws = new WebSocket(socketUrl(`/api/events/${eventId}/whiteboard/ws`, token))
      wsRef.current = ws
      readyRef.current = false
      setStatus("connecting")

      ws.onmessage = (e) => {
        let message
        try {
          message = JSON.parse(e.data)
        } catch {
          return
        }
        if (message.type === "init") {
          attempts = 0
          readyRef.current = true
          setStatus("open")
          // Hand the pending queue to the page so it can re-apply it on top of the fresh state
          const pending = queueRef.current
          queueRef.current = []
          onMessageRef.current?.(message, pending)
          pending.forEach((m) => ws.send(JSON.stringify(m)))
          return
        }
        onMessageRef.current?.(message)
      }

      ws.onclose = (e) => {
        if (wsRef.current === ws) {
          wsRef.current = null
          readyRef.current = false
        }
        if (disposed) return
        if (e.code === 1008) {
          setStatus("denied")
          return
        }
        setStatus("closed")
        const delay = Math.min(1000 * 2 ** attempts, 15000)
        attempts++
        reconnectTimer = setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      disposed = true
      clearTimeout(reconnectTimer)
      wsRef.current?.close(1000, "Leaving whiteboard")
      wsRef.current = null
    }
  }, [eventId, enabled])

  const send = useCallback((message) => {
    const ws = wsRef.current
    if (ws && readyRef.current && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    } else if (DURABLE_TYPES.has(message.type)) {
      queueRef.current.push(message)
    }
  }, [])

  return { status, send }
}
