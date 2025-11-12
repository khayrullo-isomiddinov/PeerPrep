import { useEffect, useState } from "react"
import { getUserBadge } from "../utils/api"

export default function UserBadge({ userId, size = "sm" }) {
  const [badge, setBadge] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    async function fetchBadge() {
      try {
        const data = await getUserBadge(userId)
        setBadge(data.badge)
      } catch (error) {
        console.error("Error fetching badge:", error)
        setBadge(null)
      } finally {
        setLoading(false)
      }
    }

    fetchBadge()
  }, [userId])

  if (loading || !badge) {
    return null
  }

  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg"
  }

  const colorClasses = {
    green: "bg-green-100 text-green-700 border-green-300",
    blue: "bg-blue-100 text-blue-700 border-blue-300",
    purple: "bg-purple-100 text-purple-700 border-purple-300",
    orange: "bg-orange-100 text-orange-700 border-orange-300",
    gold: "bg-yellow-100 text-yellow-700 border-yellow-300"
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border font-medium ${sizeClasses[size]} ${colorClasses[badge.color] || colorClasses.green}`}
      title={`${badge.name} - ${badge.min_xp || badge.min_submissions || 0}+ XP`}
    >
      <span>{badge.icon}</span>
      <span className="hidden sm:inline">{badge.name}</span>
    </span>
  )
}

