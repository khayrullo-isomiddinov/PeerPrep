import { useState, useMemo } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faSearch, faFilter, faUsers, faTrophy,
  faSort, faSortUp, faSortDown, faEye, faEyeSlash
} from "@fortawesome/free-solid-svg-icons"
import GroupCard from "./GroupCard"
import { deleteGroup } from "../../utils/api"
import { useAuth } from "../auth/AuthContext"

export default function GroupList({ groups, setGroups, onEdit, onJoinLeave, showFilters = true }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedField, setSelectedField] = useState("")
  const [showMissionsOnly, setShowMissionsOnly] = useState(false)
  const [sortBy, setSortBy] = useState("name")
  const [sortOrder, setSortOrder] = useState("asc")
  const [deletingGroups, setDeletingGroups] = useState(new Set())
  const { user, isAuthenticated } = useAuth()

  const fields = useMemo(() => {
    const s = new Set(groups.map(g => g.field).filter(Boolean))
    return Array.from(s).sort()
  }, [groups])

  const filteredAndSortedGroups = useMemo(() => {
    let filtered = groups.filter(group => {
      const q = searchTerm.toLowerCase()
      const n = (group.name || "").toLowerCase()
      const f = (group.field || "").toLowerCase()
      const d = (group.description || "").toLowerCase()
      const e = (group.exam || "").toLowerCase()
      const matchesSearch = n.includes(q) || f.includes(q) || d.includes(q) || e.includes(q)
      const matchesField = !selectedField || group.field === selectedField
      const matchesMission = !showMissionsOnly || true // Mission filter disabled - no mission_title field in backend
      return matchesSearch && matchesField && matchesMission
    })
    filtered.sort((a, b) => {
      let av, bv
      if (sortBy === "name") { av = (a.name || "").toLowerCase(); bv = (b.name || "").toLowerCase() }
      else if (sortBy === "field") { av = (a.field || "").toLowerCase(); bv = (b.field || "").toLowerCase() }
      else if (sortBy === "members") { av = a.members || 0; bv = b.members || 0 }
      else if (sortBy === "created") { av = new Date(a.created_at || 0); bv = new Date(b.created_at || 0) }
      else { av = (a.name || "").toLowerCase(); bv = (b.name || "").toLowerCase() }
      if (sortOrder === "asc") return av < bv ? -1 : av > bv ? 1 : 0
      return av > bv ? -1 : av < bv ? 1 : 0
    })
    return filtered
  }, [groups, searchTerm, selectedField, showMissionsOnly, sortBy, sortOrder])

  function handleSort(field) {
    if (sortBy === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    else { setSortBy(field); setSortOrder("asc") }
  }

  function getSortIcon(field) {
    if (sortBy !== field) return faSort
    return sortOrder === "asc" ? faSortUp : faSortDown
  }

  async function handleDeleteGroup(groupId) {
    if (!user) { alert("You must be logged in to delete groups"); return }
    setDeletingGroups(prev => new Set(prev).add(groupId))
    try {
      // GroupCard handles the confirmation modal, so we just remove it from the list
      setGroups(groups.filter(g => g.id !== groupId))
    } catch (error) {
      const msg = error?.response?.data?.detail || "Failed to delete group"
      alert(msg)
    } finally {
      setDeletingGroups(prev => {
        const ns = new Set(prev)
        ns.delete(groupId)
        return ns
      })
    }
  }

  if (groups.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center mx-auto mb-4">
            <FontAwesomeIcon icon={faUsers} className="text-pink-500 text-xl" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">No groups yet</h3>
          <p className="text-gray-600 mt-2">Create your first study group to start learning together.</p>
          <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 mt-6">
            <div className="text-sm text-pink-700">
              <span className="font-semibold">Tip:</span> Add a mission challenge to make it engaging.
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {showFilters && (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
          <div className="w-full lg:max-w-xl">
            <div className="hidden md:flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3 w-full">
              <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none">
                <path d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <input
                className="bg-transparent outline-none w-full text-gray-900 placeholder-gray-500"
                placeholder="Search groups..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="text-gray-400 hover:text-gray-600">Clear</button>
              )}
            </div>
            <div className="md:hidden flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
              <FontAwesomeIcon icon={faSearch} className="text-gray-400" />
              <input
                className="bg-transparent outline-none w-full text-gray-900 placeholder-gray-500"
                placeholder="Search groups..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="text-gray-400 hover:text-gray-600">Clear</button>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative min-w-[12rem]">
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
                <FontAwesomeIcon icon={faFilter} className="text-gray-400" />
                <select
                  value={selectedField}
                  onChange={e => setSelectedField(e.target.value)}
                  className="bg-transparent outline-none w-full text-gray-900"
                >
                  <option value="">All fields</option>
                  {fields.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-gray-100 rounded-full p-1 inline-flex">
              <button
                onClick={() => setShowMissionsOnly(v => !v)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${showMissionsOnly ? "bg-pink-500 text-white" : "text-gray-600 hover:text-gray-900"}`}
              >
                <span className="inline-flex items-center gap-2">
                  <FontAwesomeIcon icon={showMissionsOnly ? faEyeSlash : faEye} />
                  <span>{showMissionsOnly ? "Hide missions" : "Missions only"}</span>
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-gray-600">
            <FontAwesomeIcon icon={faSort} />
            <span className="text-sm">Sort by</span>
          </div>
          <div className="bg-gray-100 rounded-full p-1 inline-flex">
            {[
              { key: "name", label: "Name" },
              { key: "field", label: "Field" },
              { key: "members", label: "Members" },
              { key: "created", label: "Created" }
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => handleSort(opt.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium inline-flex items-center gap-2 transition-colors ${sortBy === opt.key ? "bg-pink-500 text-white" : "text-gray-600 hover:text-gray-900"}`}
              >
                <span>{opt.label}</span>
                <FontAwesomeIcon icon={getSortIcon(opt.key)} className="text-xs" />
              </button>
            ))}
          </div>
        </div>
      </div>
      )}

      {showFilters && (
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div className="flex flex-wrap items-center gap-2">
          <span>Showing {filteredAndSortedGroups.length} of {groups.length} groups</span>
          {searchTerm && <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded-full text-xs">Search: "{searchTerm}"</span>}
          {selectedField && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">Field: {selectedField}</span>
          )}
          {showMissionsOnly && (
            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs inline-flex items-center gap-1">
              <FontAwesomeIcon icon={faTrophy} />
              Missions only
            </span>
          )}
        </div>
        <div className="inline-flex items-center gap-2">
          <FontAwesomeIcon icon={faUsers} className="text-pink-500" />
          <span>{groups.reduce((s, g) => s + (g.members || 0), 0)} total members</span>
        </div>
      </div>
      )}

      {filteredAndSortedGroups.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <FontAwesomeIcon icon={faSearch} className="text-gray-400 text-xl" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">No groups found</h3>
            <p className="text-gray-600 mt-2">Try adjusting your search or filters.</p>
            <div className="mt-6">
              <button
                onClick={() => {
                  setSearchTerm("")
                  setSelectedField("")
                  setShowMissionsOnly(false)
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Clear filters
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedGroups.map(group => (
            <GroupCard
              key={group.id}
              group={group}
              onDelete={() => handleDeleteGroup(group.id)}
              isDeleting={deletingGroups.has(group.id)}
              canDelete={user && group.created_by === user.id}
              isAuthenticated={isAuthenticated}
              onEdit={onEdit}
              onJoinLeave={onJoinLeave}
            />
          ))}
        </div>
      )}
    </div>
  )
}









