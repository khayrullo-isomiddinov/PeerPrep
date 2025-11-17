import { useEffect, useState, useRef, useCallback } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { createPortal } from "react-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faArrowLeft, faUsers, faCalendar, faMapMarkerAlt, faClock,
  faUserPlus, faUserMinus, faFile, faDownload, faCheckCircle,
  faFire, faStar, faTrophy, faInfoCircle, faChevronRight, faComments, faPaperPlane, faUpload, faTrash, faExclamationTriangle, faGraduationCap
} from "@fortawesome/free-solid-svg-icons"
import { getEvent, getEventAttendeesWithDetails, joinEvent, leaveEvent, getEventMessages, postEventMessage, deleteEventMessage, setEventTypingStatus, getEventTypingStatus, getEventPresence, markEventMessageRead, getUserProfile } from "../utils/api"
import { useAuth } from "../features/auth/AuthContext"
import { usePrefetch } from "../utils/usePrefetch"
import { startPageLoad, endPageLoad } from "../utils/usePageLoader"
import { DetailPageSkeleton } from "../components/SkeletonLoader"

export default function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const { prefetch } = usePrefetch()
  const [event, setEvent] = useState(null)
  const [attendees, setAttendees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [joined, setJoined] = useState(null) // null = loading, true/false = loaded
  const [isLoading, setIsLoading] = useState(false)
  const [isJoining, setIsJoining] = useState(false) // Track if we're joining (true) or leaving (false)
  const [isOwner, setIsOwner] = useState(false)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [sendingMessage, setSendingMessage] = useState(false)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [deletingMessageId, setDeletingMessageId] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [messageToDelete, setMessageToDelete] = useState(null)
  const [typingUsers, setTypingUsers] = useState([])
  const [presence, setPresence] = useState([])
  const typingTimeoutRef = useRef(null)
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const shouldAutoScrollRef = useRef(true)
  const wsRef = useRef(null)
  const [wsConnected, setWsConnected] = useState(false)
  const presencePingIntervalRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)
  const messageQueueRef = useRef([])
  const receivedMessageIdsRef = useRef(new Set())
  const markedReadIdsRef = useRef(new Set())

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login")
    }
  }, [isAuthenticated, navigate])

  const loadMessages = useCallback(async (shouldScroll = false) => {
    if (!id) return
    try {
      const messagesData = await getEventMessages(id)
      setMessages(messagesData || [])
      // Only scroll on initial load if explicitly requested, or if user just sent a message
      if (shouldScroll && messagesContainerRef.current) {
        setTimeout(() => {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
        }, 100)
      }
    } catch (err) {
      console.error("Failed to load messages:", err)
    }
  }, [id])

  const loadEvent = useCallback(async (force = false, skipMessages = false) => {
    if (!isAuthenticated || !id) {
      return
    }
    const pageId = `event:${id}`
    try {
      // Check cache first (unless forcing refresh)
      const { getCachedPage, setCachedPage } = await import("../utils/pageCache")
      const cached = getCachedPage(`event:${id}`)
      
      if (cached && cached.data && !force) {
        // Show cached data instantly
        setEvent(cached.data)
        const userIsOwner = user && cached.data.created_by === user.id
        setIsOwner(userIsOwner)
        setLoading(false)
        endPageLoad(pageId)
        
        // Load attendees and messages in parallel
        Promise.all([
          getEventAttendeesWithDetails(id).then(data => {
            setAttendees(data)
            let userJoined = false
            if (user && isAuthenticated) {
              // Check if user is in attendees list OR is the owner
              const userAttendee = data.find(a => a.id === user.id)
              userJoined = !!userAttendee || userIsOwner
              setJoined(userJoined)
            } else {
              setJoined(false)
            }
            return userJoined || userIsOwner
          }),
          cached.isExpired ? getEvent(id).then(data => {
            setEvent(data)
            setCachedPage(`event:${id}`, data)
          }) : Promise.resolve()
        ]).then(([shouldLoadMessages]) => {
          if (shouldLoadMessages && !skipMessages) {
            loadMessages(false)
            getEventPresence(id).then(data => {
              setPresence(data.presence || [])
            }).catch(() => {})
          }
        })
        return
      }
      
      // No cache or forcing refresh, load normally
      if (!force) {
        startPageLoad(pageId)
        setLoading(true)
      }
      setError("")
      const data = await getEvent(id)
      setEvent(data)
      setCachedPage(`event:${id}`, data)
      
      const userIsOwner = user && data.created_by === user.id
      setIsOwner(userIsOwner)
      
      // Always refresh attendees to get updated member counts
      const attendeesData = await getEventAttendeesWithDetails(id)
      setAttendees(attendeesData)
      
      // Set joined state immediately from attendees data
      // User is considered "joined" if they're in the attendees list OR they're the owner
      let userJoined = false
      if (user && isAuthenticated) {
        const userAttendee = attendeesData.find(a => a.id === user.id)
        userJoined = !!userAttendee || userIsOwner
        setJoined(userJoined)
      } else {
        setJoined(false)
      }
      
      // Load messages but don't auto-scroll on initial page load
      // Skip messages if WebSocket is connected (real-time updates handle messages)
      if ((userJoined || userIsOwner) && !skipMessages) {
        loadMessages(false)
        // Immediately update presence when viewing the page
        try {
          const presenceData = await getEventPresence(id)
          setPresence(presenceData.presence || [])
        } catch (err) {
          // Silently fail
        }
      }
    } catch (err) {
      console.error("Failed to load event:", err)
      setError("Event not found")
    } finally {
      if (!force) {
        setLoading(false)
        endPageLoad(`event:${id}`)
      }
    }
  }, [id, user, isAuthenticated, loadMessages])

  useEffect(() => {
    loadEvent()
  }, [loadEvent])
  
  // Periodic polling to keep data fresh (only metadata, not messages)
  // Poll every 5 seconds to catch changes from other users (like member counts)
  // Skip messages if WebSocket is connected to avoid flickering read marks
  useEffect(() => {
    if (!id || !event) return
    
    const pollInterval = setInterval(() => {
      if (!document.hidden && event) {
        // Only update metadata (event data, attendees) but skip messages
        // Messages are handled by WebSocket in real-time
        const isWsConnected = wsRef.current && wsRef.current.readyState === WebSocket.OPEN
        loadEvent(true, isWsConnected) // Skip messages if WebSocket is connected
      }
    }, 5000) // 5 seconds - good balance between freshness and performance
    
    return () => clearInterval(pollInterval)
  }, [id, event, loadEvent, wsConnected])
  
  // Sync joined state when event data changes (e.g., from cache updates)
  useEffect(() => {
    if (event && event.is_joined !== undefined && joined !== null) {
      if (event.is_joined !== joined) {
        setJoined(event.is_joined)
      }
    }
  }, [event?.is_joined, joined])

  // Mark messages as read when they're viewed
  // Use a ref to track which messages we've already marked to prevent re-marking
  useEffect(() => {
    if (!id || !user || joined === null || (!joined && !isOwner) || messages.length === 0) return
    
    // Mark all unread messages as read (only if not already marked)
    const unreadMessages = messages.filter(msg => 
      msg.user.id !== user.id && 
      !msg.is_read_by_me && 
      !markedReadIdsRef.current.has(msg.id)
    )
    
    if (unreadMessages.length > 0) {
      // Mark messages as read via WebSocket if connected, otherwise HTTP
      const timeoutId = setTimeout(() => {
        unreadMessages.forEach(msg => {
          // Track that we're marking this message
          markedReadIdsRef.current.add(msg.id)
          
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: "mark_read",
              message_id: msg.id
            }))
          } else {
            // Fallback to HTTP
            markEventMessageRead(id, msg.id).catch(err => {
              // If it fails, remove from tracked set so we can retry
              markedReadIdsRef.current.delete(msg.id)
            })
          }
        })
      }, 500)
      
      return () => clearTimeout(timeoutId)
    }
  }, [id, user, joined, isOwner, messages])

  // WebSocket connection for real-time chat
  useEffect(() => {
    if (!id || joined === null || (!joined && !isOwner)) {
      // Disconnect if conditions not met
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
        setWsConnected(false)
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      reconnectAttemptsRef.current = 0
      messageQueueRef.current = []
      return
    }
    
    if (!isAuthenticated || !user) return
    
    const token = localStorage.getItem("access_token")
    if (!token) return
    
    function connectWebSocket() {
      // Clear any existing reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      
      // Connect WebSocket
      const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
      const wsProtocol = apiBase.startsWith("https") ? "wss" : "ws"
      const wsHost = apiBase.replace(/^https?:\/\//, "").replace(/\/$/, "")
      const wsUrl = `${wsProtocol}://${wsHost}/api/events/${id}/ws?token=${token}`
      const ws = new WebSocket(wsUrl)
      
      ws.onopen = () => {
        setWsConnected(true)
        reconnectAttemptsRef.current = 0 // Reset on successful connection
        
        // Send queued messages
        while (messageQueueRef.current.length > 0) {
          const queuedMessage = messageQueueRef.current.shift()
          try {
            ws.send(JSON.stringify(queuedMessage))
          } catch (err) {
            console.error("Failed to send queued message:", err)
            // Re-queue if send fails
            messageQueueRef.current.unshift(queuedMessage)
            break
          }
        }
        
        // Start presence ping interval
        presencePingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "presence_ping" }))
          }
        }, 30000) // Ping every 30 seconds
      }
      
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data)
        handleWebSocketMessage(message)
      }
      
      ws.onerror = (error) => {
        console.error("Event chat WebSocket error:", error)
        setWsConnected(false)
      }
      
      ws.onclose = (event) => {
        setWsConnected(false)
        if (presencePingIntervalRef.current) {
          clearInterval(presencePingIntervalRef.current)
          presencePingIntervalRef.current = null
        }
        
        // Only attempt reconnection if it wasn't a manual close (code 1000) or auth error (1008)
        if (event.code !== 1000 && event.code !== 1008) {
          // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
          reconnectAttemptsRef.current++
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (id && (joined || isOwner)) {
              // Attempting to reconnect
              connectWebSocket()
            }
          }, delay)
        } else {
          reconnectAttemptsRef.current = 0
        }
      }
      
      wsRef.current = ws
    }
    
    connectWebSocket()
    
    return () => {
      if (presencePingIntervalRef.current) {
        clearInterval(presencePingIntervalRef.current)
        presencePingIntervalRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounting")
        wsRef.current = null
      }
      setWsConnected(false)
      reconnectAttemptsRef.current = 0
    }
  }, [id, joined, isOwner, user, isAuthenticated])
  
  function handleWebSocketMessage(message) {
    switch (message.type) {
      case "initial_messages":
        // Track received message IDs to prevent duplicates
        const initialIds = new Set((message.messages || []).map(m => m.id))
        receivedMessageIdsRef.current = initialIds
        setMessages(message.messages || [])
        // Auto-scroll to bottom after initial load
        setTimeout(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
          }
        }, 100)
        break
      
      case "new_message":
        const msgId = message.message?.id
        if (!msgId) break
        
        // Prevent duplicate messages
        if (receivedMessageIdsRef.current.has(msgId)) {
          // Duplicate message detected, ignoring
          break
        }
        receivedMessageIdsRef.current.add(msgId)
        
        setMessages(prev => {
          // Double-check for duplicates in state
          if (prev.some(m => m.id === msgId)) {
            return prev
          }
          return [...prev, message.message]
        })
        // Auto-scroll if near bottom
        setTimeout(() => {
          if (messagesContainerRef.current) {
            const container = messagesContainerRef.current
            const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200
            if (isNearBottom) {
              container.scrollTop = container.scrollHeight
            }
          }
        }, 100)
        break
      
      case "message_deleted":
        // Update the message to mark it as deleted
        const deletedMsgId = message.message_id
        if (deletedMsgId) {
          setMessages(prev => prev.map(m => 
            m.id === deletedMsgId 
              ? { ...m, is_deleted: true, content: "" }
              : m
          ))
        }
        break
      
      case "typing":
        if (message.user_id !== user?.id) {
          setTypingUsers(prev => {
            if (prev.some(u => u.id === message.user_id)) {
              return prev
            }
            return [...prev, { id: message.user_id, name: message.user_name }]
          })
          // Remove typing indicator after 3 seconds
          setTimeout(() => {
            setTypingUsers(prev => prev.filter(u => u.id !== message.user_id))
          }, 3000)
        }
        break
      
      case "presence_update":
        // Update presence based on online users
        break
      
      case "message_read":
        // Update read status for a message
        setMessages(prev => prev.map(msg => 
          msg.id === message.message_id 
            ? { ...msg, is_read_by_me: true }
            : msg
        ))
        break
      
      case "user_joined":
        // User joined - could update presence
        break
      
      case "user_left":
        // User left - could update presence
        break
    }
  }
  
  async function handleJoinLeave() {
    if (!isAuthenticated || joined === null) {
      if (!isAuthenticated) {
        navigate("/login")
      }
      return
    }
    setIsLoading(true)
    // Track what action we're performing
    const wasJoined = joined
    setIsJoining(!wasJoined) // true if joining, false if leaving
    // Don't do optimistic update - keep button in original state during loading
    // setJoined(wasJoined ? false : true)
    
    try {
      if (wasJoined) {
        const result = await leaveEvent(id)
        if (result && result.success) {
          // Update state after successful leave
          setJoined(false)
          setMessages([])
          // Use server-provided count for accuracy
          const updatedEvent = { 
            ...event, 
            is_joined: false, 
            attendee_count: result.attendee_count ?? event.attendee_count 
          }
          setEvent(updatedEvent)
          
          // Immediately remove current user from attendees list (optimistic update)
          if (user) {
            setAttendees(prevAttendees => prevAttendees.filter(a => a.id !== user.id))
          }
          
          // Invalidate all caches to ensure fresh data
          const { invalidateCache } = await import("../utils/pageCache")
          invalidateCache(`event:${id}`)
          invalidateCache("events")
          invalidateCache("home:events")
          
          // Also fetch fresh attendees list in background to ensure accuracy
          getEventAttendeesWithDetails(id).then(data => setAttendees(data || [])).catch(() => {})
        }
      } else {
        const result = await joinEvent(id)
        if (result && result.success) {
          // Update state immediately for smooth UI
          setJoined(true)
          // Use server-provided count for accuracy
          const updatedEvent = { 
            ...event, 
            is_joined: true, 
            attendee_count: result.attendee_count ?? event.attendee_count 
          }
          setEvent(updatedEvent)
          
          // Invalidate all caches to ensure fresh data
          const { invalidateCache } = await import("../utils/pageCache")
          invalidateCache(`event:${id}`)
          invalidateCache("events")
          invalidateCache("home:events")
          
          // Load additional data in parallel (non-blocking)
          Promise.all([
            getEventAttendeesWithDetails(id).then(data => setAttendees(data)).catch(() => {}),
            getEventMessages(id).then(data => setMessages(data || [])).catch(() => {}),
            getEventPresence(id).then(data => setPresence(data.presence || [])).catch(() => {})
          ])
        }
      }
    } catch (error) {
      // Revert optimistic update on error
      setJoined(wasJoined)
      console.error('Join/Leave failed:', error)
      alert(error?.response?.data?.detail || "Failed to join/leave event")
    } finally {
      setIsLoading(false)
      setIsJoining(false)
    }
  }

  async function handleSendMessage(e) {
    e.preventDefault()
    e.stopPropagation()
    if (!newMessage.trim() || sendingMessage || !id) return
    
    // Send via WebSocket if connected, otherwise queue or fallback to HTTP
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      setSendingMessage(true)
      try {
        const messageData = {
          type: "message",
          content: newMessage.trim()
        }
        wsRef.current.send(JSON.stringify(messageData))
        setNewMessage("")
        
        // Clear typing timeout when message is sent
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
          typingTimeoutRef.current = null
        }
      } catch (error) {
        console.error("Failed to send message via WebSocket:", error)
        // Queue message for retry when connection is restored
        messageQueueRef.current.push({
          type: "message",
          content: newMessage.trim()
        })
        alert("Connection lost. Message will be sent when connection is restored.")
      } finally {
        setSendingMessage(false)
      }
    } else if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
      // Queue message if WebSocket is connecting
      messageQueueRef.current.push({
        type: "message",
        content: newMessage.trim()
      })
      setNewMessage("")
      alert("Connecting... Message will be sent when connection is established.")
    } else {
      // Fallback to HTTP POST
      setSendingMessage(true)
      try {
        await postEventMessage(id, newMessage.trim())
        setNewMessage("")
        
        // Clear typing timeout when message is sent
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
          typingTimeoutRef.current = null
        }
        
        const messagesData = await getEventMessages(id)
        setMessages(messagesData || [])
        setTimeout(() => {
          if (messagesContainerRef.current && messagesEndRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
          }
        }, 100)
      } catch (error) {
        console.error("Failed to send message:", error)
        alert(error?.response?.data?.detail || "Failed to send message")
      } finally {
        setSendingMessage(false)
      }
    }
  }

  function handleTyping() {
    if (!id || !isAuthenticated || joined === null || (!joined && !isOwner)) return
    
    // Send typing status via WebSocket if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "typing" }))
    } else {
      // Fallback to HTTP
      setEventTypingStatus(id).catch(() => {
        // Silently fail - typing indicators are not critical
      })
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // Set new timeout to stop typing indicator after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      // Typing status will expire on backend after 3 seconds
    }, 2000)
  }

  function handleDeleteClick(messageId) {
    if (!isAuthenticated || !user) {
      alert("You must be logged in to delete messages")
      navigate("/login")
      return
    }
    setMessageToDelete(messageId)
    setShowDeleteConfirm(true)
  }

  async function handleDeleteConfirm() {
    if (!id || !messageToDelete || deletingMessageId) return
    
    setShowDeleteConfirm(false)
    setDeletingMessageId(messageToDelete)
    
    try {
      await deleteEventMessage(id, messageToDelete)
      const messagesData = await getEventMessages(id)
      setMessages(messagesData || [])
    } catch (error) {
      console.error("Failed to delete message:", error)
      const errorMessage = error?.response?.data?.detail || "Failed to delete message"
      alert(errorMessage)
      
      // If unauthorized, redirect to login
      if (error?.response?.status === 401) {
        navigate("/login")
      }
    } finally {
      setDeletingMessageId(null)
      setMessageToDelete(null)
    }
  }

  function formatDate(dateString) {
    if (!dateString) return "Not set"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  }

  function formatTime(dateString) {
    if (!dateString) return "Not set"
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    })
  }

  function formatMessageTime(dateString) {
    if (!dateString) return "Just now"
    
    try {
      const date = new Date(dateString)
      const now = new Date()
      
      if (isNaN(date.getTime())) {
        return "Just now"
      }
      
      const diff = now.getTime() - date.getTime()
      if (diff < 0) {
        return "Just now"
      }
      
      const seconds = Math.floor(diff / 1000)
      const minutes = Math.floor(seconds / 60)
      
      if (seconds < 5) return "Just now"
      if (seconds < 60) return `${seconds}s ago`
      if (minutes < 1) return "Just now"
      if (minutes < 60) return `${minutes}m ago`
      const hours = Math.floor(minutes / 60)
      if (hours < 24) return `${hours}h ago`
      const days = Math.floor(hours / 24)
      if (days < 7) return `${days}d ago`
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    } catch (e) {
      return "Just now"
    }
  }

  function parseStudyMaterials(studyMaterialsJson) {
    if (!studyMaterialsJson) return []
    try {
      return JSON.parse(studyMaterialsJson)
    } catch {
      return []
    }
  }

  function formatFileSize(bytes) {
    if (!bytes) return "Unknown size"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function getFileIcon(type) {
    if (!type) return '📎'
    if (type.includes('pdf')) return '📄'
    if (type.includes('word') || type.includes('document')) return '📝'
    if (type.includes('excel') || type.includes('spreadsheet')) return '📊'
    if (type.includes('image')) return '🖼️'
    if (type.includes('video')) return '🎥'
    if (type.includes('audio')) return '🎵'
    if (type.includes('zip') || type.includes('archive')) return '📦'
    return '📎'
  }

  function downloadFile(material) {
    const link = document.createElement('a')
    link.href = material.data
    link.download = material.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null
  }

  // Don't render until data is ready (GitHub-style)
  if (loading || !event) {
    return <DetailPageSkeleton />
  }

  if (error) {
    return (
      <div className="min-h-screen tap-safe premium-scrollbar bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50/30 route-transition">
        <div className="nav-spacer" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h2>
            <p className="text-gray-600 mb-6">{error || "The event you're looking for doesn't exist."}</p>
            <Link to="/events" className="btn-pink-pill">
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              Back to Events
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const studyMaterials = parseStudyMaterials(event.study_materials)
  const isFull = attendees.length >= event.capacity
  const attendancePercentage = event.capacity > 0 ? Math.round((attendees.length / event.capacity) * 100) : 0

  return (
    <div className="min-h-screen tap-safe premium-scrollbar bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50/30 route-transition">
      <div className="nav-spacer" />
      
      {/* Cover Image - Thin */}
      {event.cover_image_url && (
        <section className="relative w-full">
          <div className="h-48 md:h-56 relative overflow-hidden">
            <img
              src={event.cover_image_url}
              alt={`${event.title} cover`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          </div>
        </section>
      )}
      
      <div className="container-page section space-y-6">
        {/* Back Button */}
        <Link
          to="/events"
          className="inline-flex items-center gap-2 text-gray-700 hover:text-pink-600 transition-colors"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>Back to Events</span>
        </Link>

        {/* 1. General Information Board - Top Wide Panel */}
        <section className="bg-white rounded-2xl shadow-xl border border-gray-200/60 p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Left: Event Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                {isOwner && (
                  <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full text-xs font-semibold">
                    <FontAwesomeIcon icon={faStar} className="mr-1.5" />
                    Organizer
                  </span>
                )}
                {joined && !isOwner && (
                  <span className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full text-xs font-semibold">
                    <FontAwesomeIcon icon={faCheckCircle} className="mr-1.5" />
                    Attending
                  </span>
                )}
                {isFull && (
                  <span className="px-3 py-1 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full text-xs font-semibold">
                    <FontAwesomeIcon icon={faFire} className="mr-1.5" />
                    Full
                  </span>
                )}
              </div>
              <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-3">
                {event.title}
              </h1>
              {event.description && (
                <p className="text-gray-600 text-base mb-4 max-w-3xl">
                  {event.description}
                </p>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCalendar} className="text-pink-500 w-4 h-4" />
                  <div>
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="text-sm font-semibold text-gray-900">{formatDate(event.starts_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faClock} className="text-purple-500 w-4 h-4" />
                  <div>
                    <p className="text-xs text-gray-500">Time</p>
                    <p className="text-sm font-semibold text-gray-900">{formatTime(event.starts_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="text-indigo-500 w-4 h-4" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Location</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">{event.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faUsers} className="text-orange-500 w-4 h-4" />
                  <div>
                    <p className="text-xs text-gray-500">Capacity</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {attendees.length} / {event.capacity}
                    </p>
                  </div>
                </div>
                {event.exam && (
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faGraduationCap} className="text-green-500 w-4 h-4" />
                    <div>
                      <p className="text-xs text-gray-500">Exam</p>
                      <p className="text-sm font-semibold text-gray-900">{event.exam}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Join/Leave Button */}
            {!isOwner && (
              <div className="flex-shrink-0">
                {joined === null && !isFull && (
                  <div className="flex items-center gap-2 px-8 py-4 bg-gray-100 text-gray-400 rounded-xl font-bold w-full lg:w-auto">
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                    <span>Loading...</span>
                  </div>
                )}
                {joined === false && !isFull && (
                  <button
                    onClick={handleJoinLeave}
                    disabled={isLoading}
                    className="touch-target bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 text-white font-bold rounded-xl px-8 py-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none w-full lg:w-auto"
                  >
                    <FontAwesomeIcon icon={faUserPlus} className="w-5 h-5 inline mr-2" />
                    {isLoading ? (isJoining ? "Joining..." : "Leaving...") : "Join Event"}
                  </button>
                )}
                {joined === true && (
                  <button
                    onClick={handleJoinLeave}
                    disabled={isLoading}
                    className="touch-target bg-gray-100 text-gray-700 font-bold rounded-xl px-8 py-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none border-2 border-gray-300 w-full lg:w-auto"
                  >
                    <FontAwesomeIcon icon={faUserMinus} className="w-5 h-5 inline mr-2" />
                    {isLoading ? (isJoining ? "Joining..." : "Leaving...") : "Leave Event"}
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* 2. Two-Column Layout: Leaderboard (Left) and Chat (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Leaderboard - Vertical Column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200/60 overflow-hidden flex flex-col h-[400px] lg:h-[600px]">
              <div className="bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500 p-5 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <FontAwesomeIcon icon={faTrophy} className="text-white text-xl" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Members</h2>
                    <p className="text-white/80 text-sm">{attendees.length} participants</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 space-y-3 flex-1 overflow-y-auto premium-scrollbar">
                {attendees.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FontAwesomeIcon icon={faUsers} className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium">No participants yet</p>
                  </div>
                ) : (
                  attendees.map((attendee, index) => {
                    const userPresence = presence.find(p => p.id === attendee.id)
                    const isOnline = userPresence?.is_online || false
                    
                    return (
                      <Link
                        key={attendee.id}
                        to={`/profile/${attendee.id}`}
                        onMouseEnter={() => prefetch(`profile:${attendee.id}`, () => getUserProfile(attendee.id))}
                        className="group flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-gray-50 to-white border-2 border-gray-200 hover:border-orange-300 hover:shadow-lg transition-all duration-300"
                      >
                        <div className="flex-shrink-0 w-8 text-center">
                          <span className={`text-lg font-bold ${
                            index === 0 ? 'text-yellow-500' :
                            index === 1 ? 'text-gray-400' :
                            index === 2 ? 'text-orange-400' :
                            'text-gray-400'
                          }`}>
                            {index + 1}
                          </span>
                        </div>
                        <div className="relative flex-shrink-0">
                          {attendee.photo_url ? (
                            <img
                              src={attendee.photo_url}
                              alt={attendee.name || "User"}
                              className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold border-2 border-white shadow-md">
                              {(attendee.name || attendee.email || "U")[0].toUpperCase()}
                            </div>
                          )}
                          {/* Online Status Indicator */}
                          <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${
                            isOnline ? 'bg-green-500' : 'bg-gray-400'
                          }`} title={isOnline ? 'Online' : 'Offline'} />
                          {index === 0 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center border-2 border-white">
                              <FontAwesomeIcon icon={faTrophy} className="text-white text-xs" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900 truncate text-sm">
                              {attendee.name || attendee.email || "User"}
                            </p>
                            {attendee.is_verified && (
                              <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3 text-blue-500 flex-shrink-0" />
                            )}
                          </div>
                          {attendee.joined_at && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Joined {new Date(attendee.joined_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </Link>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right: Group Chat - Large Messaging Area */}
          <div className="lg:col-span-2">
            {(joined || isOwner) ? (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200/60 overflow-hidden flex flex-col h-[400px] lg:h-[600px]">
                {/* Chat Header */}
                <div className="relative bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 p-5 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                        <FontAwesomeIcon icon={faComments} className="text-white" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-900"></div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-white">Event Chat</h2>
                        {wsConnected ? (
                          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Connected"></span>
                        ) : (
                          <span className="w-2 h-2 bg-red-400 rounded-full" title="Disconnected"></span>
                        )}
                      </div>
                      <p className="text-indigo-200 text-xs">
                        {messages.length > 0 ? `${messages.length} message${messages.length !== 1 ? 's' : ''} • ${wsConnected ? 'Connected' : 'Reconnecting...'}` : wsConnected ? 'Start chatting' : 'Connecting...'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages Container */}
                <div 
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto premium-scrollbar p-4" 
                  style={{
                    background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
                  }}
                >
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <FontAwesomeIcon icon={faComments} className="w-10 h-10 text-indigo-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">No messages yet</h3>
                        <p className="text-gray-500 text-sm">Be the first to start the conversation!</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {messages.map((msg, index) => {
                        const isOwnMessage = user && msg.user.id === user.id
                        const prevMsg = index > 0 ? messages[index - 1] : null
                        const nextMsg = index < messages.length - 1 ? messages[index + 1] : null
                        const isConsecutive = prevMsg && prevMsg.user.id === msg.user.id && 
                          (new Date(msg.created_at) - new Date(prevMsg.created_at)) < 300000
                        
                        return (
                          <div
                            key={msg.id}
                            className={`relative flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${!isConsecutive ? 'mt-3' : 'mt-1'}`}
                          >
                            {isOwnMessage && !msg.is_deleted && (
                              <div className="absolute left-0 top-0">
                                <button
                                  onClick={() => handleDeleteClick(msg.id)}
                                  disabled={deletingMessageId === msg.id}
                                  className="touch-target p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                                  title="Delete message"
                                >
                                  {deletingMessageId === msg.id ? (
                                    <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                                  )}
                                </button>
                              </div>
                            )}
                            
                            {!isOwnMessage && (
                              <div className={`flex-shrink-0 ${isConsecutive ? 'opacity-0' : 'opacity-100'} transition-opacity mr-2`}>
                                {!isConsecutive ? (
                                  msg.user.photo_url ? (
                                    <img
                                      src={msg.user.photo_url}
                                      alt={msg.user.name || "User"}
                                      className="w-8 h-8 rounded-lg object-cover ring-2 ring-white shadow-sm"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white shadow-sm">
                                      {(msg.user.name || msg.user.email || "U")[0].toUpperCase()}
                                    </div>
                                  )
                                ) : (
                                  <div className="w-8" />
                                )}
                              </div>
                            )}
                            
                            <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} flex-1 min-w-0 max-w-[75%] group`}>
                              {!isOwnMessage && !isConsecutive && (
                                <div className="flex items-center gap-2 mb-1 px-1">
                                  <span className="text-xs font-bold text-gray-700">
                                    {msg.user.name || msg.user.email || "User"}
                                  </span>
                                  <span className="text-[10px] text-gray-400">
                                    {formatMessageTime(msg.created_at)}
                                  </span>
                                </div>
                              )}
                              <div className={`relative flex items-center gap-2 ${
                                isOwnMessage 
                                  ? msg.is_deleted 
                                    ? 'bg-gray-300/50 text-gray-500 border border-gray-300/50' 
                                    : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                                  : msg.is_deleted
                                    ? 'bg-gray-200/50 text-gray-500 border border-gray-300/50'
                                    : 'bg-white text-gray-800 border border-gray-200/80'
                              } rounded-xl px-3 py-2 shadow-sm ${msg.is_deleted ? 'italic' : ''}`}>
                                {msg.is_deleted ? (
                                  <p className="text-xs leading-relaxed flex-1 flex items-center gap-2">
                                    <FontAwesomeIcon icon={faTrash} className="w-3 h-3 opacity-50" />
                                    <span>This message has been deleted</span>
                                  </p>
                                ) : (
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words flex-1">
                                    {msg.content}
                                  </p>
                                )}
                              </div>
                              
                              {isOwnMessage && (
                                <div className="flex items-center gap-1.5 mt-1 px-1">
                                  <p className="text-[10px] text-gray-400">
                                    {formatMessageTime(msg.created_at)}
                                  </p>
                                  {!msg.is_deleted && msg.read_count > 0 && (
                                    <div className="flex items-center gap-1" title={`Read by ${msg.read_count} ${msg.read_count === 1 ? 'person' : 'people'}`}>
                                      <FontAwesomeIcon icon={faCheckCircle} className={`w-3 h-3 ${msg.read_count >= attendees.length ? 'text-blue-500' : 'text-gray-400'}`} />
                                      {msg.read_count > 1 && (
                                        <span className="text-[9px] text-gray-400">{msg.read_count}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {isOwnMessage && (
                              <div className={`flex-shrink-0 ml-2 ${isConsecutive ? 'opacity-0' : 'opacity-100'} transition-opacity`}>
                                {!isConsecutive ? (
                                  user?.photo_url ? (
                                    <img
                                      src={user.photo_url}
                                      alt={user.name || "You"}
                                      className="w-8 h-8 rounded-lg object-cover ring-2 ring-white shadow-sm"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white shadow-sm">
                                      {(user?.name || user?.email || "U")[0].toUpperCase()}
                                    </div>
                                  )
                                ) : (
                                  <div className="w-8" />
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                      
                      {/* Typing Indicator */}
                      {typingUsers.length > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 italic">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                          <span>
                            {typingUsers.length === 1 
                              ? `${typingUsers[0].name} is typing...`
                              : `${typingUsers.length} people are typing...`
                            }
                          </span>
                        </div>
                      )}
                      
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Message Input */}
                <div className="p-4 bg-gradient-to-b from-white to-gray-50/50 border-t border-gray-200/60 flex-shrink-0">
                  <form onSubmit={handleSendMessage} className="relative" onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      e.stopPropagation()
                      handleSendMessage(e)
                    }
                  }}>
                    <div className="flex items-center gap-2 bg-white rounded-xl border-2 border-gray-200/60 shadow-md hover:border-indigo-300/60 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all p-1">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => {
                          setNewMessage(e.target.value)
                          handleTyping()
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            e.stopPropagation()
                            handleSendMessage(e)
                          }
                        }}
                        placeholder="Write a message..."
                        className="flex-1 px-3 py-2 bg-transparent border-0 outline-none text-gray-900 placeholder-gray-400 text-sm"
                        maxLength={1000}
                        disabled={sendingMessage}
                      />
                      <button
                        type="submit"
                        disabled={!newMessage.trim() || sendingMessage}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleSendMessage(e)
                        }}
                        className={`touch-target w-11 h-11 flex items-center justify-center rounded-lg transition-all ${
                          newMessage.trim() && !sendingMessage
                            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white hover:scale-110 active:scale-95'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {sendingMessage ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <FontAwesomeIcon icon={faPaperPlane} className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200/60 p-12 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FontAwesomeIcon icon={faComments} className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Join to Chat</h3>
                <p className="text-gray-500 mb-6">Join this event to participate in the group chat</p>
                <button
                  onClick={handleJoinLeave}
                  className="touch-target bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 text-white font-bold rounded-xl px-6 py-3 shadow-lg hover:shadow-xl transition-all active:scale-95"
                >
                  Join Event
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 3. Mission Submission Area - Bottom Wide Panel */}
        {studyMaterials.length > 0 && (
          <section className="bg-white rounded-2xl shadow-xl border border-gray-200/60 p-6 lg:p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <FontAwesomeIcon icon={faFile} className="text-white text-xl" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Study Materials</h2>
                <p className="text-gray-600 text-sm">{studyMaterials.length} file{studyMaterials.length !== 1 ? 's' : ''} available</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {studyMaterials.map((material, index) => (
                <div
                  key={index}
                  className="group flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-lg flex items-center justify-center text-2xl shadow-md">
                      {getFileIcon(material.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{material.name}</p>
                      <p className="text-xs text-gray-600">{formatFileSize(material.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => downloadFile(material)}
                    className="ml-3 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md hover:shadow-lg flex-shrink-0"
                    title="Download file"
                  >
                    <FontAwesomeIcon icon={faDownload} className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Delete Message Confirmation Modal */}
      {showDeleteConfirm && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => {
            setShowDeleteConfirm(false)
            setMessageToDelete(null)
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all"
            style={{
              animation: 'slideUpFadeIn 0.3s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-white text-xl" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Delete Message</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete this message? 
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={handleDeleteConfirm}
                disabled={deletingMessageId !== null}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white font-semibold rounded-xl hover:from-red-600 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingMessageId ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-2" />
                    Deleting...
                  </>
                ) : (
                  'Delete Message'
                )}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setMessageToDelete(null)
                }}
                disabled={deletingMessageId !== null}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
