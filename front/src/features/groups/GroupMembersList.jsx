import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faUsers, faCrown, faUser, faCalendar } from "@fortawesome/free-solid-svg-icons"
import { getGroupMembers } from "../../utils/api"
import { useAuth } from "../auth/AuthContext"
import UserBadge from "../../components/UserBadge"

export default function GroupMembersList({ groupId, presence = [] }) {
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
      <div className="text-center py-12">
        <div className="mx-auto mb-4 rounded-full h-12 w-12 border-2 border-pink-200 border-t-pink-500 animate-spin" />
        <p className="text-gray-600">Loading members...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-200">
        <FontAwesomeIcon icon={faUsers} className="text-gray-300 text-4xl mb-3" />
        <p className="text-sm text-gray-500 font-medium">No members yet.</p>
      </div>
    )
  }

  const leaders = members.filter(m => m.is_leader)
  const regularMembers = members.filter(m => !m.is_leader)

  return (
    <div>
      
      <div className="space-y-5">
        {leaders.length > 0 && (
          <div>
            <h6 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <FontAwesomeIcon icon={faCrown} className="text-yellow-500" />
              Leaders ({leaders.length})
            </h6>
            <div className="space-y-3">
              {leaders.map(member => {
                const isCurrentUser = user && member.user_id === user.id
                const userPresence = presence.find(p => p.id === member.user_id)
                const isOnline = userPresence?.is_online || false
                return (
                  <Link
                    key={member.id}
                    to={`/profile/${member.user_id}`}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all hover:shadow-md cursor-pointer ${
                      isCurrentUser 
                        ? "bg-gradient-to-r from-pink-50 to-pink-100 border-pink-300 ring-2 ring-pink-400 ring-offset-1" 
                        : "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300 hover:border-yellow-400"
                    }`}
                  >
                    <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-md">
                      <FontAwesomeIcon icon={faCrown} className="text-lg" />
                      {/* Online Status Indicator */}
                      <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${
                        isOnline ? 'bg-green-500' : 'bg-gray-400'
                      }`} title={isOnline ? 'Online' : 'Offline'} />
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
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {regularMembers.length > 0 && (
          <div>
            <h6 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <FontAwesomeIcon icon={faUsers} className="text-blue-500" />
              Members {leaders.length > 0 && `(${regularMembers.length})`}
            </h6>
            <div className="space-y-3">
              {regularMembers.map(member => {
                const isCurrentUser = user && member.user_id === user.id
                const userPresence = presence.find(p => p.id === member.user_id)
                const isOnline = userPresence?.is_online || false
                return (
                  <Link
                    key={member.id}
                    to={`/profile/${member.user_id}`}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer ${
                      isCurrentUser 
                        ? "bg-gradient-to-r from-pink-50 to-pink-100 border-pink-300 ring-2 ring-pink-400 ring-offset-1" 
                        : "bg-white border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className={`relative flex items-center justify-center w-12 h-12 rounded-full shadow-sm ${
                      isCurrentUser 
                        ? "bg-gradient-to-br from-pink-400 to-pink-600 text-white" 
                        : "bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600"
                    }`}>
                      <FontAwesomeIcon icon={faUser} className="text-lg" />
                      {/* Online Status Indicator */}
                      <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${
                        isOnline ? 'bg-green-500' : 'bg-gray-400'
                      }`} title={isOnline ? 'Online' : 'Offline'} />
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
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

