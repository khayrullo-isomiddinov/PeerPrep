import { useEffect, useMemo, useState, useCallback } from "react"
import { Link, useSearchParams, useLocation } from "react-router-dom"
import GroupList from "../features/groups/GroupList"
import EditGroupForm from "../features/groups/EditGroupForm"
import { listGroups, updateGroup, getMyGroups, getMyGroupsCount } from "../utils/api"
import { useAuth } from "../features/auth/AuthContext"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faArrowsRotate, faSearch, faChevronDown, faChevronUp, faUsers } from "@fortawesome/free-solid-svg-icons"
import { getCachedGroups, setCachedGroups } from "../utils/dataCache"
import { PageSkeleton } from "../components/SkeletonLoader"
import { startPageLoad, endPageLoad } from "../utils/usePageLoader"

export default function Groups() {
  const [params] = useSearchParams()
  const location = useLocation()
  
  const currentParams = useMemo(() => ({
    q: params.get('q') || undefined
  }), [params])
  
  const cachedGroups = getCachedGroups(currentParams)
  const [groups, setGroupsState] = useState(cachedGroups || [])
  const [myGroups, setMyGroups] = useState([])
  const [myGroupsCount, setMyGroupsCount] = useState(0)
  const [loading, setLoading] = useState(!cachedGroups || cachedGroups.length === 0)
  const [loadingMyGroups, setLoadingMyGroups] = useState(false)
  const [loadingMyGroupsCount, setLoadingMyGroupsCount] = useState(false)
  const [error, setError] = useState("")
  const [editingGroup, setEditingGroup] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showMyGroups, setShowMyGroups] = useState(false)
  const [fieldFilter, setFieldFilter] = useState("all") // "all" or specific field
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  const setGroups = useCallback((newGroups) => {
    setGroupsState(newGroups)
    setCachedGroups(newGroups, currentParams)
  }, [currentParams])

  const loadGroups = useCallback(async (showLoading = true, force = false) => {
    // Check page cache first (skip if force = true)
    const { getCachedPage, setCachedPage } = await import("../utils/pageCache")
    const q = params.get('q') || undefined
    const cacheParams = { q }
    
    // Skip cache when force = true (for polling)
    if (!force) {
      const cached = getCachedPage("groups", cacheParams)
      
      if (cached && cached.data && !showLoading) {
        // Background refresh - use cached data
        setGroupsState(cached.data)
        // Refresh in background if expired
        if (cached.isExpired) {
          setTimeout(async () => {
            try {
              const data = await listGroups({ q })
              setGroupsState(data)
              setCachedPage("groups", data, cacheParams)
              setCachedGroups(data, currentParams)
            } catch (err) {
              console.error("Background refresh failed:", err)
            }
          }, 100)
        }
        return
      }
    }
    
    // No cache or initial load or forced refresh
    if (showLoading) {
      setLoading(true)
    }
    try {
      const data = await listGroups({ q })
      setGroupsState(data)
      setCachedPage("groups", data, cacheParams)
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
  }, [params, currentParams])

  const loadMyGroupsCount = useCallback(async () => {
    if (!isAuthenticated) {
      setMyGroupsCount(0)
      return
    }
    setLoadingMyGroupsCount(true)
    try {
      const count = await getMyGroupsCount()
      setMyGroupsCount(count)
    } catch (error) {
      console.error("Failed to load my groups count:", error)
      setMyGroupsCount(0)
    } finally {
      setLoadingMyGroupsCount(false)
    }
  }, [isAuthenticated])

  const loadMyGroups = useCallback(async () => {
    if (!isAuthenticated) {
      setMyGroups([])
      return
    }
    setLoadingMyGroups(true)
    try {
      const data = await getMyGroups()
      setMyGroups(data || [])
      // Update count when full list loads
      setMyGroupsCount(data?.length || 0)
    } catch (error) {
      console.error("Failed to load my groups:", error)
      setMyGroups([])
    } finally {
      setLoadingMyGroups(false)
    }
  }, [isAuthenticated])

  // Load my groups count immediately when authenticated (lightweight, fast)
  useEffect(() => {
    if (isAuthenticated) {
      loadMyGroupsCount()
    }
  }, [isAuthenticated, loadMyGroupsCount])

  useEffect(() => {
    const pageId = 'groups'
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
      // Refresh count when new group is created
      if (isAuthenticated) {
        loadMyGroupsCount()
      }
      window.history.replaceState({}, document.title)
      endPageLoad(pageId)
    } else if (cached && cached.length > 0) {
      // Show cached data immediately - no loading state
      setGroupsState(cached)
      setLoading(false)
      endPageLoad(pageId)
      // Always refresh in background to get latest data (especially after join/leave)
      // Use a shorter delay to catch navigation back from group detail
      setTimeout(() => loadGroups(false), 100)
    } else {
      startPageLoad(pageId)
      loadGroups().finally(() => {
        endPageLoad(pageId)
      })
    }
    setSearchQuery(params.get('q') || "")
  }, [loadGroups, params, currentParams, location.state, showMyGroups, loadMyGroups])

  // Periodic polling to keep data fresh (only when page is visible)
  // Poll every 15 seconds to catch changes from other users
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && groups.length > 0) {
        // Page became visible, refreshing groups in background
        loadGroups(false)
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Poll every 5 seconds to catch changes from other users
    // Use force=true to bypass cache and always fetch fresh data
    // 5 seconds is a good balance: responsive updates without excessive server load
    const pollInterval = setInterval(() => {
      if (!document.hidden && groups.length > 0) {
        loadGroups(false, true) // force=true bypasses cache
      }
    }, 1000) // 5 seconds - good balance between freshness and performance
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(pollInterval)
    }
  }, [groups.length, loadGroups])

  async function handleUpdateGroup(groupId, updatedData) {
    const data = await updateGroup(groupId, updatedData)
    const updatedGroups = groups.map(g => (g.id === groupId ? data : g))
    setGroups(updatedGroups)
      setMyGroups(prev => prev.map(g => (g.id === groupId ? data : g)))
      // Refresh count
      if (isAuthenticated) {
        loadMyGroupsCount()
      }
    
    // Update page cache with new data
    const { setCachedPage, invalidateCache } = await import("../utils/pageCache")
    setCachedPage(`group:${groupId}`, data)
    // Invalidate list caches so they refresh with updated data
    invalidateCache("groups")
    
    setEditingGroup(null)
    return data
  }

  function handleGroupJoinLeave(groupId, isJoined, updatedGroup) {
    // Use server-provided data if available, otherwise update optimistically
    if (updatedGroup) {
      setGroups(prevGroups => {
        return prevGroups.map(g => {
          if (g.id === groupId) {
            return {
              ...g,
              is_joined: updatedGroup.is_joined,
              member_count: updatedGroup.member_count,
              members: updatedGroup.members
            }
          }
          return g
        })
      })
    } else {
      // Fallback: update optimistically
      setGroups(prevGroups => {
        return prevGroups.map(g => {
          if (g.id === groupId) {
            return {
              ...g,
              is_joined: isJoined,
              member_count: isJoined 
                ? (g.member_count ?? g.members ?? 0) + 1 
                : Math.max(0, (g.member_count ?? g.members ?? 0) - 1),
              members: isJoined 
                ? (g.member_count ?? g.members ?? 0) + 1 
                : Math.max(0, (g.member_count ?? g.members ?? 0) - 1)
            }
          }
          return g
        })
      })
    }
    
    // Refresh my groups count immediately (lightweight)
    if (isAuthenticated) {
      loadMyGroupsCount()
    }
  }

  const filteredGroups = useMemo(() => {
    let filtered = groups

    // Apply field filter
    if (fieldFilter !== "all") {
      filtered = filtered.filter(g => (g.field || "").toLowerCase() === fieldFilter.toLowerCase())
    }

    // Apply search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(g =>
        (g.name || "").toLowerCase().includes(q) ||
        (g.description || "").toLowerCase().includes(q) ||
        (g.field || "").toLowerCase().includes(q) ||
        (g.exam || "").toLowerCase().includes(q)
      )
    }

    return filtered
  }, [groups, searchQuery, fieldFilter])


  // Don't render until data is ready (GitHub-style)
  if (loading && groups.length === 0) {
    return <PageSkeleton />
  }

  return (
    <div className="min-h-screen tap-safe premium-scrollbar route-transition bg-gray-50">
      <div className="nav-spacer" />
      
      <section className="container-page pt-4 pb-6">
        <div className="space-y-6">
          {/* Premium Header Bar */}
          <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900 whitespace-nowrap">Groups</h1>
            
            {/* Premium Edgy Search Bar */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <FontAwesomeIcon icon={faSearch} className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 text-sm shadow-sm transition-all"
                style={{ borderRadius: '0' }}
              />
            </div>

            {/* Field Filters */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFieldFilter("all")}
                className={`px-3 py-2 text-xs font-semibold transition-colors ${
                  fieldFilter === "all"
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                }`}
                style={{ borderRadius: '0' }}
              >
                All
              </button>
              <button
                onClick={() => setFieldFilter("Computer Science")}
                className={`px-3 py-2 text-xs font-semibold transition-colors ${
                  fieldFilter === "Computer Science"
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                }`}
                style={{ borderRadius: '0' }}
              >
                CS
              </button>
              <button
                onClick={() => setFieldFilter("Mathematics")}
                className={`px-3 py-2 text-xs font-semibold transition-colors ${
                  fieldFilter === "Mathematics"
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                }`}
                style={{ borderRadius: '0' }}
              >
                Math
              </button>
              <button
                onClick={() => setFieldFilter("Engineering")}
                className={`px-3 py-2 text-xs font-semibold transition-colors ${
                  fieldFilter === "Engineering"
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                }`}
                style={{ borderRadius: '0' }}
              >
                Eng
              </button>
              <button
                onClick={() => setFieldFilter("Business")}
                className={`px-3 py-2 text-xs font-semibold transition-colors ${
                  fieldFilter === "Business"
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                }`}
                style={{ borderRadius: '0' }}
              >
                Business
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 ml-auto">
              {isAuthenticated && (
                <>
                  <button
                    onClick={() => {
                      if (!showMyGroups) {
                        loadMyGroups()
                      }
                      setShowMyGroups(!showMyGroups)
                    }}
                    className="flex items-center justify-between gap-2 px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 transition-colors group shadow-sm whitespace-nowrap"
                    style={{ borderRadius: '0' }}
                  >
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faUsers} className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-gray-900 text-sm">My Groups</span>
                      {loadingMyGroupsCount ? (
                        <span className="px-1.5 py-0.5 bg-gray-200 text-gray-400 text-xs font-semibold animate-pulse">
                          ...
                        </span>
                      ) : myGroupsCount > 0 ? (
                        <span className="px-1.5 py-0.5 bg-indigo-600 text-white text-xs font-semibold">
                          {myGroupsCount}
                        </span>
                      ) : null}
                    </div>
                    <FontAwesomeIcon 
                      icon={showMyGroups ? faChevronUp : faChevronDown} 
                      className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors ml-1" 
                    />
                  </button>
                  <Link
                    to="/groups/create"
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-medium text-sm shadow-sm whitespace-nowrap"
                    style={{ borderRadius: '0' }}
                  >
                    <FontAwesomeIcon icon={faUsers} className="w-4 h-4" />
                    <span>Create</span>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* My Groups Content - Inline with header when open */}
          {isAuthenticated && showMyGroups && (
            <div>
              {loadingMyGroups ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white border border-gray-200 p-6">
                      <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-gray-200 w-3/4"></div>
                        <div className="h-3 bg-gray-200 w-1/2"></div>
                        <div className="h-3 bg-gray-200 w-2/3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : myGroups.length > 0 ? (
                <GroupList groups={myGroups} setGroups={setGroups} onEdit={setEditingGroup} showFilters={false} />
              ) : (
                <div className="text-center py-8 bg-white border border-gray-200">
                  <p className="text-gray-600 text-sm">No groups yet</p>
                </div>
              )}
            </div>
          )}

          {/* All Groups Section - Compact header */}
          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 p-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">All Groups</h2>
              {filteredGroups.length > 0 && (
                <span className="text-sm text-gray-500">
                  {filteredGroups.length} {filteredGroups.length === 1 ? 'group' : 'groups'}
                </span>
              )}
            </div>

            {loading && groups.length === 0 ? (
              <PageSkeleton />
            ) : filteredGroups.length > 0 ? (
              <GroupList groups={filteredGroups} setGroups={setGroups} onEdit={setEditingGroup} onJoinLeave={handleGroupJoinLeave} showFilters={false} />
            ) : (
              <div className="text-center py-16 bg-white border border-gray-200">
                <div className="w-20 h-20 bg-gray-100 flex items-center justify-center mx-auto mb-5">
                  <FontAwesomeIcon icon={faUsers} className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No groups found</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto text-sm">
                  {searchQuery
                    ? "Try adjusting your search to find more groups."
                    : "No groups available at the moment. Be the first to create one!"
                  }
                </p>
                {isAuthenticated && (
                  <Link 
                    to="/groups/create"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-semibold shadow-sm"
                    style={{ borderRadius: '0' }}
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

