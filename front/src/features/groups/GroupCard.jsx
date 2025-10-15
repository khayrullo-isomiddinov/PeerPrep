import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { 
  faUsers, faCalendar, faTrophy, faAward, faClock, 
  faChevronRight, faUserPlus, faUserMinus, faTrash,
  faGraduationCap, faBook, faBullseye, faStar, faEdit
} from "@fortawesome/free-solid-svg-icons"
import { checkGroupMembership, joinGroup, leaveGroup } from "../../utils/api"

export default function GroupCard({ group, onDelete, isDeleting = false, canDelete = false, isAuthenticated = false, onEdit }) {
  const [joined, setJoined] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  // Check membership status when component mounts or authentication changes
  useEffect(() => {
    if (isAuthenticated && !canDelete) {
      checkMembershipStatus()
    } else {
      setJoined(false)
    }
  }, [isAuthenticated, group.id, canDelete])

  async function checkMembershipStatus() {
    try {
      const membership = await checkGroupMembership(group.id)
      setJoined(membership.is_member)
    } catch (error) {
      console.error("Failed to check membership:", error)
      setJoined(false)
    }
  }

  // Calculate days until mission deadline
  const getDaysUntilDeadline = () => {
    if (!group.mission_deadline) return null
    const deadline = new Date(group.mission_deadline)
    const now = new Date()
    const diffTime = deadline - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const daysUntilDeadline = getDaysUntilDeadline()
  const memberCount = group.members || Math.floor(Math.random() * 50) + 5

  const handleModalClose = (callback) => {
    setIsClosing(true)
    setTimeout(() => {
      setShowLoginPrompt(false)
      setIsClosing(false)
      if (callback) callback()
    }, 200)
  }

  async function handleJoinLeave() {
    if (!isAuthenticated) {
      setShowLoginPrompt(true)
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
      console.error("Failed to join/leave group:", error)
      // Optionally show error message to user
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="group relative bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-hidden">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-1">{group.name}</h3>
            <div className="flex items-center space-x-3 text-blue-100">
              <div className="flex items-center space-x-1">
                <FontAwesomeIcon icon={faGraduationCap} className="text-sm" />
                <span className="text-sm">{group.field}</span>
              </div>
              {group.exam && (
                <>
                  <span className="text-blue-200">•</span>
                  <div className="flex items-center space-x-1">
                    <FontAwesomeIcon icon={faBook} className="text-sm" />
                    <span className="text-sm">{group.exam}</span>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-white/20 rounded-full px-3 py-1">
              <FontAwesomeIcon icon={faUsers} className="text-white text-sm" />
              <span className="text-white text-sm font-medium">{memberCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {group.description && (
          <p className="text-gray-700 mb-4 line-clamp-2">
            {group.description}
          </p>
        )}

        {/* Mission Section */}
        {group.mission_title && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4 mb-4">
            <div className="flex items-start space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl">
                <FontAwesomeIcon icon={faTrophy} className="text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-orange-900 mb-1">{group.mission_title}</h4>
                <p className="text-orange-700 text-sm mb-2">{group.mission_description}</p>
                <div className="flex items-center justify-between">
                  {daysUntilDeadline !== null && (
                    <div className="flex items-center space-x-1 text-orange-600">
                      <FontAwesomeIcon icon={faClock} className="text-sm" />
                      <span className="text-sm font-medium">
                        {daysUntilDeadline > 0 ? `${daysUntilDeadline} days left` : 'Deadline passed'}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center space-x-1 text-orange-600">
                    <FontAwesomeIcon icon={faUsers} className="text-sm" />
                    <span className="text-sm font-medium">{group.mission_capacity} max</span>
                  </div>
                </div>
                {group.mission_badge_name && (
                  <div className="mt-2 flex items-center space-x-1 text-orange-600">
                    <FontAwesomeIcon icon={faAward} className="text-sm" />
                    <span className="text-sm font-medium">Badge: {group.mission_badge_name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            <span>{showDetails ? 'Hide Details' : 'View Details'}</span>
            <FontAwesomeIcon 
              icon={showDetails ? faChevronRight : faChevronRight} 
              className={`transform transition-transform ${showDetails ? 'rotate-90' : ''}`}
            />
          </button>

          <div className="flex items-center space-x-2">
            {/* Only show join button if user is not the creator */}
            {!canDelete && (
              <button
                onClick={handleJoinLeave}
                disabled={isLoading}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
                  joined 
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300' 
                    : 'bg-blue-500 text-white hover:bg-blue-600 border border-blue-500 hover:border-blue-600'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <FontAwesomeIcon icon={joined ? faUserMinus : faUserPlus} />
                <span>{isLoading ? (joined ? "Leaving..." : "Joining...") : (joined ? "Leave" : "Join")}</span>
              </button>
            )}
            
            {/* Show admin badge for creators */}
            {canDelete && (
              <div className="flex items-center space-x-2">
                <div className="px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium flex items-center space-x-1">
                  <FontAwesomeIcon icon={faStar} className="text-xs" />
                  <span>Admin</span>
                </div>
                <button
                  onClick={() => onEdit && onEdit(group)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold transition-all duration-200 bg-blue-500 text-white hover:bg-blue-600 border border-blue-500 hover:border-blue-600"
                >
                  <FontAwesomeIcon icon={faEdit} />
                  <span>Edit</span>
                </button>
                <button
                  onClick={onDelete}
                  disabled={isDeleting}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold transition-all duration-200 bg-red-500 text-white hover:bg-red-600 border border-red-500 hover:border-red-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-500"
                >
                  <FontAwesomeIcon icon={faTrash} />
                  <span>{isDeleting ? "Deleting..." : "Delete"}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Expanded Details */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h5 className="font-semibold text-gray-800 mb-2">Group Info</h5>
                <div className="space-y-1 text-gray-600">
                  <div className="flex items-center space-x-2">
                    <FontAwesomeIcon icon={faGraduationCap} className="text-blue-500" />
                    <span>Field: {group.field}</span>
                  </div>
                  {group.exam && (
                    <div className="flex items-center space-x-2">
                      <FontAwesomeIcon icon={faBook} className="text-purple-500" />
                      <span>Exam: {group.exam}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <FontAwesomeIcon icon={faUsers} className="text-green-500" />
                    <span>Members: {memberCount}</span>
                  </div>
                  {canDelete && (
                    <div className="flex items-center space-x-2">
                      <FontAwesomeIcon icon={faStar} className="text-purple-500" />
                      <span className="text-purple-600 font-medium">You are the admin</span>
                    </div>
                  )}
                </div>
              </div>
              
              {group.mission_title && (
                <div>
                  <h5 className="font-semibold text-gray-800 mb-2">Mission Details</h5>
                  <div className="space-y-1 text-gray-600">
                    <div className="flex items-center space-x-2">
                      <FontAwesomeIcon icon={faBullseye} className="text-orange-500" />
                      <span>Challenge: {group.mission_title}</span>
                    </div>
                    {group.mission_deadline && (
                      <div className="flex items-center space-x-2">
                        <FontAwesomeIcon icon={faClock} className="text-red-500" />
                        <span>Deadline: {new Date(group.mission_deadline).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <FontAwesomeIcon icon={faUsers} className="text-blue-500" />
                      <span>Capacity: {group.mission_capacity}</span>
                    </div>
                    {group.mission_badge_name && (
                      <div className="flex items-center space-x-2">
                        <FontAwesomeIcon icon={faAward} className="text-yellow-500" />
                        <span>Badge: {group.mission_badge_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Status indicator */}
      <div className="absolute top-4 right-4">
        {group.mission_title ? (
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
            <FontAwesomeIcon icon={faTrophy} />
            <span>Mission</span>
          </div>
        ) : (
          <div className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
            <FontAwesomeIcon icon={faUsers} />
            <span>Study</span>
          </div>
        )}
      </div>

      {/* Login Prompt Modal */}
      {(showLoginPrompt || isClosing) && (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-200 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
          <div className={`bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl transform transition-all duration-200 ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-6 mx-auto">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Login Required</h3>
              <p className="text-gray-600 mb-6">
                You need to be logged in to join study groups. Sign up or log in to get started!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={() => handleModalClose(() => navigate("/login"))}
                  className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-semibold text-center"
                >
                  Log In
                </button>
                <button 
                  onClick={() => handleModalClose(() => navigate("/register"))}
                  className="px-6 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors font-semibold text-center"
                >
                  Sign Up
                </button>
              </div>
              <button
                onClick={() => handleModalClose()}
                className="mt-4 text-gray-500 hover:text-gray-700 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
