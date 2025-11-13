import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faUsers, faTrophy, faAward,
  faChevronRight, faUserPlus, faUserMinus, faTrash,
  faGraduationCap, faBook, faStar, faEdit
} from "@fortawesome/free-solid-svg-icons"
import { checkGroupMembership, joinGroup, leaveGroup, deleteGroup } from "../../utils/api"
import { Link } from "react-router-dom"

export default function GroupCard({ group, onDelete, isDeleting = false, canDelete = false, isAuthenticated = false, onEdit }) {
  const [joined, setJoined] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLeader, setIsLeader] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [busyDelete, setBusyDelete] = useState(false)
  const [err, setErr] = useState("")
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated && !canDelete) {
      checkMembershipStatus()
    } else {
      setJoined(false)
    }
  }, [isAuthenticated, canDelete])

  async function checkMembershipStatus() {
    try {
      const membership = await checkGroupMembership(group.id)
      setJoined(!!membership.is_member)
      setIsLeader(!!membership.is_leader)
    } catch (error) {
      setJoined(false)
      setIsLeader(false)
    }
  }

  const memberCount = group.members || 0

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
      } else {
        await joinGroup(group.id)
        setJoined(true)
      }
    } catch (error) {
      setJoined(!joined)
      console.error('Join/Leave failed:', error)
    } finally {
      setIsLoading(false)
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

  return (
    <Link 
      to={`/groups/${group.id}`}
      className="block bg-white rounded-2xl shadow-xl border border-gray-200/60 overflow-hidden premium-hover hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 backdrop-blur-sm"
    >
      {}
      <div className="h-52 relative overflow-hidden group">
        {group.cover_image_url ? (
          <img
            src={group.cover_image_url}
            alt={`${group.name} cover`}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="h-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 group-hover:from-blue-600 group-hover:via-purple-600 group-hover:to-pink-600 transition-all duration-500" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute top-4 right-4">
          <button className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors">
            <FontAwesomeIcon icon={faStar} className="w-4 h-4" />
          </button>
        </div>
        {canDelete && (
          <div className="absolute top-4 left-4">
            <span className="px-2 py-1 bg-blue-500 text-white rounded text-xs font-medium">Owner</span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/50 to-transparent">
          <h3 className="text-xl font-bold text-white mb-1 drop-shadow-lg">{group.name}</h3>
          <div className="flex items-center gap-3 text-blue-100 text-sm drop-shadow-md">
            <div className="flex items-center gap-1">
              <FontAwesomeIcon icon={faGraduationCap} className="w-4 h-4" />
              <span>{group.field}</span>
            </div>
            {group.exam && (
              <div className="flex items-center gap-1">
                <span className="text-blue-200">•</span>
                <FontAwesomeIcon icon={faBook} className="w-4 h-4" />
                <span>{group.exam}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <span className="text-blue-200">•</span>
              <FontAwesomeIcon icon={faUsers} className="w-4 h-4" />
              <span>{memberCount} members</span>
            </div>
          </div>
        </div>
      </div>

      {}
      <div className="p-6 bg-white/95 backdrop-blur-sm">
        {group.description && (
          <p className="text-gray-700 mb-4 line-clamp-2 leading-relaxed text-sm">
            {group.description}
          </p>
        )}

        {group.mission_title && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl">
                <FontAwesomeIcon icon={faTrophy} className="text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-orange-900 mb-1">{group.mission_title}</h4>
                {group.mission_description && (
                  <p className="text-orange-700 text-sm mb-2">{group.mission_description}</p>
                )}
                <div className="flex items-center gap-4 text-orange-600 text-sm">
                  {group.mission_capacity != null && (
                    <div className="flex items-center gap-1">
                      <FontAwesomeIcon icon={faUsers} className="text-sm" />
                      <span>{group.mission_capacity} max</span>
                    </div>
                  )}
                  {group.mission_badge_name && (
                    <div className="flex items-center gap-1">
                      <FontAwesomeIcon icon={faAward} className="text-sm" />
                      <span>Badge: {group.mission_badge_name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {}
        <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            {!canDelete && (
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleJoinLeave()
                  }}
                  disabled={isLoading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${joined ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-pink-500 text-white hover:bg-pink-600'} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <FontAwesomeIcon icon={joined ? faUserMinus : faUserPlus} />
                  <span>{isLoading ? (joined ? 'Leaving...' : 'Joining...') : (joined ? 'Leave' : 'Join Group')}</span>
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
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors bg-blue-500 text-white hover:bg-blue-600"
                >
                  <FontAwesomeIcon icon={faEdit} />
                  <span>Edit</span>
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleDeleteClick()
                  }}
                  disabled={busyDelete || isDeleting}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FontAwesomeIcon icon={faTrash} />
                  <span>{busyDelete || isDeleting ? 'Deleting...' : 'Delete'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {err && (
        <div className="px-6 pb-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm">{err}</p>
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
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">
                <span className="font-semibold">Warning:</span> This action cannot be undone. All group data, members, and missions will be permanently deleted.
              </p>
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
