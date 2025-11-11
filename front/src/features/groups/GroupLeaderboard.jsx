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
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <FontAwesomeIcon icon={faTrophy} className="text-yellow-500" />
          Leaderboard
        </h5>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <FontAwesomeIcon icon={faTrophy} className="text-yellow-500" />
          Leaderboard
        </h5>
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    )
  }

  if (leaderboard.length === 0) {
    return (
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <FontAwesomeIcon icon={faTrophy} className="text-yellow-500" />
          Leaderboard
        </h5>
        <div className="bg-gray-50 rounded-lg p-6 text-center">
          <FontAwesomeIcon icon={faTrophy} className="text-gray-300 text-3xl mb-2" />
          <p className="text-sm text-gray-500">No submissions yet. Be the first to complete a mission!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <FontAwesomeIcon icon={faTrophy} className="text-yellow-500" />
        Leaderboard
      </h5>
      <div className="space-y-2">
        {leaderboard.map((entry, index) => {
          const isCurrentUser = user && entry.user_id === user.id
          return (
            <div
              key={entry.submission_id}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                getRankBg(entry.rank)
              } ${isCurrentUser ? 'ring-2 ring-pink-500 ring-offset-2' : ''}`}
            >
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${getRankColor(entry.rank)}`}>
                <FontAwesomeIcon icon={getRankIcon(entry.rank)} className="text-xl" />
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
                <div className="text-2xl font-bold text-gray-700">{entry.score}</div>
                <div className="text-xs text-gray-500">points</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

