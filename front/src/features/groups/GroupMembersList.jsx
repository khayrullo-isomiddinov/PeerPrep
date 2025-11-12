import { useEffect, useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faUsers, faCrown, faUser, faCalendar } from "@fortawesome/free-solid-svg-icons"
import { getGroupMembers } from "../../utils/api"
import { useAuth } from "../auth/AuthContext"
import UserBadge from "../../components/UserBadge"

export default function GroupMembersList({ groupId }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { user } = useAuth()

  useEffect(() => {
    async function loadMembers() {
      try {
        setLoading(true)
        setError(null)
        const data = await getGroupMembers(groupId)
        setMembers(data || [])
      } catch (err) {
        console.error("Failed to load members:", err)
        setError("Failed to load members")
        setMembers([])
      } finally {
        setLoading(false)
      }
    }
    loadMembers()
  }, [groupId])

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    })
  }

  function formatRelativeDate(dateString) {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return formatDate(dateString)
  }

  if (loading) {
    return (
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-center py-8">
          <div className="mx-auto mb-4 rounded-full h-12 w-12 border-2 border-pink-200 border-t-pink-500 animate-spin" />
          <p className="text-gray-600">Loading members...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <FontAwesomeIcon icon={faUsers} className="text-blue-500" />
          Members
        </h5>
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <FontAwesomeIcon icon={faUsers} className="text-blue-500" />
          Members
        </h5>
        <div className="bg-gray-50 rounded-lg p-6 text-center">
          <FontAwesomeIcon icon={faUsers} className="text-gray-300 text-3xl mb-2" />
          <p className="text-sm text-gray-500">No members yet.</p>
        </div>
      </div>
    )
  }

  const leaders = members.filter(m => m.is_leader)
  const regularMembers = members.filter(m => !m.is_leader)

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <FontAwesomeIcon icon={faUsers} className="text-blue-500" />
        Members ({members.length})
      </h5>
      
      <div className="space-y-4">
        {leaders.length > 0 && (
          <div>
            <h6 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Leaders</h6>
            <div className="space-y-2">
              {leaders.map(member => {
                const isCurrentUser = user && member.user_id === user.id
                return (
                  <div
                    key={member.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                      isCurrentUser 
                        ? "bg-pink-50 border-pink-200 ring-2 ring-pink-500 ring-offset-2" 
                        : "bg-yellow-50 border-yellow-200"
                    }`}
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-100 text-yellow-600">
                      <FontAwesomeIcon icon={faCrown} className="text-lg" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate flex items-center gap-2">
                          {member.user_name || member.user_email || `User ${member.user_id}`}
                          <UserBadge userId={member.user_id} size="sm" />
                          {isCurrentUser && <span className="ml-2 text-xs text-pink-500">(You)</span>}
                        </span>
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                          Leader
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                        <FontAwesomeIcon icon={faCalendar} className="text-xs" />
                        <span>Joined {formatRelativeDate(member.joined_at)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {regularMembers.length > 0 && (
          <div>
            <h6 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Members {leaders.length > 0 && `(${regularMembers.length})`}
            </h6>
            <div className="space-y-2">
              {regularMembers.map(member => {
                const isCurrentUser = user && member.user_id === user.id
                return (
                  <div
                    key={member.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      isCurrentUser 
                        ? "bg-pink-50 border-pink-200 ring-2 ring-pink-500 ring-offset-2" 
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                      isCurrentUser ? "bg-pink-100 text-pink-600" : "bg-gray-100 text-gray-600"
                    }`}>
                      <FontAwesomeIcon icon={faUser} className="text-lg" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate flex items-center gap-2">
                          {member.user_name || member.user_email || `User ${member.user_id}`}
                          <UserBadge userId={member.user_id} size="sm" />
                          {isCurrentUser && <span className="ml-2 text-xs text-pink-500">(You)</span>}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                        <FontAwesomeIcon icon={faCalendar} className="text-xs" />
                        <span>Joined {formatRelativeDate(member.joined_at)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

