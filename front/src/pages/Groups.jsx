import { useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import CreateGroupForm from "../features/groups/CreateGroupForm"
import GroupList from "../features/groups/GroupList"
import EditGroupForm from "../features/groups/EditGroupForm"
import { listGroups, createGroup, updateGroup } from "../utils/api"
import { useAuth } from "../features/auth/AuthContext"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faFilter, faSearch } from "@fortawesome/free-solid-svg-icons"

export default function Groups() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [editingGroup, setEditingGroup] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedField, setSelectedField] = useState("all")
  const [sortBy, setSortBy] = useState("name")
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  const [params] = useSearchParams()

  useEffect(() => {
    setSearchQuery(params.get('q') || "")
    loadGroups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  async function loadGroups() {
    try {
      setLoading(true)
      const data = await listGroups()
      setGroups(data)
      setError("")
    } catch (err) {
      setError("Failed to load groups")
      setGroups([])
    } finally {
      setLoading(false)
    }
  }

  async function addGroup(newGroup) {
    const data = await createGroup(newGroup)
    setGroups([data, ...groups])
    return data
  }

  async function handleUpdateGroup(groupId, updatedData) {
    const data = await updateGroup(groupId, updatedData)
    setGroups(groups.map(g => (g.id === groupId ? data : g)))
    setEditingGroup(null)
    return data
  }

  const fields = useMemo(() => {
    const s = new Set(groups.map(g => g.field).filter(Boolean))
    return ["all", ...Array.from(s).sort()]
  }, [groups])

  const filteredGroups = useMemo(() => {
    let filtered = groups
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(g =>
        (g.name || "").toLowerCase().includes(q) ||
        (g.description || "").toLowerCase().includes(q) ||
        (g.field || "").toLowerCase().includes(q) ||
        (g.exam || "").toLowerCase().includes(q)
      )
    }
    if (selectedField !== "all") {
      filtered = filtered.filter(g => g.field === selectedField)
    }
    filtered = [...filtered]
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return (a.name || "").localeCompare(b.name || "")
        case "members":
          return (b.members || 0) - (a.members || 0)
        case "created":
          return new Date(b.created_at || 0) - new Date(a.created_at || 0)
        default:
          return 0
      }
    })
    return filtered
  }, [groups, searchQuery, selectedField, sortBy])

  return (
    <div className="min-h-screen tap-safe premium-scrollbar bg-white route-transition">
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
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button onClick={() => setShowFilters(v => !v)} className="filter-btn">
              <FontAwesomeIcon icon={faFilter} className="mr-2" />
              Filters
            </button>
          </div>
        </div>
      </section>

      {showFilters && (
        <section className="container-page section">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="space-y-6 premium-fade-in">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {fields.map(field => (
                    <button
                      key={field}
                      onClick={() => setSelectedField(field)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        selectedField === field
                          ? 'bg-pink-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {field === 'all' ? 'All' : field}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Sort by</h3>
                <div className="flex gap-2">
                  {[
                    { id: "name", name: "Name" },
                    { id: "members", name: "Members" },
                    { id: "created", name: "Created" }
                  ].map(option => (
                    <button
                      key={option.id}
                      onClick={() => setSortBy(option.id)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        sortBy === option.id
                          ? 'bg-pink-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {option.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <main className="container-page section space-y-8">

        {error && (
          <div className="premium-card premium-scale-in">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 premium-rounded-full premium-bg-error flex items-center justify-center">
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold premium-text-error">Error</h3>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="premium-card premium-loading text-center py-16">
            <div className="mx-auto mb-4 rounded-full h-12 w-12 border-2 border-white/20 border-t-transparent animate-spin" />
            <p className="text-muted text-lg">Loading groups...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {isAuthenticated && (
              <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <CreateGroupForm addGroup={addGroup} />
              </section>
            )}
            <section className="premium-fade-in">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">All Groups</h2>
              <GroupList groups={filteredGroups} setGroups={setGroups} onEdit={setEditingGroup} showFilters={false} />
            </section>
            {!isAuthenticated && !authLoading && (
              <section className="premium-card text-center premium-scale-in">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-full premium-bg-primary flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold mb-3 premium-heading">Want to Join or Create Groups?</h3>
                  <p className="text-muted mb-6">Sign up or log in to join study groups, create your own, and connect with other learners.</p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link to="/login" className="btn text-center">Log In</Link>
                    <Link to="/register" className="btn-secondary text-center">Sign Up</Link>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </main>

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

