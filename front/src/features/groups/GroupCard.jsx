import { useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { 
  faUsers, faCalendar, faTrophy, faAward, faClock, 
  faChevronRight, faUserPlus, faUserMinus, faTrash,
  faGraduationCap, faBook, faBullseye, faStar
} from "@fortawesome/free-solid-svg-icons"
import Button from "../../components/Button"

export default function GroupCard({ group, onDelete }) {
  const [joined, setJoined] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

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
            <Button
              variant={joined ? "secondary" : "primary"}
              onClick={() => setJoined(!joined)}
              className="flex items-center space-x-2"
            >
              <FontAwesomeIcon icon={joined ? faUserMinus : faUserPlus} />
              <span>{joined ? "Leave" : "Join"}</span>
            </Button>
            <Button 
              variant="secondary" 
              onClick={onDelete}
              className="flex items-center space-x-2 text-red-600 hover:text-red-700 hover:border-red-300"
            >
              <FontAwesomeIcon icon={faTrash} />
              <span>Delete</span>
            </Button>
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
    </div>
  )
}
