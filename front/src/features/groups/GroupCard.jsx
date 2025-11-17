import { useState, useEffect, useCallback, memo, useRef } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faUsers,
  faTrash,
  faGraduationCap, faBook, faEdit
} from "@fortawesome/free-solid-svg-icons"
import { checkGroupMembership, joinGroup, leaveGroup, deleteGroup, getGroup } from "../../utils/api"
import { Link } from "react-router-dom"
import { usePrefetch } from "../../utils/usePrefetch"

function GroupCard({ group, onDelete, isDeleting = false, canDelete = false, isAuthenticated = false, onEdit, onJoinLeave }) {
  
  const memberCount = group.member_count ?? group.members ?? 0
  const isJoinedFromAPI = group.is_joined ?? false
  
  const [joined, setJoined] = useState(() => {
    if (canDelete) return true
    return isJoinedFromAPI
  })
  const [busyJoin, setBusyJoin] = useState(false)
  const [busyLeave, setBusyLeave] = useState(false)
  const [busyDelete, setBusyDelete] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [err, setErr] = useState("")
  const navigate = useNavigate()
  const { prefetch } = usePrefetch()

  // Update joined state when API data is available - simple sync
  useEffect(() => {
    if (canDelete) {
      setJoined(true)
    } else if (!busyJoin && !busyLeave) {
      // Only update if not in the middle of an operation
      setJoined(isJoinedFromAPI)
    }
  }, [canDelete, isJoinedFromAPI, busyJoin, busyLeave])

  const full = memberCount >= (group.capacity ?? Infinity)

  async function onJoin() {
    if (busyJoin || busyLeave) return
    setErr("")
    setBusyJoin(true)
    const previousJoined = joined

    try {
      const result = await joinGroup(group.id)

      if (result?.success) {
        setJoined(true)
        const updatedGroup = {
          ...group,
          is_joined: true,
          member_count: result.member_count ?? group.member_count,
          members: result.member_count ?? group.members
        }
        // Invalidate cache to ensure fresh data when navigating
        import("../../utils/pageCache").then(({ invalidateCache }) => {
          invalidateCache(`group:${group.id}`)
          invalidateCache("groups")
        })
        onJoinLeave?.(group.id, true, updatedGroup)
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
    if (busyJoin || busyLeave) return
    setErr("")
    setBusyLeave(true)
    const previousJoined = joined

    try {
      const result = await leaveGroup(group.id)

      if (result?.success) {
        setJoined(false)
        const updatedGroup = {
          ...group,
          is_joined: false,
          member_count: result.member_count ?? group.member_count,
          members: result.member_count ?? group.members
        }
        // Invalidate cache to ensure fresh data when navigating
        import("../../utils/pageCache").then(({ invalidateCache }) => {
          invalidateCache(`group:${group.id}`)
          invalidateCache("groups")
        })
        onJoinLeave?.(group.id, false, updatedGroup)
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
      await deleteGroup(group.id)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            if (onDelete) {
              onDelete(group.id)
            }
          }, 350)
        })
      })
    } catch (e) {
      setErr(e?.response?.data?.detail || "Delete failed")
      setBusyDelete(false)
    }
  }

  const getCategoryIcon = (field) => {
    const fieldLower = (field || "").toLowerCase()
    if (fieldLower.includes("math") || fieldLower.includes("calculus") || fieldLower.includes("algebra")) return faGraduationCap
    if (fieldLower.includes("science") || fieldLower.includes("biology") || fieldLower.includes("chemistry") || fieldLower.includes("physics")) return faBook
    if (fieldLower.includes("tech") || fieldLower.includes("programming") || fieldLower.includes("coding") || fieldLower.includes("computer")) return faGraduationCap
    if (fieldLower.includes("literature") || fieldLower.includes("english") || fieldLower.includes("writing")) return faBook
    return faGraduationCap
  }

  return (
    <Link 
      to={`/groups/${group.id}`}
      onMouseEnter={() => prefetch(`group:${group.id}`, () => getGroup(group.id))}
      className="group block bg-white rounded-xl border border-gray-200/80 overflow-hidden premium-hover hover:border-gray-300 hover:shadow-lg transition-all duration-300"
    >
      <div className="flex">
        {/* Compact Image/Thumbnail */}
        <div className="w-24 h-24 flex-shrink-0 relative overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
          {group.cover_image_url ? (
            <img
              src={group.cover_image_url}
              alt={`${group.name} cover`}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
              <FontAwesomeIcon icon={getCategoryIcon(group.field)} className="w-8 h-8 text-white/80" />
            </div>
          )}
          {canDelete && (
            <div className="absolute top-1 left-1">
              <span className="px-1.5 py-0.5 bg-blue-500/90 backdrop-blur-sm text-white rounded text-[10px] font-semibold">
                Owner
              </span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-gray-900 mb-2 truncate group-hover:text-indigo-600 transition-colors">
              {group.name}
            </h3>
            
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2 flex-wrap">
              <div className="flex items-center gap-1">
                <FontAwesomeIcon icon={faGraduationCap} className="w-3 h-3" />
                <span className="truncate">{group.field}</span>
              </div>
              {group.exam && (
                <>
                  <span className="text-gray-300">•</span>
                  <div className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faBook} className="w-3 h-3" />
                    <span className="truncate">{group.exam}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bottom Actions Bar */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <FontAwesomeIcon icon={faUsers} className="w-3 h-3" />
              <span className="font-medium">{memberCount}/{group.capacity}</span>
            </div>

            <div className="flex items-center gap-1.5">
              {!canDelete && isAuthenticated && joined && (
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
              {!canDelete && isAuthenticated && !joined && !full && (
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
              {!canDelete && !isAuthenticated && !full && (
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
              {canDelete && (
                <>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onEdit && onEdit(group)
                    }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
                    title="Edit Group"
                  >
                    <FontAwesomeIcon icon={faEdit} className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleDeleteClick()
                    }}
                    disabled={busyDelete || isDeleting}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete Group"
                  >
                    <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

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
                <h3 className="text-xl font-bold text-gray-900">Delete Group?</h3>
                <p className="text-gray-600 mt-1">Are you sure you want to delete <span className="font-semibold">"{group.name}"</span>?</p>
              </div>
            </div>
            

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white bg-red-500 hover:bg-red-600 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg"
              >
                Delete Group
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
    </Link>
  )
}

export default memo(GroupCard)
