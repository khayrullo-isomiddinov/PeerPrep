import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faUsers, faTrophy, faAward,
  faChevronRight, faUserPlus, faUserMinus, faTrash,
  faGraduationCap, faBook, faStar, faEdit
} from "@fortawesome/free-solid-svg-icons"
import { checkGroupMembership, joinGroup, leaveGroup } from "../../utils/api"

export default function GroupCard({ group, onDelete, isDeleting = false, canDelete = false, isAuthenticated = false, onEdit }) {
  const [joined, setJoined] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated && !canDelete) {
      checkMembershipStatus()
    } else {
      setJoined(false)
    }
  }, [isAuthenticated, canDelete]) // Removed group.id from dependencies to prevent unnecessary re-checks

  async function checkMembershipStatus() {
    try {
      const membership = await checkGroupMembership(group.id)
      setJoined(!!membership.is_member)
    } catch (error) {
      setJoined(false)
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
        // Update local state immediately - no need to re-check membership
      } else {
        await joinGroup(group.id)
        setJoined(true)
        // Update local state immediately - no need to re-check membership
      }
    } catch (error) {
      // If the API call fails, revert the state change
      setJoined(!joined)
      console.error('Join/Leave failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden premium-hover">
      {}
      <div className="h-48 relative overflow-hidden">
        {group.cover_image_url ? (
          <img
            src={group.cover_image_url}
            alt={`${group.name} cover`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="h-full bg-gradient-to-br from-blue-500 to-purple-600" />
        )}
        <div className="absolute inset-0 bg-black/20" />
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
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-xl font-bold text-white mb-1">{group.name}</h3>
          <div className="flex items-center gap-3 text-blue-100 text-sm">
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
      <div className="p-6">
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
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowDetails(v => !v)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            <span>{showDetails ? 'Hide Details' : 'View Details'}</span>
            <FontAwesomeIcon icon={faChevronRight} className={`transform transition-transform ${showDetails ? 'rotate-90' : ''}`} />
          </button>
          <div className="flex items-center gap-2">
            {!canDelete && (
              <button
                onClick={handleJoinLeave}
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
                  onClick={() => onEdit && onEdit(group)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors bg-blue-500 text-white hover:bg-blue-600"
                >
                  <FontAwesomeIcon icon={faEdit} />
                  <span>Edit</span>
                </button>
                <button
                  onClick={onDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FontAwesomeIcon icon={faTrash} />
                  <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {showDetails && (
          <div className="mt-4 pt-4 border-top border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
              <div>
                <h5 className="font-semibold text-gray-800 mb-2">Group Info</h5>
                <div className="space-y-1">
                  <div className="flex items-center gap-2"><FontAwesomeIcon icon={faGraduationCap} className="text-blue-500" /><span>Field: {group.field}</span></div>
                  {group.exam && (<div className="flex items-center gap-2"><FontAwesomeIcon icon={faBook} className="text-purple-500" /><span>Exam: {group.exam}</span></div>)}
                  <div className="flex items-center gap-2"><FontAwesomeIcon icon={faUsers} className="text-green-500" /><span>Members: {memberCount}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
