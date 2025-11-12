import { useEffect, useMemo, useState, useCallback } from "react"
import { Link, useSearchParams, useLocation } from "react-router-dom"
import GroupList from "../features/groups/GroupList"
import EditGroupForm from "../features/groups/EditGroupForm"
import { listGroups, updateGroup } from "../utils/api"
import { useAuth } from "../features/auth/AuthContext"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faArrowsRotate, faSearch } from "@fortawesome/free-solid-svg-icons"
import { getCachedGroups, setCachedGroups } from "../utils/dataCache"

export default function Groups() {
  const [params] = useSearchParams()
  const location = useLocation()
  
  const currentParams = useMemo(() => ({
    q: params.get('q') || undefined
  }), [params])
  
  const cachedGroups = getCachedGroups(currentParams)
  const [groups, setGroupsState] = useState(cachedGroups || [])
  const [loading, setLoading] = useState(!cachedGroups)
  const [error, setError] = useState("")
  const [editingGroup, setEditingGroup] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
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
      window.history.replaceState({}, document.title)
    } else if (cached) {
      setGroupsState(cached)
      setLoading(false)
    } else {
      loadGroups()
    }
    setSearchQuery(params.get('q') || "")
  }, [loadGroups, params, currentParams, location.state])


  async function handleUpdateGroup(groupId, updatedData) {
    const data = await updateGroup(groupId, updatedData)
    const updatedGroups = groups.map(g => (g.id === groupId ? data : g))
    setGroups(updatedGroups)
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
        <div className="space-y-8">
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
            <h2 className="text-3xl font-bold text-gray-900">Study Groups</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={() => loadGroups()}
                className="text-gray-500 hover:text-gray-700 font-medium flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faArrowsRotate} className="w-4 h-4" />
                Refresh
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

