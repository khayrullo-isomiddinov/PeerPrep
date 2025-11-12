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
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-2">{group.name}</h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-white/90 text-xs sm:text-sm">
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

      <main className="home-section bg-gray-50">
        <div className="home-section-inner">
          {/* Quick Actions Bar */}
          <div className="mb-6 premium-fade-in">
            {!canDelete && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
                {isAuthenticated ? (
                  <button
                    onClick={handleJoinLeave}
                    disabled={isLoading}
                    className={`w-full sm:w-auto sm:min-w-[200px] flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl font-semibold transition-all ${
                      joined
                        ? "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                        : "bg-gradient-to-r from-pink-500 to-pink-600 text-white hover:from-pink-600 hover:to-pink-700 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                    } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
                  >
                    <FontAwesomeIcon icon={joined ? faUser : faUsers} className="text-lg" />
                    <span>{isLoading ? (joined ? "Leaving..." : "Joining...") : (joined ? "Leave Group" : "Join Group")}</span>
                  </button>
                ) : (
                  <Link
                    to="/login"
                    className="w-full sm:w-auto sm:min-w-[200px] flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl font-semibold bg-gradient-to-r from-pink-500 to-pink-600 text-white hover:from-pink-600 hover:to-pink-700 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all"
                  >
                    <FontAwesomeIcon icon={faUsers} className="text-lg" />
                    <span>Join Group</span>
                  </Link>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* About Section */}
              {group.description && (
                <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 lg:p-8 premium-fade-in">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <FontAwesomeIcon icon={faBook} className="text-white text-lg" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">About This Group</h2>
                  </div>
                  <p className="text-gray-700 leading-relaxed text-base">{group.description}</p>
                </section>
              )}

              {/* Mission Section */}
              {group.mission_title && (
                <section className="bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 border-2 border-yellow-200 rounded-2xl p-6 lg:p-8 premium-fade-in shadow-md">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500 rounded-xl flex-shrink-0 shadow-lg">
                      <FontAwesomeIcon icon={faTrophy} className="text-white text-2xl" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-orange-900 mb-3">{group.mission_title}</h2>
                      {group.mission_description && (
                        <p className="text-orange-800 leading-relaxed mb-4">{group.mission_description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-orange-700 text-sm font-medium">
                        {group.mission_capacity != null && (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/60 rounded-lg">
                            <FontAwesomeIcon icon={faUsers} />
                            <span>{group.mission_capacity} max participants</span>
                          </div>
                        )}
                        {group.mission_badge_name && (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/60 rounded-lg">
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
              <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 lg:p-8 premium-fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
                    <FontAwesomeIcon icon={faUsers} className="text-white text-lg" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Members</h2>
                </div>
                <GroupMembersList groupId={group.id} />
              </section>

              {/* Leaderboard Section */}
              <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 lg:p-8 premium-fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
                    <FontAwesomeIcon icon={faTrophy} className="text-white text-lg" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Leaderboard</h2>
                </div>
                <GroupLeaderboard groupId={group.id} />
              </section>

              {/* Mission Submissions Section */}
              {isAuthenticated && (joined || canDelete) && (
                <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 lg:p-8 premium-fade-in">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                      <FontAwesomeIcon icon={faStar} className="text-white text-lg" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Mission Submissions</h2>
                  </div>
                  <MissionSubmissionsList groupId={group.id} isLeader={isLeader || canDelete} />
                </section>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Group Stats Card */}
              <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 premium-fade-in sticky top-24">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <FontAwesomeIcon icon={faGraduationCap} className="text-white text-lg" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Group Info</h3>
                </div>
                <div className="space-y-5">
                  <div className="pb-4 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <FontAwesomeIcon icon={faUsers} className="text-blue-500" />
                        Members
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-gray-900">{group.members || 0}</span>
                      <span className="text-sm text-gray-500">/ {group.capacity || 10}</span>
                    </div>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-cyan-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(((group.members || 0) / (group.capacity || 10)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="pb-4 border-b border-gray-200">
                    <div className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                      <FontAwesomeIcon icon={faGraduationCap} className="text-purple-500" />
                      Field of Study
                    </div>
                    <span className="text-base font-semibold text-gray-900">{group.field}</span>
                  </div>

                  {group.exam && (
                    <div className="pb-4 border-b border-gray-200">
                      <div className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                        <FontAwesomeIcon icon={faBook} className="text-green-500" />
                        Exam/Certification
                      </div>
                      <span className="text-base font-semibold text-gray-900">{group.exam}</span>
                    </div>
                  )}

                  {group.deadline && (
                    <div>
                      <div className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                        <FontAwesomeIcon icon={faCalendar} className="text-orange-500" />
                        Deadline
                      </div>
                      <span className="text-base font-semibold text-gray-900">{formatDate(group.deadline)}</span>
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



