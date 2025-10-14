import { useState, useMemo } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { 
  faSearch, faFilter, faUsers, faTrophy, faGraduationCap,
  faSort, faSortUp, faSortDown, faEye, faEyeSlash
} from "@fortawesome/free-solid-svg-icons"
import GroupCard from "./GroupCard"
import { deleteGroup } from "../../utils/api"
import { useAuth } from "../auth/AuthContext"

export default function GroupList({ groups, setGroups, onEdit }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedField, setSelectedField] = useState("")
  const [showMissionsOnly, setShowMissionsOnly] = useState(false)
  const [sortBy, setSortBy] = useState("name")
  const [sortOrder, setSortOrder] = useState("asc")
  const [deletingGroups, setDeletingGroups] = useState(new Set())
  const { user, isAuthenticated } = useAuth()

  // Get unique fields for filter
  const fields = useMemo(() => {
    const fieldSet = new Set(groups.map(g => g.field))
    return Array.from(fieldSet).sort()
  }, [groups])

  // Filter and sort groups
  const filteredAndSortedGroups = useMemo(() => {
    let filtered = groups.filter(group => {
      const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           group.field.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (group.description && group.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (group.exam && group.exam.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesField = !selectedField || group.field === selectedField
      const matchesMission = !showMissionsOnly || group.mission_title
      
      return matchesSearch && matchesField && matchesMission
    })

    // Sort groups
    filtered.sort((a, b) => {
      let aValue, bValue
      
      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case "field":
          aValue = a.field.toLowerCase()
          bValue = b.field.toLowerCase()
          break
        case "members":
          aValue = a.members || 0
          bValue = b.members || 0
          break
        case "created":
          aValue = new Date(a.created_at || 0)
          bValue = new Date(b.created_at || 0)
          break
        default:
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
      }

      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

    return filtered
  }, [groups, searchTerm, selectedField, showMissionsOnly, sortBy, sortOrder])

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("asc")
    }
  }

  const getSortIcon = (field) => {
    if (sortBy !== field) return faSort
    return sortOrder === "asc" ? faSortUp : faSortDown
  }

  const handleDeleteGroup = async (groupId) => {
    if (!user) {
      alert("You must be logged in to delete groups")
      return
    }

    if (!confirm("Are you sure you want to delete this group? This action cannot be undone.")) {
      return
    }

    setDeletingGroups(prev => new Set(prev).add(groupId))
    
    try {
      await deleteGroup(groupId)
      setGroups(groups.filter(group => group.id !== groupId))
    } catch (error) {
      console.error("Failed to delete group:", error)
      const errorMessage = error?.response?.data?.detail || "Failed to delete group"
      alert(errorMessage)
    } finally {
      setDeletingGroups(prev => {
        const newSet = new Set(prev)
        newSet.delete(groupId)
        return newSet
      })
    }
  }

  if (groups.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-6 mx-auto">
            <FontAwesomeIcon icon={faUsers} className="text-white text-2xl" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">No Groups Yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first study group to start learning together with others!
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-blue-800 text-sm">
              💡 <strong>Tip:</strong> Add a mission challenge to make your group more engaging and competitive!
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <FontAwesomeIcon 
                icon={faSearch} 
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" 
              />
              <input
                type="text"
                placeholder="Search groups by name, field, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Field Filter */}
          <div className="lg:w-48">
            <div className="relative">
              <FontAwesomeIcon 
                icon={faFilter} 
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" 
              />
              <select
                value={selectedField}
                onChange={(e) => setSelectedField(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="">All Fields</option>
                {fields.map(field => (
                  <option key={field} value={field}>{field}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Mission Filter */}
          <div className="lg:w-48">
            <button
              onClick={() => setShowMissionsOnly(!showMissionsOnly)}
              className={`w-full flex items-center justify-center space-x-2 px-4 py-3 border rounded-xl transition-colors ${
                showMissionsOnly 
                  ? 'bg-orange-50 border-orange-200 text-orange-700' 
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FontAwesomeIcon icon={showMissionsOnly ? faEyeSlash : faEye} />
              <span>{showMissionsOnly ? 'Hide Missions' : 'Missions Only'}</span>
            </button>
          </div>
        </div>

        {/* Sort Options */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <FontAwesomeIcon icon={faSort} />
            <span>Sort by:</span>
          </div>
          <div className="flex items-center space-x-2">
            {[
              { key: "name", label: "Name" },
              { key: "field", label: "Field" },
              { key: "members", label: "Members" },
              { key: "created", label: "Created" }
            ].map(option => (
              <button
                key={option.key}
                onClick={() => handleSort(option.key)}
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === option.key
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{option.label}</span>
                <FontAwesomeIcon icon={getSortIcon(option.key)} className="text-xs" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center space-x-4">
          <span>
            Showing {filteredAndSortedGroups.length} of {groups.length} groups
          </span>
          {searchTerm && (
            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              Search: "{searchTerm}"
            </span>
          )}
          {selectedField && (
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">
              Field: {selectedField}
            </span>
          )}
          {showMissionsOnly && (
            <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
              Missions Only
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <FontAwesomeIcon icon={faUsers} className="text-blue-500" />
          <span>{groups.reduce((sum, g) => sum + (g.members || 0), 0)} total members</span>
        </div>
      </div>

      {/* Groups Grid */}
      {filteredAndSortedGroups.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-6 mx-auto">
              <FontAwesomeIcon icon={faSearch} className="text-gray-400 text-2xl" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">No Groups Found</h3>
            <p className="text-gray-600 mb-6">
              Try adjusting your search terms or filters to find what you're looking for.
            </p>
            <button
              onClick={() => {
                setSearchTerm("")
                setSelectedField("")
                setShowMissionsOnly(false)
              }}
              className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onDelete={() => handleDeleteGroup(group.id)}
              isDeleting={deletingGroups.has(group.id)}
              canDelete={user && group.created_by === user.id}
              isAuthenticated={isAuthenticated}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  )
}
