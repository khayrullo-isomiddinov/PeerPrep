import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import CreateGroupForm from "../features/groups/CreateGroupForm"
import GroupList from "../features/groups/GroupList"
import EditGroupForm from "../features/groups/EditGroupForm"
import { listGroups, createGroup, updateGroup } from "../utils/api"
import { useAuth } from "../features/auth/AuthContext"

export default function Groups() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [editingGroup, setEditingGroup] = useState(null)
  const [query, setQuery] = useState("")
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  useEffect(() => {
    loadGroups()
  }, [])

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

  const filtered = useMemo(() => {
    if (!query.trim()) return groups
    const q = query.toLowerCase()
    return groups.filter(g => {
      const t = String(g.title || "").toLowerCase()
      const d = String(g.description || "").toLowerCase()
      const loc = String(g.location || "").toLowerCase()
      return t.includes(q) || d.includes(q) || loc.includes(q)
    })
  }, [groups, query])

  return (
    <div className="min-h-screen tap-safe premium-scrollbar">
      <div className="nav-spacer" />
      <header className="container-page section">
        <div className="hero-accent blur-aura premium-fade-in">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2">
                <span className="brand-mark" />
                <h1 className="premium-heading">Study Groups</h1>
              </div>
              <p className="text-muted">Join existing groups or create your own to study together</p>
            </div>
            <button
              onClick={loadGroups}
              disabled={loading}
              className="cta inline-flex items-center gap-2 disabled:opacity-60"
            >
              <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{loading ? "Loading..." : "Refresh"}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container-page section space-y-8">
        <div className="surface inset-pad premium-scale-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-2xl font-bold">Browse Groups</h2>
            <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="md:hidden w-full premium-input flex items-center gap-2 px-3 py-2 rounded-m">
                <svg className="w-4 h-4 opacity-70" viewBox="0 0 24 24" fill="none">
                  <path d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <input
                  className="bg-transparent outline-none w-full"
                  placeholder="Search groups..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
                {query && (
                  <button onClick={() => setQuery("")} className="text-muted hover:opacity-100">
                    ⨯
                  </button>
                )}
              </div>
              <div className="hidden md:inline-flex search-pill">
                <svg className="w-4 h-4 opacity-70" viewBox="0 0 24 24" fill="none">
                  <path d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <input
                  placeholder="Search groups..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
                {query && (
                  <button onClick={() => setQuery("")} className="text-muted hover:opacity-100">
                    ⨯
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

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
              <section className="surface inset-pad premium-scale-in">
                <CreateGroupForm addGroup={addGroup} />
              </section>
            )}
            <section className="surface inset-pad premium-fade-in">
              <GroupList groups={filtered} setGroups={setGroups} onEdit={setEditingGroup} />
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
