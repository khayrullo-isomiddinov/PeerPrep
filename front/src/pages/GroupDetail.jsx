import { useEffect, useState, useRef } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { createPortal } from "react-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faArrowLeft, faUsers, faTrophy, faStar, faGraduationCap, faBook,
  faCalendar, faCrown, faUser, faChevronRight, faComments, faPaperPlane, faCheckCircle,
  faUserPlus, faUserMinus, faTrash, faExclamationTriangle, faFire
} from "@fortawesome/free-solid-svg-icons"
import { getGroup, getGroupMembers, checkGroupMembership, joinGroup, leaveGroup, getGroupMessages, postGroupMessage, setGroupTypingStatus, getGroupTypingStatus, getGroupPresence, markGroupMessageRead, addGroupMessageReaction, deleteGroupMessage } from "../utils/api"
import { useAuth } from "../features/auth/AuthContext"
import MissionSubmissionsList from "../features/groups/MissionSubmissionsList"

export default function GroupDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [joined, setJoined] = useState(false)
  const [isLeader, setIsLeader] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [sendingMessage, setSendingMessage] = useState(false)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  const [presence, setPresence] = useState([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(null) // messageId or null
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
  
  // Common emojis for reactions
  const reactionEmojis = ["👍", "❤️", "😂", "😮", "😢", "🔥", "🎉", "👏", "💯", "✨"]

  useEffect(() => {
    async function loadGroup() {
      try {
        setLoading(true)
        setError("")
        const data = await getGroup(id)
        setGroup(data)
      } catch (err) {
        console.error("Failed to load group:", err)
        setError("Group not found")
      } finally {
        setLoading(false)
      }
    }
    loadGroup()
  }, [id])

  async function loadMessages(shouldScroll = false) {
    if (!group) return
    try {
      setMessagesLoading(true)
      const container = messagesContainerRef.current
      
      // Check scroll position BEFORE updating messages
      let wasNearBottom = false
      if (container && !shouldScroll) {
        const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight
        wasNearBottom = scrollBottom < 200
      }
      
      const messagesData = await getGroupMessages(group.id)
      const previousMessageCount = messages.length
      const hasNewMessages = (messagesData || []).length > previousMessageCount
      
      setMessages(messagesData || [])
      
      // Only auto-scroll if:
      // 1. User explicitly requested it (e.g., after sending a message)
      // 2. Or if user was already at the bottom and new messages arrived
      if (container) {
        if (shouldScroll) {
          shouldAutoScrollRef.current = true
          setTimeout(() => {
            container.scrollTop = container.scrollHeight
          }, 100)
        } else if (wasNearBottom && hasNewMessages) {
          shouldAutoScrollRef.current = true
          setTimeout(() => {
            container.scrollTop = container.scrollHeight
          }, 100)
        } else {
          shouldAutoScrollRef.current = false
        }
      }
    } catch (err) {
      console.error("Failed to load messages:", err)
    } finally {
      setMessagesLoading(false)
    }
  }

  // Mark messages as read when they're viewed
  useEffect(() => {
    if (!group || !user || (!joined && !(user && group.created_by === user.id)) || messages.length === 0) return
    
    // Mark all unread messages as read
    const unreadMessages = messages.filter(msg => 
      msg.user.id !== user.id && !msg.is_read_by_me
    )
    
    if (unreadMessages.length > 0) {
      // Mark messages as read (debounce to avoid too many requests)
      const timeoutId = setTimeout(() => {
        unreadMessages.forEach(msg => {
          markGroupMessageRead(group.id, msg.id).catch(err => {
            // Silently fail - read receipts are not critical
          })
        })
      }, 500)
      
      return () => clearTimeout(timeoutId)
    }
  }, [group, user, joined, messages])

  useEffect(() => {
    async function checkMembership() {
      if (isAuthenticated && group) {
        try {
          const membership = await checkGroupMembership(group.id)
          setJoined(!!membership.is_member)
          setIsLeader(!!membership.is_leader)
          
          // Load messages if user has joined or is owner
          const isOwner = user && group.created_by === user.id
          if (membership.is_member || isOwner) {
            loadMessages(true) // Scroll on initial load
            // Immediately update presence when viewing the page
            try {
              const presenceData = await getGroupPresence(group.id)
              setPresence(presenceData.presence || [])
            } catch (err) {
              // Silently fail
            }
          }
        } catch (err) {
          setJoined(false)
          setIsLeader(false)
        }
      }
    }
    checkMembership()
  }, [isAuthenticated, group, user])

  // WebSocket connection for real-time chat
  useEffect(() => {
    if (!group || (!joined && !(user && group.created_by === user.id))) {
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
      const wsUrl = `${wsProtocol}://${wsHost}/api/groups/${group.id}/ws?token=${token}`
      const ws = new WebSocket(wsUrl)
      
      ws.onopen = () => {
        console.log("Group chat WebSocket connected")
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
            try {
              ws.send(JSON.stringify({ type: "presence_ping" }))
            } catch (err) {
              console.error("Failed to send presence ping:", err)
            }
          }
        }, 30000) // Ping every 30 seconds
      }
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          handleWebSocketMessage(message)
          // Ensure connection status is true when receiving messages
          setWsConnected(true)
        } catch (err) {
          console.error("Error parsing WebSocket message:", err)
        }
      }
      
      ws.onerror = (error) => {
        console.error("Group chat WebSocket error:", error)
        // Don't immediately set to false - wait for onclose
        // setWsConnected(false)
      }
      
      ws.onclose = (event) => {
        console.log("Group chat WebSocket disconnected", event.code, event.reason)
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
            if (group && (joined || (user && group.created_by === user.id))) {
              console.log(`Attempting to reconnect (attempt ${reconnectAttemptsRef.current})...`)
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
  }, [group, joined, user, isAuthenticated])
  
  function handleWebSocketMessage(message) {
    switch (message.type) {
      case "initial_messages":
        // Track received message IDs to prevent duplicates
        const initialIds = new Set((message.messages || []).map(m => m.id))
        receivedMessageIdsRef.current = initialIds
        setMessages(message.messages || [])
        // Connection is confirmed when we receive initial messages
        setWsConnected(true)
        console.log("Received initial messages, connection confirmed")
        // Auto-scroll to bottom after initial load
        setTimeout(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
          }
        }, 100)
        break
      
      case "presence_update":
        // Keep connection alive - any message confirms connection
        setWsConnected(true)
        break
      
      case "new_message":
        const msgId = message.message?.id
        if (!msgId) break
        
        // Prevent duplicate messages
        if (receivedMessageIdsRef.current.has(msgId)) {
          console.log("Duplicate message detected, ignoring:", msgId)
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
        // This is a simplified version - you might want to fetch full user details
        break
      
      case "user_joined":
        // User joined - could update presence
        break
      
      case "user_left":
        // User left - could update presence
        break
    }
  }
  
  // Close emoji picker when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (showEmojiPicker && !e.target.closest('.emoji-picker-container')) {
        setShowEmojiPicker(null)
      }
    }
    
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmojiPicker])

  async function handleJoinLeave() {
    if (!isAuthenticated) {
      navigate("/login")
      return
    }
    setIsLoading(true)
    try {
      if (joined) {
        await leaveGroup(group.id)
        setJoined(false)
        setMessages([])
      } else {
        await joinGroup(group.id)
        setJoined(true)
        loadMessages()
        // Update presence immediately after joining
        try {
          const presenceData = await getGroupPresence(group.id)
          setPresence(presenceData.presence || [])
        } catch (err) {
          // Silently fail
        }
      }
    } catch (error) {
      console.error('Join/Leave failed:', error)
      alert(error?.response?.data?.detail || "Failed to join/leave group")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSendMessage(e) {
    e.preventDefault()
    if (!newMessage.trim() || sendingMessage || !group) return
    
    // Check if user is authenticated
    if (!isAuthenticated || !user) {
      alert("You must be logged in to send messages")
      navigate("/login")
      return
    }
    
    // Check if user is a member or owner
    if (!joined && !isOwner) {
      alert("You must join the group to send messages")
      return
    }
    
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
        await postGroupMessage(group.id, newMessage.trim())
        setNewMessage("")
        
        // Clear typing timeout when message is sent
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
          typingTimeoutRef.current = null
        }
        
        await loadMessages(true) // Force scroll after sending
      } catch (error) {
        console.error("Failed to send message:", error)
        const errorMessage = error?.response?.data?.detail || error?.message || "Failed to send message"
        alert(errorMessage)
        
        // If unauthorized, redirect to login
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          if (error?.response?.status === 401) {
            navigate("/login")
          }
        }
      } finally {
        setSendingMessage(false)
      }
    }
  }

  function handleTyping() {
    if (!group || !isAuthenticated || (!joined && !(user && group.created_by === user.id))) return
    
    // Send typing status via WebSocket if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "typing" }))
    } else {
      // Fallback to HTTP
      setGroupTypingStatus(group.id).catch(() => {
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

  function formatMessageTime(dateString) {
    if (!dateString) return "Just now"
    
    try {
      const date = new Date(dateString)
      const now = new Date()
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "Just now"
      }
      
      // Handle negative time differences (timezone issues)
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

  function formatDate(dateString) {
    if (!dateString) return "Not set"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  }

  const [members, setMembers] = useState([])
  const [deletingMessageId, setDeletingMessageId] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [messageToDelete, setMessageToDelete] = useState(null)
  const isOwner = user && group && group.created_by === user.id

  useEffect(() => {
    async function loadMembers() {
      if (!group) return
      try {
        const data = await getGroupMembers(group.id)
        setMembers(data || [])
      } catch (err) {
        console.error("Failed to load members:", err)
        setMembers([])
      }
    }
    if (group) {
      loadMembers()
    }
  }, [group])

  async function handleDeleteMessage(messageId) {
    if (!group || !messageId || deletingMessageId) return
    
    setShowDeleteConfirm(false)
    setDeletingMessageId(messageId)
    
    try {
      await deleteGroupMessage(group.id, messageId)
      const messagesData = await getGroupMessages(group.id)
      setMessages(messagesData || [])
    } catch (error) {
      console.error("Failed to delete message:", error)
      const errorMessage = error?.response?.data?.detail || "Failed to delete message"
      alert(errorMessage)
      
      if (error?.response?.status === 401) {
        navigate("/login")
      }
    } finally {
      setDeletingMessageId(null)
      setMessageToDelete(null)
    }
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
    if (messageToDelete) {
      await handleDeleteMessage(messageToDelete)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen tap-safe premium-scrollbar bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50/30 route-transition">
        <div className="nav-spacer" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="mx-auto mb-4 rounded-full h-12 w-12 border-2 border-pink-200 border-t-pink-500 animate-spin" />
            <p className="text-gray-600 text-lg">Loading group...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !group) {
    return (
      <div className="min-h-screen tap-safe premium-scrollbar bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50/30 route-transition">
        <div className="nav-spacer" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Group Not Found</h2>
            <p className="text-gray-600 mb-6">{error || "The group you're looking for doesn't exist."}</p>
            <Link to="/groups" className="btn-pink-pill">
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              Back to Groups
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isFull = group.members >= group.capacity
  const membershipPercentage = group.capacity > 0 ? Math.round((group.members / group.capacity) * 100) : 0

  return (
    <div className="min-h-screen tap-safe premium-scrollbar bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50/30 route-transition">
      <div className="nav-spacer" />
      
      {/* Cover Image - Thin */}
      {group.cover_image_url && (
        <section className="relative w-full">
          <div className="h-48 md:h-56 relative overflow-hidden">
            <img
              src={group.cover_image_url}
              alt={`${group.name} cover`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          </div>
        </section>
      )}
      
      <div className="container-page section space-y-6">
        {/* Back Button */}
        <Link
          to="/groups"
          className="inline-flex items-center gap-2 text-gray-700 hover:text-pink-600 transition-colors"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>Back to Groups</span>
        </Link>

        {/* 1. General Information Board - Top Wide Panel */}
        <section className="bg-white rounded-2xl shadow-xl border border-gray-200/60 p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Left: Group Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                {isOwner && (
                  <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full text-xs font-semibold">
                    <FontAwesomeIcon icon={faStar} className="mr-1.5" />
                    Creator
                  </span>
                )}
                {joined && !isOwner && (
                  <span className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full text-xs font-semibold">
                    <FontAwesomeIcon icon={faCheckCircle} className="mr-1.5" />
                    Member
                  </span>
                )}
                {isLeader && !isOwner && (
                  <span className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-full text-xs font-semibold">
                    <FontAwesomeIcon icon={faCrown} className="mr-1.5" />
                    Leader
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
                {group.name}
              </h1>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faGraduationCap} className="text-purple-500 w-4 h-4" />
                  <div>
                    <p className="text-xs text-gray-500">Field</p>
                    <p className="text-sm font-semibold text-gray-900">{group.field}</p>
                  </div>
                </div>
                {group.exam && (
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faBook} className="text-indigo-500 w-4 h-4" />
                    <div>
                      <p className="text-xs text-gray-500">Exam</p>
                      <p className="text-sm font-semibold text-gray-900">{group.exam}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faUsers} className="text-orange-500 w-4 h-4" />
                  <div>
                    <p className="text-xs text-gray-500">Members</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {group.members} / {group.capacity}
                    </p>
                  </div>
                </div>
                {group.deadline && (
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faCalendar} className="text-pink-500 w-4 h-4" />
                    <div>
                      <p className="text-xs text-gray-500">Deadline</p>
                      <p className="text-sm font-semibold text-gray-900">{formatDate(group.deadline)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Join/Leave Button */}
            {!isOwner && (
              <div className="flex-shrink-0">
                {!joined && !isFull && (
                  <button
                    onClick={handleJoinLeave}
                    disabled={isLoading}
                    className="touch-target bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 text-white font-bold rounded-xl px-8 py-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none w-full lg:w-auto"
                  >
                    <FontAwesomeIcon icon={faUserPlus} className="w-5 h-5 inline mr-2" />
                    {isLoading ? "Joining..." : "Join Group"}
                  </button>
                )}
                {joined && (
                  <button
                    onClick={handleJoinLeave}
                    disabled={isLoading}
                    className="touch-target bg-gray-100 text-gray-700 font-bold rounded-xl px-8 py-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none border-2 border-gray-300 w-full lg:w-auto"
                  >
                    <FontAwesomeIcon icon={faUserMinus} className="w-5 h-5 inline mr-2" />
                    {isLoading ? "Leaving..." : "Leave Group"}
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* 2. Two-Column Layout: Members (Left) and Chat (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Members - Vertical Column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200/60 overflow-hidden flex flex-col h-[400px] lg:h-[600px]">
              <div className="bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500 p-5 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <FontAwesomeIcon icon={faTrophy} className="text-white text-xl" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Members</h2>
                    <p className="text-white/80 text-sm">{group.members || 0} {group.members === 1 ? 'member' : 'members'}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 space-y-3 flex-1 overflow-y-auto premium-scrollbar">
                {members.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FontAwesomeIcon icon={faUsers} className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium">No members yet</p>
                  </div>
                ) : (
                  members.map((member, index) => {
                    const userPresence = presence.find(p => p.id === member.user_id)
                    const isOnline = userPresence?.is_online || false
                    
                    return (
                      <Link
                        key={member.id}
                        to={`/profile/${member.user_id}`}
                        className="group flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-gray-50 to-white border-2 border-gray-200 hover:border-orange-300 hover:shadow-lg transition-all duration-300"
                      >
                        <div className="flex-shrink-0 w-8 text-center">
                          {member.is_leader ? (
                            <FontAwesomeIcon icon={faCrown} className="text-yellow-500 text-lg" />
                          ) : (
                            <span className={`text-lg font-bold ${
                              index === 0 ? 'text-yellow-500' :
                              index === 1 ? 'text-gray-400' :
                              index === 2 ? 'text-orange-400' :
                              'text-gray-400'
                            }`}>
                              {index + 1}
                            </span>
                          )}
                        </div>
                        <div className="relative flex-shrink-0">
                          {member.user_photo_url ? (
                            <img
                              src={member.user_photo_url}
                              alt={member.user_name || member.user_email || "User"}
                              className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold border-2 border-white shadow-md">
                              {(member.user_name || member.user_email || "U")[0].toUpperCase()}
                            </div>
                          )}
                          {/* Online Status Indicator */}
                          <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${
                            isOnline ? 'bg-green-500' : 'bg-gray-400'
                          }`} title={isOnline ? 'Online' : 'Offline'} />
                          {member.is_leader && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center border-2 border-white">
                              <FontAwesomeIcon icon={faCrown} className="text-white text-xs" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900 truncate text-sm">
                              {member.user_name || member.user_email || "User"}
                            </p>
                            {member.user_is_verified && (
                              <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3 text-blue-500 flex-shrink-0" />
                            )}
                            {member.is_leader && (
                              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                                Leader
                              </span>
                            )}
                          </div>
                          {member.joined_at && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Joined {new Date(member.joined_at).toLocaleDateString()}
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
                        <h2 className="text-xl font-bold text-white">Group Chat</h2>
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
                        const isConsecutive = prevMsg && prevMsg.user.id === msg.user.id && 
                          (new Date(msg.created_at) - new Date(prevMsg.created_at)) < 300000
                        
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${!isConsecutive ? 'mt-3' : 'mt-1'}`}
                          >
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
                                  <>
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words flex-1">
                                      {msg.content}
                                    </p>
                                    {isOwnMessage && !msg.is_deleted && (
                                      <button
                                        onClick={() => handleDeleteClick(msg.id)}
                                        disabled={deletingMessageId === msg.id}
                                        className="touch-target opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity ml-2 p-2 hover:bg-white/20 rounded-lg disabled:opacity-50"
                                        title="Delete message"
                                      >
                                        {deletingMessageId === msg.id ? (
                                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                          <FontAwesomeIcon icon={faTrash} className="w-3 h-3 text-white/80 hover:text-white" />
                                        )}
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                              
                              {/* Reactions */}
                              {!msg.is_deleted && msg.reactions && msg.reactions.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-1.5 px-1">
                                    {msg.reactions.map((reaction, rIdx) => (
                                      <button
                                        key={rIdx}
                                        onClick={async () => {
                                          if (isAuthenticated && user && group) {
                                            try {
                                              await addGroupMessageReaction(group.id, msg.id, reaction.emoji)
                                              // Reload messages to get updated reactions
                                              const messagesData = await getGroupMessages(group.id)
                                              setMessages(messagesData || [])
                                            } catch (err) {
                                              console.error("Failed to toggle reaction:", err)
                                            }
                                          }
                                        }}
                                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all ${
                                          reaction.has_reacted
                                            ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                                            : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                                        }`}
                                        title={`${reaction.count} ${reaction.count === 1 ? 'person' : 'people'}`}
                                      >
                                        <span>{reaction.emoji}</span>
                                        <span className="font-medium">{reaction.count}</span>
                                      </button>
                                    ))}
                                    <div className="relative">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)
                                        }}
                                        className="touch-target flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-400 hover:text-gray-600 transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                                        title="Add reaction"
                                      >
                                        <span className="text-xs">+</span>
                                      </button>
                                      
                                      {/* Emoji Picker */}
                                      {showEmojiPicker === msg.id && (
                                        <div className="emoji-picker-container absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-2 z-50">
                                          <div className="grid grid-cols-5 gap-1">
                                            {reactionEmojis.map((emoji) => (
                                              <button
                                                key={emoji}
                                                onClick={async (e) => {
                                                  e.stopPropagation()
                                                  if (isAuthenticated && user && group) {
                                                    try {
                                                      await addGroupMessageReaction(group.id, msg.id, emoji)
                                                      const messagesData = await getGroupMessages(group.id)
                                                      setMessages(messagesData || [])
                                                      setShowEmojiPicker(null)
                                                    } catch (err) {
                                                      console.error("Failed to add reaction:", err)
                                                    }
                                                  }
                                                }}
                                                className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 rounded-lg transition-colors"
                                                title={emoji}
                                              >
                                                {emoji}
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                              {/* Add reaction button for messages without reactions */}
                              {!msg.is_deleted && (!msg.reactions || msg.reactions.length === 0) && (
                                  <div className="relative">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)
                                      }}
                                      className="touch-target opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity mt-1.5 px-3 py-2 text-xs text-gray-400 hover:text-gray-600 rounded-lg bg-gray-50 hover:bg-gray-100"
                                      title="Add reaction"
                                    >
                                      Add reaction
                                    </button>
                                    
                                    {/* Emoji Picker */}
                                    {showEmojiPicker === msg.id && (
                                      <div className="emoji-picker-container absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-2 z-50">
                                        <div className="grid grid-cols-5 gap-1">
                                          {reactionEmojis.map((emoji) => (
                                            <button
                                              key={emoji}
                                              onClick={async (e) => {
                                                e.stopPropagation()
                                                if (isAuthenticated && user && group) {
                                                  try {
                                                    await addGroupMessageReaction(group.id, msg.id, emoji)
                                                    const messagesData = await getGroupMessages(group.id)
                                                    setMessages(messagesData || [])
                                                    setShowEmojiPicker(null)
                                                  } catch (err) {
                                                    console.error("Failed to add reaction:", err)
                                                  }
                                                }
                                              }}
                                              className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 rounded-lg transition-colors"
                                              title={emoji}
                                            >
                                              {emoji}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                              {isOwnMessage && (
                                <div className="flex items-center gap-1.5 mt-1 px-1">
                                  <p className="text-[10px] text-gray-400">
                                    {formatMessageTime(msg.created_at)}
                                  </p>
                                  {msg.read_count > 0 && (
                                    <div className="flex items-center gap-1" title={`Read by ${msg.read_count} ${msg.read_count === 1 ? 'person' : 'people'}`}>
                                      <FontAwesomeIcon icon={faCheckCircle} className={`w-3 h-3 ${msg.read_count >= (group?.members || 0) ? 'text-blue-500' : 'text-gray-400'}`} />
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
                <p className="text-gray-500 mb-6">Join this group to participate in the group chat</p>
                <button
                  onClick={handleJoinLeave}
                  className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 text-white font-bold rounded-xl px-6 py-3 shadow-lg hover:shadow-xl transition-all"
                >
                  Join Group
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 3. Mission Description Area - Bottom Wide Panel */}
        {group.description && (
          <section className="bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 rounded-2xl shadow-xl border border-purple-200/60 p-6 lg:p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <FontAwesomeIcon icon={faStar} className="text-white text-xl" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Group Mission</h2>
                <p className="text-gray-600 text-sm">The challenge for this study group</p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-purple-200/60 shadow-sm">
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{group.description}</p>
            </div>
          </section>
        )}

        {/* 4. Mission Submissions Area - Bottom Wide Panel */}
        {isAuthenticated && (joined || isOwner) && (
          <section className="bg-white rounded-2xl shadow-xl border border-gray-200/60 p-6 lg:p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <FontAwesomeIcon icon={faStar} className="text-white text-xl" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Mission Submissions</h2>
                <p className="text-gray-600 text-sm">Submit and review mission completions</p>
              </div>
            </div>
            <MissionSubmissionsList groupId={group.id} isLeader={isLeader || isOwner} />
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
              Are you sure you want to delete this message? It will be replaced with a "This message has been deleted" indicator.
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



