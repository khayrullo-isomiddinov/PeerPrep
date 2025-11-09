import { useState, useMemo } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faSearch, faFilter, faUsers, faTrophy,
  faSort, faSortUp, faSortDown, faEye, faEyeSlash
} from "@fortawesome/free-solid-svg-icons"
import GroupCard from "./GroupCard"
import { deleteGroup } from "../../utils/api"
import { useAuth } from "../auth/AuthContext"
import Button from "../../components/Button"

export default function GroupList({ groups, setGroups, onEdit, showFilters = true }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedField, setSelectedField] = useState("")
  const [showMissionsOnly, setShowMissionsOnly] = useState(false)
  const [sortBy, setSortBy] = useState("name")
  const [sortOrder, setSortOrder] = useState("asc")
  const [deletingGroups, setDeletingGroups] = useState(new Set())
  const [deleteConfirm, setDeleteConfirm] = useState(null) // { groupId, groupName }
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
      const matchesMission = !showMissionsOnly || group.mission_title
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

  function handleDeleteClick(groupId) {
    if (!user) { 
      alert("You must be logged in to delete groups")
      return 
    }
    const group = groups.find(g => g.id === groupId)
    setDeleteConfirm({ groupId, groupName: group?.name || "this group" })
  }

  async function handleDeleteConfirm() {
    if (!deleteConfirm) return
    
    const { groupId } = deleteConfirm
    setDeleteConfirm(null)
    setDeletingGroups(prev => new Set(prev).add(groupId))
    
    try {
      await deleteGroup(groupId)
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
              <Button
                variant="secondary"
                onClick={() => {
                  setSearchTerm("")
                  setSelectedField("")
                  setShowMissionsOnly(false)
                }}
              >
                Clear filters
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedGroups.map(group => (
            <GroupCard
              key={group.id}
              group={group}
              onDelete={() => handleDeleteClick(group.id)}
              isDeleting={deletingGroups.has(group.id)}
              canDelete={user && group.created_by === user.id}
              isAuthenticated={isAuthenticated}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ease-out"
          style={{ 
            animation: 'fadeIn 0.3s ease-out',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            position: 'fixed',
            width: '100%',
            height: '100%',
            minHeight: '100vh'
          }}
          onClick={() => setDeleteConfirm(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4"
            style={{ 
              animation: 'slideUpFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              transform: 'translateY(0)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">Delete Group?</h3>
                <p className="text-gray-600 mt-1">Are you sure you want to delete <span className="font-semibold">"{deleteConfirm.groupName}"</span>?</p>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">
                <span className="font-semibold">Warning:</span> This action cannot be undone. All group data, members, and missions will be permanently deleted.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white bg-red-500 hover:bg-red-600 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg"
              >
                Delete Group
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUpFadeIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  )
}









