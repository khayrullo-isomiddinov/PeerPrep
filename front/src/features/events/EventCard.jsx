import { useEffect, useState, useRef, useMemo, useCallback, memo } from "react"
import { createPortal } from "react-dom"
import { useNavigate, Link } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { 
  faCalendarAlt, faMapMarkerAlt, faUsers, faClock, 
  faEdit, faTrash,
  faGraduationCap, faBook, faMicroscope, faCode,
  faMusic, faPalette, faDumbbell, faHeartbeat
} from "@fortawesome/free-solid-svg-icons"
import { deleteEvent, getAttendees, joinEvent, leaveEvent, getEvent } from "../../utils/api"
import { useAuth } from "../auth/AuthContext"
import { usePrefetch } from "../../utils/usePrefetch"

function EventCard({ event, onChanged, onDelete, onEdit }) {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const { prefetch } = usePrefetch()
  const currentId = useMemo(() => user ? Number(user.id ?? user?.user?.id) : null, [user])
  const creatorId = useMemo(() => event.created_by != null ? Number(event.created_by) : null, [event.created_by])
  const mine = useMemo(() => currentId != null && creatorId === currentId, [currentId, creatorId])

  // Use enriched data from API - simple and straightforward
  const count = event.attendee_count ?? 0
  const isJoinedFromAPI = event.is_joined ?? false
  
  const [joined, setJoined] = useState(() => {
    // Initialize from API data if available
    if (mine) return true
    return isJoinedFromAPI
  })
  
  const [busyJoin, setBusyJoin] = useState(false)
  const [busyLeave, setBusyLeave] = useState(false)
  const [busyDelete, setBusyDelete] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [err, setErr] = useState("")

  // Update joined state when API data is available - simple sync
  useEffect(() => {
    if (mine) {
      setJoined(true)
    } else if (!busyJoin && !busyLeave) {
      // Only update if not in the middle of an operation
      setJoined(isJoinedFromAPI)
    }
  }, [mine, isJoinedFromAPI, busyJoin, busyLeave])

  const full = count >= event.capacity

  async function onJoin() {
    // Prevent multiple simultaneous operations
    if (busyJoin || busyLeave) {
      return
    }
    
    setErr("")
    setBusyJoin(true)
    const previousJoined = joined
    
    try {
      const result = await joinEvent(event.id)
      
      if (result?.success) {
        setJoined(true)
        // Use server-provided count for accuracy
        const updatedEvent = {
          ...event,
          is_joined: true,
          attendee_count: result.attendee_count ?? event.attendee_count
        }
        // Invalidate cache to ensure fresh data when navigating
        import("../../utils/pageCache").then(({ invalidateCache }) => {
          invalidateCache(`event:${event.id}`)
          invalidateCache("events")
          invalidateCache("home:events")
        })
        onChanged?.(updatedEvent)
      } else {
        setErr("Unexpected response from server")
        setTimeout(() => setErr(""), 5000)
      }
    } catch (e) {
      setJoined(previousJoined) // Revert on error
      const errorMsg = e?.response?.data?.detail || e?.message || "Join failed"
      setErr(errorMsg)
      setTimeout(() => setErr(""), 5000)
    } finally {
      setBusyJoin(false)
    }
  }

  async function onLeave() {
    // Prevent multiple simultaneous operations
    if (busyJoin || busyLeave) {
      return
    }
    
    setErr("")
    setBusyLeave(true)
    const previousJoined = joined
    
    try {
      const result = await leaveEvent(event.id)
      
      if (result?.success) {
        setJoined(false)
        // Use server-provided count for accuracy
        const updatedEvent = {
          ...event,
          is_joined: false,
          attendee_count: result.attendee_count ?? event.attendee_count
        }
        // Invalidate cache to ensure fresh data when navigating
        import("../../utils/pageCache").then(({ invalidateCache }) => {
          invalidateCache(`event:${event.id}`)
          invalidateCache("events")
          invalidateCache("home:events")
        })
        onChanged?.(updatedEvent)
      }
    } catch (e) {
      setJoined(previousJoined) // Revert on error
      const errorMsg = e?.response?.data?.detail || "Leave failed"
      setErr(errorMsg)
      setTimeout(() => setErr(""), 5000)
    } finally {
      setBusyLeave(false)
    }
  }

  function handleDeleteClick() {
    setShowDeleteConfirm(true)
  }

  async function handleDeleteConfirm() {
    setShowDeleteConfirm(false)
    setErr("")
    setBusyDelete(true)
    try {
      await deleteEvent(event.id)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            if (onDelete) {
              onDelete(event.id)
            } else {
              onChanged?.()
            }
          }, 350)
        })
      })
    } catch (e) {
      setErr(e?.response?.data?.detail || "Delete failed")
      setBusyDelete(false)
    }
  }


  const getCategoryIcon = (title, description) => {
    const text = (title + " " + (description || "")).toLowerCase()
    if (text.includes("math") || text.includes("calculus") || text.includes("algebra")) return faGraduationCap
    if (text.includes("science") || text.includes("biology") || text.includes("chemistry") || text.includes("physics")) return faMicroscope
    if (text.includes("tech") || text.includes("programming") || text.includes("coding") || text.includes("computer")) return faCode
    if (text.includes("literature") || text.includes("english") || text.includes("writing") || text.includes("book")) return faBook
    if (text.includes("art") || text.includes("design") || text.includes("creative")) return faPalette
    if (text.includes("music") || text.includes("sound") || text.includes("audio")) return faMusic
    if (text.includes("sport") || text.includes("fitness") || text.includes("exercise")) return faDumbbell
    if (text.includes("health") || text.includes("medical") || text.includes("medicine")) return faHeartbeat
    return faGraduationCap
  }

  const getCategoryColor = (title, description) => {
    const text = (title + " " + (description || "")).toLowerCase()
    if (text.includes("math") || text.includes("calculus") || text.includes("algebra")) return "text-blue-600"
    if (text.includes("science") || text.includes("biology") || text.includes("chemistry") || text.includes("physics")) return "text-green-600"
    if (text.includes("tech") || text.includes("programming") || text.includes("coding") || text.includes("computer")) return "text-purple-600"
    if (text.includes("literature") || text.includes("english") || text.includes("writing") || text.includes("book")) return "text-orange-600"
    if (text.includes("art") || text.includes("design") || text.includes("creative")) return "text-pink-600"
    if (text.includes("music") || text.includes("sound") || text.includes("audio")) return "text-indigo-600"
    if (text.includes("sport") || text.includes("fitness") || text.includes("exercise")) return "text-red-600"
    if (text.includes("health") || text.includes("medical") || text.includes("medicine")) return "text-emerald-600"
    return "text-gray-600"
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Tomorrow"
    if (diffDays < 7) return `In ${diffDays} days`
    return date.toLocaleDateString()
  }

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const handleCardClick = (e) => {
    if (!isAuthenticated) {
      e.preventDefault()
      navigate("/login")
      return
    }
  }

  return (
    <div className="relative">
      <Link 
        to={isAuthenticated ? `/events/${event.id}` : "#"}
        onClick={handleCardClick}
        onMouseEnter={() => isAuthenticated && prefetch(`event:${event.id}`, () => getEvent(event.id))}
        className="group block bg-white rounded-xl border border-gray-200/80 overflow-hidden premium-hover hover:border-gray-300 hover:shadow-lg transition-all duration-300"
      >
      <div className="flex">
            {/* Compact Image/Thumbnail */}
            <div className="w-24 h-24 flex-shrink-0 relative overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
              {event.cover_image_url ? (
                <img 
                  src={event.cover_image_url} 
                  alt={event.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
                  <FontAwesomeIcon icon={getCategoryIcon(event.title, event.description)} className="w-8 h-8 text-white/80" />
                </div>
              )}
              {mine && (
                <div className="absolute top-1 left-1">
                  <span className="px-1.5 py-0.5 bg-blue-500/90 backdrop-blur-sm text-white rounded text-[10px] font-semibold">
                    Owner
                  </span>
                </div>
              )}
              {full && !mine && (
                <div className="absolute top-1 left-1">
                  <span className="px-1.5 py-0.5 bg-red-500/90 backdrop-blur-sm text-white rounded text-[10px] font-semibold">
                    Full
                  </span>
                </div>
              )}
            </div>

            {/* Content Section */}
            <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-gray-900 mb-2 truncate group-hover:text-indigo-600 transition-colors">
                  {event.title}
                </h3>
                
                <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                  <div className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faCalendarAlt} className="w-3 h-3" />
                    <span>{formatDate(event.starts_at)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faClock} className="w-3 h-3" />
                    <span>{formatTime(event.starts_at)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{event.location}</span>
                </div>
                {event.exam && (
                  <div className="flex items-center gap-1 text-xs text-indigo-600 mb-3">
                    <FontAwesomeIcon icon={faGraduationCap} className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate font-medium">{event.exam}</span>
                  </div>
                )}
              </div>

              {/* Bottom Actions Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <FontAwesomeIcon icon={faUsers} className="w-3 h-3" />
                  <span className="font-medium">{count}/{event.capacity}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {!mine && isAuthenticated && joined && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (!busyLeave) onLeave()
                      }}
                      className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-md text-xs font-semibold"
                    >
                      Leave
                    </button>
                  )}
                  {!mine && isAuthenticated && !joined && !full && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (!busyJoin) onJoin()
                      }}
                      className="px-3 py-1.5 bg-indigo-500 text-white rounded-md text-xs font-semibold"
                    >
                      Join
                    </button>
                  )}
                  {!mine && !isAuthenticated && !full && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        navigate("/login")
                      }}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-xs font-semibold"
                    >
                      Join
                    </button>
                  )}
                  {mine && (
                    <>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onEdit && onEdit(event)
                        }}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
                        title="Edit Event"
                      >
                        <FontAwesomeIcon icon={faEdit} className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleDeleteClick()
                        }}
                        disabled={busyDelete}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete Event"
                      >
                        <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
      </Link>
      
      {err && (
        <div className="fixed top-20 right-4 z-[10000] max-w-xs animate-in fade-in slide-in-from-top-2">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 shadow-lg">
            <p className="text-red-600 text-sm font-medium">{err}</p>
          </div>
        </div>
      )}

      {showDeleteConfirm && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ease-out"
          style={{ 
            animation: 'fadeIn 0.3s ease-out',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            position: 'fixed',
            width: '100vw',
            height: '100vh',
            minHeight: '100vh'
          }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4"
            style={{ 
              animation: 'slideUpFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              transform: 'translateY(0)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">Delete Event?</h3>
                <p className="text-gray-600 mt-1">Are you sure you want to delete <span className="font-semibold">"{event.title}"</span>?</p>
              </div>
            </div>
            

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white bg-red-500 hover:bg-red-600 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg"
              >
                Delete Event
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUpFadeIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  )
}

export default memo(EventCard)
