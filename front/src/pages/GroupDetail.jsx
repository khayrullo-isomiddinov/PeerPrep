import { useEffect, useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faArrowLeft, faUsers, faTrophy, faStar, faGraduationCap, faBook,
  faCalendar, faCrown, faUser, faChevronRight
} from "@fortawesome/free-solid-svg-icons"
import { getGroup, getGroupMembers, checkGroupMembership, joinGroup, leaveGroup } from "../utils/api"
import { useAuth } from "../features/auth/AuthContext"
import GroupMembersList from "../features/groups/GroupMembersList"
import GroupLeaderboard from "../features/groups/GroupLeaderboard"
import MissionSubmissionsList from "../features/groups/MissionSubmissionsList"

export default function GroupDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [joined, setJoined] = useState(false)
  const [isLeader, setIsLeader] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    async function loadGroup() {
      try {
        setLoading(true)
        setError("")
        const data = await getGroup(id)
        setGroup(data)
      } catch (err) {
        console.error("Failed to load group:", err)
        setError("Group not found")
      } finally {
        setLoading(false)
      }
    }
    loadGroup()
  }, [id])

  useEffect(() => {
    async function checkMembership() {
      if (isAuthenticated && group) {
        try {
          const membership = await checkGroupMembership(group.id)
          setJoined(!!membership.is_member)
          setIsLeader(!!membership.is_leader)
        } catch (err) {
          setJoined(false)
          setIsLeader(false)
        }
      }
    }
    checkMembership()
  }, [isAuthenticated, group])

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
      console.error('Join/Leave failed:', error)
      alert(error?.response?.data?.detail || "Failed to join/leave group")
    } finally {
      setIsLoading(false)
    }
  }

  function formatDate(dateString) {
    if (!dateString) return "Not set"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen tap-safe premium-scrollbar bg-white route-transition">
        <div className="nav-spacer" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="mx-auto mb-4 rounded-full h-12 w-12 border-2 border-pink-200 border-t-pink-500 animate-spin" />
            <p className="text-gray-600 text-lg">Loading group...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !group) {
    return (
      <div className="min-h-screen tap-safe premium-scrollbar bg-white route-transition">
        <div className="nav-spacer" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Group Not Found</h2>
            <p className="text-gray-600 mb-6">{error || "The group you're looking for doesn't exist."}</p>
            <Link to="/groups" className="btn-pink-pill">
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              Back to Groups
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const canDelete = user && group.created_by === user.id

  return (
    <div className="min-h-screen tap-safe premium-scrollbar bg-white route-transition">
      <div className="nav-spacer" />
      
      {/* Hero Section */}
      <section className="relative w-full">
        <div className="h-64 md:h-80 relative overflow-hidden">
          {group.cover_image_url ? (
            <img
              src={group.cover_image_url}
              alt={`${group.name} cover`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="h-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500" />
          )}
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 flex items-end">
            <div className="container-page w-full pb-8">
              <Link
                to="/groups"
                className="inline-flex items-center gap-2 text-white hover:text-pink-200 transition-colors mb-4"
              >
                <FontAwesomeIcon icon={faArrowLeft} />
                <span>Back to Groups</span>
              </Link>
              <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-2">{group.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-white/90 text-sm">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faGraduationCap} />
                  <span>{group.field}</span>
                </div>
                {group.exam && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faBook} />
                      <span>{group.exam}</span>
                    </div>
                  </>
                )}
                <span>•</span>
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faUsers} />
                  <span>{group.members || 0} members</span>
                </div>
                {group.deadline && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faCalendar} />
                      <span>Deadline: {formatDate(group.deadline)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="home-section">
        <div className="home-section-inner">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              {group.description && (
                <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 premium-fade-in">
                  <h2 className="text-xl font-bold text-gray-900 mb-3">About</h2>
                  <p className="text-gray-700 leading-relaxed">{group.description}</p>
                </section>
              )}

              {/* Mission Info */}
              {group.mission_title && (
                <section className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-2xl p-6 premium-fade-in">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl flex-shrink-0">
                      <FontAwesomeIcon icon={faTrophy} className="text-white text-xl" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-orange-900 mb-2">{group.mission_title}</h2>
                      {group.mission_description && (
                        <p className="text-orange-700 mb-3">{group.mission_description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-orange-600 text-sm">
                        {group.mission_capacity != null && (
                          <div className="flex items-center gap-1">
                            <FontAwesomeIcon icon={faUsers} />
                            <span>{group.mission_capacity} max participants</span>
                          </div>
                        )}
                        {group.mission_badge_name && (
                          <div className="flex items-center gap-1">
                            <FontAwesomeIcon icon={faStar} />
                            <span>Badge: {group.mission_badge_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Members Section */}
              <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 premium-fade-in">
                <GroupMembersList groupId={group.id} />
              </section>

              {/* Leaderboard */}
              <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 premium-fade-in">
                <GroupLeaderboard groupId={group.id} />
              </section>

              {/* Mission Submissions */}
              {isAuthenticated && (joined || canDelete) && (
                <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 premium-fade-in">
                  <MissionSubmissionsList groupId={group.id} isLeader={isLeader || canDelete} />
                </section>
              )}
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Join/Leave Button */}
              {!canDelete && (
                <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 premium-fade-in">
                  {isAuthenticated ? (
                    <button
                      onClick={handleJoinLeave}
                      disabled={isLoading}
                      className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                        joined
                          ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          : "bg-pink-500 text-white hover:bg-pink-600 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <FontAwesomeIcon icon={joined ? faUser : faUsers} />
                      <span>{isLoading ? (joined ? "Leaving..." : "Joining...") : (joined ? "Leave Group" : "Join Group")}</span>
                    </button>
                  ) : (
                    <Link
                      to="/login"
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold bg-pink-500 text-white hover:bg-pink-600 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all"
                    >
                      <FontAwesomeIcon icon={faUsers} />
                      <span>Join Group</span>
                    </Link>
                  )}
                </section>
              )}

              {/* Group Stats */}
              <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 premium-fade-in">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Group Stats</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Members</span>
                    <span className="font-semibold text-gray-900">{group.members || 0} / {group.capacity || 10}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Field</span>
                    <span className="font-semibold text-gray-900">{group.field}</span>
                  </div>
                  {group.exam && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Exam</span>
                      <span className="font-semibold text-gray-900">{group.exam}</span>
                    </div>
                  )}
                  {group.deadline && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Deadline</span>
                      <span className="font-semibold text-gray-900">{formatDate(group.deadline)}</span>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}


