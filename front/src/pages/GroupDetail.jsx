import { useEffect, useState, useRef } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faArrowLeft, faUsers, faTrophy, faStar, faGraduationCap, faBook,
  faCalendar, faCrown, faUser, faChevronRight, faComments, faPaperPlane, faCheckCircle
} from "@fortawesome/free-solid-svg-icons"
import { getGroup, getGroupMembers, checkGroupMembership, joinGroup, leaveGroup, getGroupMessages, postGroupMessage, setGroupTypingStatus, getGroupTypingStatus, getGroupPresence, markGroupMessageRead, addGroupMessageReaction } from "../utils/api"
import { useAuth } from "../features/auth/AuthContext"
import GroupMembersList from "../features/groups/GroupMembersList"
import GroupLeaderboard from "../features/groups/GroupLeaderboard"
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

  // Poll for new messages and typing status
  useEffect(() => {
    if (!group || (!joined && !(user && group.created_by === user.id))) return
    
    async function loadTypingStatus() {
      try {
        const typingData = await getGroupTypingStatus(group.id)
        setTypingUsers(typingData.typing_users || [])
      } catch (err) {
        // Silently fail - typing indicators are not critical
      }
    }
    
    async function loadPresence() {
      try {
        const presenceData = await getGroupPresence(group.id)
        setPresence(presenceData.presence || [])
      } catch (err) {
        // Silently fail - presence indicators are not critical
      }
    }
    
    const messageInterval = setInterval(loadMessages, 3000)
    const typingInterval = setInterval(loadTypingStatus, 1000) // Poll typing status more frequently
    const presenceInterval = setInterval(loadPresence, 5000) // Poll presence every 5 seconds
    
    return () => {
      clearInterval(messageInterval)
      clearInterval(typingInterval)
      clearInterval(presenceInterval)
    }
  }, [group, joined, user])
  
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
      alert(error?.response?.data?.detail || "Failed to send message")
    } finally {
      setSendingMessage(false)
    }
  }

  function handleTyping() {
    if (!group || !isAuthenticated || (!joined && !(user && group.created_by === user.id))) return
    
    // Send typing status
    setGroupTypingStatus(group.id).catch(() => {
      // Silently fail - typing indicators are not critical
    })
    
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

  if (loading) {
    return (
      <div className="min-h-screen tap-safe premium-scrollbar bg-white route-transition">
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
      <div className="min-h-screen tap-safe premium-scrollbar bg-white route-transition">
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

  const canDelete = user && group.created_by === user.id

  return (
    <div className="min-h-screen tap-safe premium-scrollbar bg-white route-transition">
      <div className="nav-spacer" />
      
      <section className="relative w-full">
        <div className="h-64 md:h-80 relative overflow-hidden">
          {group.cover_image_url ? (
            <img
              src={group.cover_image_url}
              alt={`${group.name} cover`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="h-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500" />
          )}
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 flex items-end">
            <div className="container-page w-full pb-8">
              <Link
                to="/groups"
                className="inline-flex items-center gap-2 text-white hover:text-pink-200 transition-colors mb-4"
              >
                <FontAwesomeIcon icon={faArrowLeft} />
                <span>Back to Groups</span>
              </Link>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-2">{group.name}</h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-white/90 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faGraduationCap} />
                  <span>{group.field}</span>
                </div>
                {group.exam && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faBook} />
                      <span>{group.exam}</span>
                    </div>
                  </>
                )}
                <span>•</span>
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faUsers} />
                  <span>{group.members || 0} members</span>
                </div>
                {group.deadline && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faCalendar} />
                      <span>Deadline: {formatDate(group.deadline)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="home-section bg-gray-50">
        <div className="home-section-inner">
          {/* Quick Actions Bar */}
          <div className="mb-6 premium-fade-in">
            {!canDelete && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
                {isAuthenticated ? (
                  <button
                    onClick={handleJoinLeave}
                    disabled={isLoading}
                    className={`w-full sm:w-auto sm:min-w-[200px] flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl font-semibold transition-all ${
                      joined
                        ? "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                        : "bg-gradient-to-r from-pink-500 to-pink-600 text-white hover:from-pink-600 hover:to-pink-700 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                    } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
                  >
                    <FontAwesomeIcon icon={joined ? faUser : faUsers} className="text-lg" />
                    <span>{isLoading ? (joined ? "Leaving..." : "Joining...") : (joined ? "Leave Group" : "Join Group")}</span>
                  </button>
                ) : (
                  <Link
                    to="/login"
                    className="w-full sm:w-auto sm:min-w-[200px] flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl font-semibold bg-gradient-to-r from-pink-500 to-pink-600 text-white hover:from-pink-600 hover:to-pink-700 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all"
                  >
                    <FontAwesomeIcon icon={faUsers} className="text-lg" />
                    <span>Join Group</span>
                  </Link>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* About Section */}
              {group.description && (
                <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 lg:p-8 premium-fade-in">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <FontAwesomeIcon icon={faBook} className="text-white text-lg" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">About This Group</h2>
                  </div>
                  <p className="text-gray-700 leading-relaxed text-base">{group.description}</p>
                </section>
              )}

              {/* Mission Section */}
              {group.mission_title && (
                <section className="bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 border-2 border-yellow-200 rounded-2xl p-6 lg:p-8 premium-fade-in shadow-md">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500 rounded-xl flex-shrink-0 shadow-lg">
                      <FontAwesomeIcon icon={faTrophy} className="text-white text-2xl" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-orange-900 mb-3">{group.mission_title}</h2>
                      {group.mission_description && (
                        <p className="text-orange-800 leading-relaxed mb-4">{group.mission_description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-orange-700 text-sm font-medium">
                        {group.mission_capacity != null && (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/60 rounded-lg">
                            <FontAwesomeIcon icon={faUsers} />
                            <span>{group.mission_capacity} max participants</span>
                          </div>
                        )}
                        {group.mission_badge_name && (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/60 rounded-lg">
                            <FontAwesomeIcon icon={faStar} />
                            <span>Badge: {group.mission_badge_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Members Section */}
              <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 lg:p-8 premium-fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
                    <FontAwesomeIcon icon={faUsers} className="text-white text-lg" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Members</h2>
                </div>
                <GroupMembersList groupId={group.id} presence={presence} />
              </section>

              {/* Leaderboard Section */}
              <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 lg:p-8 premium-fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
                    <FontAwesomeIcon icon={faTrophy} className="text-white text-lg" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Leaderboard</h2>
                </div>
                <GroupLeaderboard groupId={group.id} />
              </section>

              {/* Mission Submissions Section */}
              {isAuthenticated && (joined || canDelete) && (
                <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 lg:p-8 premium-fade-in">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                      <FontAwesomeIcon icon={faStar} className="text-white text-lg" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Mission Submissions</h2>
                  </div>
                  <MissionSubmissionsList groupId={group.id} isLeader={isLeader || canDelete} />
                </section>
              )}

              {/* Group Chat */}
              {(joined || canDelete) && (
                <section className="bg-white rounded-3xl shadow-2xl border border-gray-200/60 overflow-hidden flex flex-col h-[650px] premium-fade-in">
                  {/* Chat Header */}
                  <div className="relative bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 p-6 flex-shrink-0 overflow-hidden">
                    <div className="absolute inset-0 opacity-20" style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                    }}></div>
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-14 h-14 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-2xl flex items-center justify-center shadow-xl ring-2 ring-white/20">
                            <FontAwesomeIcon icon={faComments} className="text-white text-lg" />
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-slate-900"></div>
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-white mb-0.5">Group Chat</h2>
                          <p className="text-indigo-200 text-xs font-medium">
                            {messages.length > 0 ? `${messages.length} message${messages.length !== 1 ? 's' : ''} • Active` : 'Start chatting'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Messages Container */}
                  <div 
                    ref={messagesContainerRef}
                    className="flex-1 overflow-y-auto premium-scrollbar" 
                    style={{
                      background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
                      backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.03) 0%, transparent 50%)'
                    }}
                  >
                    {messagesLoading && messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="mx-auto mb-4 rounded-full h-12 w-12 border-2 border-indigo-200 border-t-indigo-500 animate-spin" />
                          <p className="text-gray-600 text-sm">Loading messages...</p>
                        </div>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full px-6">
                        <div className="text-center max-w-sm">
                          <div className="relative mb-6">
                            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 rounded-3xl flex items-center justify-center shadow-lg">
                              <FontAwesomeIcon icon={faComments} className="w-12 h-12 text-indigo-400" />
                            </div>
                            <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                              <FontAwesomeIcon icon={faPaperPlane} className="w-4 h-4 text-white" />
                            </div>
                          </div>
                          <h3 className="text-xl font-bold text-gray-800 mb-2">No messages yet</h3>
                          <p className="text-gray-500 text-sm leading-relaxed">Be the first to break the ice! Start a conversation with your group members.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="px-5 py-6 space-y-1">
                        {messages.map((msg, index) => {
                          const isOwnMessage = user && msg.user.id === user.id
                          const prevMsg = index > 0 ? messages[index - 1] : null
                          const nextMsg = index < messages.length - 1 ? messages[index + 1] : null
                          const isConsecutive = prevMsg && prevMsg.user.id === msg.user.id && 
                            (new Date(msg.created_at) - new Date(prevMsg.created_at)) < 300000
                          const isLastInGroup = !nextMsg || nextMsg.user.id !== msg.user.id || 
                            (new Date(nextMsg.created_at) - new Date(msg.created_at)) > 300000
                          
                          return (
                            <div
                              key={msg.id}
                              className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${!isConsecutive ? 'mt-4' : 'mt-1'}`}
                            >
                              {!isOwnMessage && (
                                <div className={`flex-shrink-0 ${isConsecutive ? 'opacity-0' : 'opacity-100'} transition-opacity mr-2`}>
                                  {!isConsecutive ? (
                                    msg.user.photo_url ? (
                                      <div className="relative">
                                        <img
                                          src={msg.user.photo_url}
                                          alt={msg.user.name || "User"}
                                          className="w-10 h-10 rounded-xl object-cover ring-2 ring-white shadow-md"
                                        />
                                        {msg.user.is_verified && (
                                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center ring-2 ring-white">
                                            <FontAwesomeIcon icon={faCheckCircle} className="w-2.5 h-2.5 text-white" />
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold ring-2 ring-white shadow-md">
                                        {(msg.user.name || msg.user.email || "U")[0].toUpperCase()}
                                      </div>
                                    )
                                  ) : (
                                    <div className="w-10" />
                                  )}
                                </div>
                              )}
                              
                              <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} flex-1 min-w-0 max-w-[70%]`}>
                                {!isOwnMessage && !isConsecutive && (
                                  <div className="flex items-center gap-2 mb-1.5 px-1">
                                    <span className="text-xs font-bold text-gray-700">
                                      {msg.user.name || msg.user.email || "User"}
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-medium">
                                      {formatMessageTime(msg.created_at)}
                                    </span>
                                  </div>
                                )}
                                <div className={`relative group ${
                                  isOwnMessage 
                                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white' 
                                    : 'bg-white text-gray-800 border border-gray-200/80'
                                } rounded-2xl ${isConsecutive ? 'rounded-t-lg' : ''} px-4 py-2.5 shadow-sm hover:shadow-md transition-shadow`}>
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words font-medium">
                                    {msg.content}
                                  </p>
                                  {isOwnMessage && (
                                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-gradient-to-br from-indigo-500 to-purple-600 transform rotate-45 rounded-sm"></div>
                                  )}
                                  {!isOwnMessage && (
                                    <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border-l border-b border-gray-200/80 transform rotate-45 rounded-sm"></div>
                                  )}
                                </div>
                                
                                {/* Reactions */}
                                {msg.reactions && msg.reactions.length > 0 && (
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
                                        className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-400 hover:text-gray-600 transition-all opacity-0 group-hover:opacity-100"
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
                                {(!msg.reactions || msg.reactions.length === 0) && (
                                  <div className="relative">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)
                                      }}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity mt-1.5 px-1 text-xs text-gray-400 hover:text-gray-600"
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
                                
                                {isOwnMessage && isLastInGroup && (
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
                  <div className="p-5 bg-gradient-to-b from-white to-gray-50/50 border-t border-gray-200/60 flex-shrink-0">
                    <form onSubmit={handleSendMessage} className="relative">
                      <div className="flex items-center gap-3 bg-white rounded-2xl border-2 border-gray-200/60 shadow-lg hover:border-indigo-300/60 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-100 transition-all duration-200 p-1">
                        <input
                          type="text"
                        value={newMessage}
                        onChange={(e) => {
                          setNewMessage(e.target.value)
                          handleTyping()
                        }}
                          placeholder="Write a message..."
                          className="flex-1 px-4 py-3 bg-transparent border-0 outline-none text-gray-900 placeholder-gray-400 text-sm font-medium"
                          maxLength={1000}
                          disabled={sendingMessage}
                        />
                        <div className="flex items-center gap-2 pr-2">
                          {newMessage.length > 0 && (
                            <span className="text-[10px] text-gray-400 font-medium px-2 py-1 bg-gray-100 rounded-lg">
                              {newMessage.length}/1000
                            </span>
                          )}
                          <button
                            type="submit"
                            disabled={!newMessage.trim() || sendingMessage}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 ${
                              newMessage.trim() && !sendingMessage
                                ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-md hover:shadow-lg transform hover:scale-105'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            {sendingMessage ? (
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <FontAwesomeIcon icon={faPaperPlane} className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Group Stats Card */}
              <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 premium-fade-in sticky top-24">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <FontAwesomeIcon icon={faGraduationCap} className="text-white text-lg" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Group Info</h3>
                </div>
                <div className="space-y-5">
                  <div className="pb-4 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <FontAwesomeIcon icon={faUsers} className="text-blue-500" />
                        Members
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-gray-900">{group.members || 0}</span>
                      <span className="text-sm text-gray-500">/ {group.capacity || 10}</span>
                    </div>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-cyan-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(((group.members || 0) / (group.capacity || 10)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="pb-4 border-b border-gray-200">
                    <div className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                      <FontAwesomeIcon icon={faGraduationCap} className="text-purple-500" />
                      Field of Study
                    </div>
                    <span className="text-base font-semibold text-gray-900">{group.field}</span>
                  </div>

                  {group.exam && (
                    <div className="pb-4 border-b border-gray-200">
                      <div className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                        <FontAwesomeIcon icon={faBook} className="text-green-500" />
                        Exam/Certification
                      </div>
                      <span className="text-base font-semibold text-gray-900">{group.exam}</span>
                    </div>
                  )}

                  {group.deadline && (
                    <div>
                      <div className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                        <FontAwesomeIcon icon={faCalendar} className="text-orange-500" />
                        Deadline
                      </div>
                      <span className="text-base font-semibold text-gray-900">{formatDate(group.deadline)}</span>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}



