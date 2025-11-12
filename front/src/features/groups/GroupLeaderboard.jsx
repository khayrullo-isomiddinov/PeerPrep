import { useEffect, useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faTrophy, faMedal, faAward, faCrown } from "@fortawesome/free-solid-svg-icons"
import { getGroupLeaderboard } from "../../utils/api"
import { useAuth } from "../auth/AuthContext"
import UserBadge from "../../components/UserBadge"

export default function GroupLeaderboard({ groupId }) {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { user } = useAuth()

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        setLoading(true)
        setError(null)
        const data = await getGroupLeaderboard(groupId)
        setLeaderboard(data || [])
      } catch (err) {
        console.error("Failed to load leaderboard:", err)
        setError("Failed to load leaderboard")
        setLeaderboard([])
      } finally {
        setLoading(false)
      }
    }
    loadLeaderboard()
  }, [groupId])

  function getRankIcon(rank) {
    if (rank === 1) return faCrown
    if (rank === 2) return faMedal
    if (rank === 3) return faAward
    return faTrophy
  }

  function getRankColor(rank) {
    if (rank === 1) return "text-yellow-500"
    if (rank === 2) return "text-gray-400"
    if (rank === 3) return "text-orange-600"
    return "text-gray-500"
  }

  function getRankBg(rank) {
    if (rank === 1) return "bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-300"
    if (rank === 2) return "bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300"
    if (rank === 3) return "bg-gradient-to-r from-orange-50 to-orange-100 border-orange-300"
    return "bg-white border-gray-200"
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
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

  if (leaderboard.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-200">
        <FontAwesomeIcon icon={faTrophy} className="text-gray-300 text-4xl mb-3" />
        <p className="text-sm text-gray-500 font-medium">No submissions yet. Be the first to complete a mission!</p>
      </div>
    )
  }

  return (
    <div>
      <div className="space-y-3">
        {leaderboard.map((entry, index) => {
          const isCurrentUser = user && entry.user_id === user.id
          return (
            <div
              key={entry.submission_id}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all hover:shadow-lg ${
                getRankBg(entry.rank)
              } ${isCurrentUser ? 'ring-2 ring-pink-500 ring-offset-2' : ''}`}
            >
              <div className={`flex items-center justify-center w-12 h-12 rounded-full shadow-md ${getRankColor(entry.rank)}`}>
                <FontAwesomeIcon icon={getRankIcon(entry.rank)} className="text-2xl" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">#{entry.rank}</span>
                  <span className={`font-medium text-gray-800 truncate flex items-center gap-2 ${isCurrentUser ? 'text-pink-600' : ''}`}>
                    {entry.user_email}
                    <UserBadge userId={entry.user_id} size="sm" />
                    {isCurrentUser && <span className="ml-2 text-xs text-pink-500">(You)</span>}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Score: <span className="font-semibold text-gray-700">{entry.score}</span> points
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold bg-gradient-to-br from-gray-700 to-gray-900 bg-clip-text text-transparent">{entry.score}</div>
                <div className="text-xs text-gray-500 font-medium">points</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

