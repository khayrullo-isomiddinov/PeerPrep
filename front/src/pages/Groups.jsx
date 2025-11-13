import { useEffect, useMemo, useState, useCallback } from "react"
import { Link, useSearchParams, useLocation } from "react-router-dom"
import GroupList from "../features/groups/GroupList"
import EditGroupForm from "../features/groups/EditGroupForm"
import { listGroups, updateGroup, getMyGroups } from "../utils/api"
import { useAuth } from "../features/auth/AuthContext"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faArrowsRotate, faSearch, faChevronDown, faChevronUp, faUsers } from "@fortawesome/free-solid-svg-icons"
import { getCachedGroups, setCachedGroups } from "../utils/dataCache"

export default function Groups() {
  const [params] = useSearchParams()
  const location = useLocation()
  
  const currentParams = useMemo(() => ({
    q: params.get('q') || undefined
  }), [params])
  
  const cachedGroups = getCachedGroups(currentParams)
  const [groups, setGroupsState] = useState(cachedGroups || [])
  const [myGroups, setMyGroups] = useState([])
  const [loading, setLoading] = useState(!cachedGroups)
  const [loadingMyGroups, setLoadingMyGroups] = useState(false)
  const [error, setError] = useState("")
  const [editingGroup, setEditingGroup] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showMyGroups, setShowMyGroups] = useState(false)
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  const setGroups = useCallback((newGroups) => {
    setGroupsState(newGroups)
    setCachedGroups(newGroups, currentParams)
  }, [currentParams])

  const loadGroups = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true)
    }
    try {
      const data = await listGroups()
      setGroupsState(data)
      setCachedGroups(data, currentParams)
      setError("")
    } catch (err) {
      setError("Failed to load groups")
      setGroupsState([])
      setCachedGroups([], currentParams)
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }, [currentParams])

  const loadMyGroups = useCallback(async () => {
    if (!isAuthenticated) {
      setMyGroups([])
      return
    }
    setLoadingMyGroups(true)
    try {
      const data = await getMyGroups()
      setMyGroups(data || [])
    } catch (error) {
      console.error("Failed to load my groups:", error)
      setMyGroups([])
    } finally {
      setLoadingMyGroups(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    const cached = getCachedGroups(currentParams)
    if (location.state?.newGroup) {
      const newGroup = location.state.newGroup
      setGroupsState(prevGroups => {
        const existingGroups = cached || prevGroups
        const filteredGroups = existingGroups.filter(g => g.id !== newGroup.id)
        const updatedGroups = [newGroup, ...filteredGroups]
        setCachedGroups(updatedGroups, currentParams)
        return updatedGroups
      })
      setLoading(false)
      loadGroups(false)
      // Refresh my groups if the section is open
      if (showMyGroups) {
        loadMyGroups()
      }
      window.history.replaceState({}, document.title)
    } else if (cached) {
      setGroupsState(cached)
      setLoading(false)
    } else {
      loadGroups()
    }
    setSearchQuery(params.get('q') || "")
    // Don't auto-load my groups - only load when user clicks the button
  }, [loadGroups, params, currentParams, location.state])


  async function handleUpdateGroup(groupId, updatedData) {
    const data = await updateGroup(groupId, updatedData)
    const updatedGroups = groups.map(g => (g.id === groupId ? data : g))
    setGroups(updatedGroups)
    // Also update my groups if it's in there
    setMyGroups(prev => prev.map(g => (g.id === groupId ? data : g)))
    setEditingGroup(null)
    return data
  }

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) {
      return groups
    }
    const q = searchQuery.toLowerCase()
    return groups.filter(g =>
      (g.name || "").toLowerCase().includes(q) ||
      (g.description || "").toLowerCase().includes(q) ||
      (g.field || "").toLowerCase().includes(q) ||
      (g.exam || "").toLowerCase().includes(q)
    )
  }, [groups, searchQuery])


  return (
    <div className="min-h-screen tap-safe premium-scrollbar bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50/30 route-transition">
      <div className="nav-spacer" />
      <section className="events-hero premium-fade-in">
        <div className="events-hero-bg" />
        <div className="events-hero-inner">
          <h1 className="events-title">
            <span>Discover Collaborative</span>
            <span className="accent">Study Groups</span>
          </h1>
          <div className="events-search">
            <FontAwesomeIcon icon={faSearch} className="icon" />
            <input
              type="text"
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="container-page section">
        <div className="space-y-12">
          {/* My Groups Section */}
          {isAuthenticated && (
            <div className="space-y-6">
              <button
                onClick={() => {
                  if (!showMyGroups) {
                    loadMyGroups()
                  }
                  setShowMyGroups(!showMyGroups)
                }}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-pink-50 to-purple-50 hover:from-pink-100 hover:to-purple-100 rounded-xl border border-pink-200 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <FontAwesomeIcon icon={faUsers} className="w-5 h-5 text-pink-600" />
                  <h2 className="text-2xl font-bold text-gray-900">My Groups</h2>
                  {myGroups.length > 0 && (
                    <span className="px-2 py-1 bg-pink-500 text-white text-sm font-medium rounded-full">
                      {myGroups.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {showMyGroups && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        loadMyGroups()
                        loadGroups(false)
                      }}
                      className="touch-target text-gray-500 hover:text-gray-700 active:text-gray-900 font-medium flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/50 active:bg-white/70 transition-colors"
                    >
                      <FontAwesomeIcon icon={faArrowsRotate} className="w-4 h-4" />
                      <span className="hidden sm:inline">Refresh</span>
                    </button>
                  )}
                  <FontAwesomeIcon 
                    icon={showMyGroups ? faChevronUp : faChevronDown} 
                    className="w-5 h-5 text-gray-600 group-hover:text-gray-900 transition-colors" 
                  />
                </div>
              </button>

              {showMyGroups && (
                <>
                  {loadingMyGroups ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/60 p-6 premium-loading">
                          <div className="animate-pulse space-y-4">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : myGroups.length > 0 ? (
                    <GroupList groups={myGroups} setGroups={setGroups} onEdit={setEditingGroup} showFilters={false} />
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-200">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FontAwesomeIcon icon={faUsers} className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No groups yet</h3>
                      <p className="text-gray-600 text-sm">Join or create groups to see them here</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* All Groups Section */}
          <div className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 premium-scale-in">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-red-800">Error</h3>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold text-gray-900">All Groups</h2>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    loadGroups()
                    if (isAuthenticated) loadMyGroups()
                  }}
                  className="touch-target text-gray-500 hover:text-gray-700 active:text-gray-900 font-medium flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
                >
                  <FontAwesomeIcon icon={faArrowsRotate} className="w-4 h-4" />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/60 p-6 premium-loading">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredGroups.length > 0 ? (
            <GroupList groups={filteredGroups} setGroups={setGroups} onEdit={setEditingGroup} showFilters={false} />
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FontAwesomeIcon icon={faUsers} className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No groups found</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {searchQuery
                  ? "Try adjusting your search to find more groups."
                  : "Be the first to create an amazing study group!"
                }
              </p>
              {isAuthenticated && (
                <Link 
                  to="/groups/create"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-pink-500 text-white rounded-xl hover:bg-pink-600 transition-colors font-medium"
                >
                  <FontAwesomeIcon icon={faUsers} className="w-4 h-4" />
                  Create Group
                </Link>
              )}
              {!isAuthenticated && !authLoading && (
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/login" className="btn-pink-pill text-center">Log In</Link>
                  <Link to="/register" className="btn-secondary text-center">Sign Up</Link>
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </section>

      {editingGroup && (
        <EditGroupForm
          group={editingGroup}
          onUpdate={handleUpdateGroup}
          onCancel={() => setEditingGroup(null)}
        />
      )}
    </div>
  )
}

