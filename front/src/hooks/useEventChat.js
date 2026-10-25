import { useCallback, useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { markEventMessageRead, postEventMessage, setEventTypingStatus } from "../utils/api"
import { openSocket } from "../utils/socket"
import { useEventMessages, useEventPresence, eventDataKeys } from "./useEventData"

const PRESENCE_PING_MS = 30 * 1000
const FALLBACK_POLL_MS = 30 * 1000
const TYPING_THROTTLE_MS = 2000
const TYPING_DISPLAY_MS = 3000
const MARK_READ_DELAY_MS = 500

// Real-time event chat: messages, typing indicators, read receipts and presence over one WebSocket.
// Messages and presence live in the React Query cache; while the socket is down they're polled instead.
export function useEventChat(eventId, { enabled, userId }) {
  const queryClient = useQueryClient()
  const [connected, setConnected] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  const [chatError, setChatError] = useState("")

  const wsRef = useRef(null)
  const queueRef = useRef([]) // messages typed while the socket was still connecting
  const markedReadRef = useRef(new Set())
  const lastTypingSentRef = useRef(0)
  const typingTimersRef = useRef(new Map())
  const handleMessageRef = useRef(null)

  const pollInterval = enabled && !connected ? FALLBACK_POLL_MS : false
  const { data: messages = [] } = useEventMessages(eventId, { enabled, refetchInterval: pollInterval })
  const { data: presenceData } = useEventPresence(eventId, { enabled, refetchInterval: pollInterval })

  const messagesKey = eventDataKeys.messages(eventId)
  const presenceKey = eventDataKeys.presence(eventId)

  // Latest message handler, read by the long-lived socket callbacks
  useEffect(() => {
    const setOnline = (isOnline) => (old) => old && {
      presence: old.presence.map((p) => ({ ...p, is_online: isOnline(p) })),
    }

    handleMessageRef.current = (message) => {
      switch (message.type) {
        case "initial_messages":
          queryClient.setQueryData(messagesKey, message.messages || [])
          break
        case "new_message": {
          const incoming = message.message
          if (!incoming?.id) break
          queryClient.setQueryData(messagesKey, (prev = []) =>
            prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming])
          break
        }
        case "message_deleted":
          queryClient.setQueryData(messagesKey, (prev = []) =>
            prev.map((m) => (m.id === message.message_id ? { ...m, is_deleted: true, content: "" } : m)))
          break
        case "typing": {
          if (message.user_id === userId) break
          setTypingUsers((prev) => (prev.some((u) => u.id === message.user_id)
            ? prev
            : [...prev, { id: message.user_id, name: message.user_name }]))
          clearTimeout(typingTimersRef.current.get(message.user_id))
          typingTimersRef.current.set(message.user_id, setTimeout(() => {
            setTypingUsers((prev) => prev.filter((u) => u.id !== message.user_id))
          }, TYPING_DISPLAY_MS))
          break
        }
        case "presence_update": {
          // The server lists the *other* members who are online right now
          const online = new Set(message.online_users || [])
          queryClient.setQueryData(presenceKey, setOnline((p) => p.id === userId || online.has(p.id)))
          break
        }
        case "user_joined":
          queryClient.setQueryData(presenceKey, setOnline((p) => p.is_online || p.id === message.user_id))
          break
        case "user_left":
          queryClient.setQueryData(presenceKey, setOnline((p) => p.is_online && p.id !== message.user_id))
          setTypingUsers((prev) => prev.filter((u) => u.id !== message.user_id))
          break
        case "error":
          if (message.message) setChatError(message.message)
          break
      }
    }
  })

  useEffect(() => {
    if (!enabled || !eventId) return
    const token = localStorage.getItem("access_token")
    if (!token) return

    let disposed = false
    let attempts = 0
    let reconnectTimer = null
    let pingTimer = null

    function connect() {
      const ws = openSocket(`/api/events/${eventId}/ws`, token)
      wsRef.current = ws

      ws.onopen = () => {
        attempts = 0
        setConnected(true)
        while (queueRef.current.length > 0) ws.send(JSON.stringify(queueRef.current.shift()))
        ws.send(JSON.stringify({ type: "presence_ping" }))
        pingTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "presence_ping" }))
        }, PRESENCE_PING_MS)
      }

      ws.onmessage = (e) => {
        let message
        try {
          message = JSON.parse(e.data)
        } catch {
          return
        }
        handleMessageRef.current?.(message)
      }

      ws.onclose = (e) => {
        clearInterval(pingTimer)
        if (wsRef.current === ws) wsRef.current = null
        setConnected(false)
        // 1000 = we closed it, 1008 = server refused (not a member / bad token): don't retry those
        if (disposed || e.code === 1000 || e.code === 1008) return
        const delay = Math.min(1000 * 2 ** attempts, 30 * 1000)
        attempts++
        reconnectTimer = setTimeout(connect, delay)
      }
    }

    connect()
    const typingTimers = typingTimersRef.current

    return () => {
      disposed = true
      clearTimeout(reconnectTimer)
      clearInterval(pingTimer)
      wsRef.current?.close(1000, "Leaving chat")
      wsRef.current = null
      queueRef.current = []
      typingTimers.forEach(clearTimeout)
      typingTimers.clear()
      setConnected(false)
      setTypingUsers([])
    }
  }, [eventId, enabled])

  // Mark other people's messages as read shortly after they appear
  useEffect(() => {
    if (!enabled || !userId) return
    const unread = messages.filter((m) => m.user?.id !== userId && !m.is_read_by_me && !markedReadRef.current.has(m.id))
    if (unread.length === 0) return

    const timer = setTimeout(() => {
      for (const m of unread) {
        markedReadRef.current.add(m.id)
        const ws = wsRef.current
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "mark_read", message_id: m.id }))
        } else {
          markEventMessageRead(eventId, m.id).catch(() => markedReadRef.current.delete(m.id))
        }
      }
    }, MARK_READ_DELAY_MS)
    return () => clearTimeout(timer)
  }, [messages, enabled, userId, eventId])

  // Sends over the socket when possible, queues while connecting, otherwise falls back to HTTP.
  // Throws (with the API error) only when the HTTP fallback fails.
  const sendMessage = useCallback(async (content) => {
    const text = content.trim()
    if (!text) return
    const payload = { type: "message", content: text }
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload))
    } else if (ws?.readyState === WebSocket.CONNECTING) {
      queueRef.current.push(payload)
    } else {
      await postEventMessage(eventId, text)
      queryClient.invalidateQueries({ queryKey: eventDataKeys.messages(eventId) })
    }
  }, [eventId, queryClient])

  const notifyTyping = useCallback(() => {
    const now = Date.now()
    if (now - lastTypingSentRef.current < TYPING_THROTTLE_MS) return
    lastTypingSentRef.current = now
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "typing" }))
    } else {
      setEventTypingStatus(eventId).catch(() => {})
    }
  }, [eventId])

  const clearChatError = useCallback(() => setChatError(""), [])

  return {
    messages,
    presence: presenceData?.presence || [],
    connected,
    typingUsers,
    chatError,
    clearChatError,
    sendMessage,
    notifyTyping,
  }
}
