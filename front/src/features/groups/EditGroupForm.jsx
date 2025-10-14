import { useState, useEffect } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { 
  faCalendar, faUsers, faTrophy, faExclamationTriangle, faCheckCircle, 
  faInfoCircle, faPlus, faTimes, faRocket, faBullseye, faAward,
  faChevronRight, faChevronDown, faLightbulb, faClock, faSave, faEdit
} from "@fortawesome/free-solid-svg-icons"
import { useAuth } from "../auth/AuthContext"

export default function EditGroupForm({ group, onUpdate, onCancel }) {
  const [form, setForm] = useState({
    name: "",
    field: "",
    exam: "",
    description: "",
    // Mission fields
    mission_title: "",
    mission_description: "",
    mission_deadline: "",
    mission_capacity: 10,
    mission_badge_name: "",
    mission_badge_description: "",
  })
  
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [hasMission, setHasMission] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const { isAuthenticated } = useAuth()

  // Populate form with existing group data
  useEffect(() => {
    if (group) {
      setForm({
        name: group.name || "",
        field: group.field || "",
        exam: group.exam || "",
        description: group.description || "",
        mission_title: group.mission_title || "",
        mission_description: group.mission_description || "",
        mission_deadline: group.mission_deadline ? new Date(group.mission_deadline).toISOString().split('T')[0] : "",
        mission_capacity: group.mission_capacity || 10,
        mission_badge_name: group.mission_badge_name || "",
        mission_badge_description: group.mission_badge_description || "",
      })
      setHasMission(!!group.mission_title)
    }
  }, [group])

  // Common field options
  const fieldOptions = [
    "Computer Science", "Mathematics", "Physics", "Chemistry", "Biology", 
    "Engineering", "Medicine", "Business", "Economics", "Psychology",
    "Languages", "History", "Literature", "Art", "Music", "Sports",
    "Wellness", "Productivity", "Other"
  ]

  function handleChange(e) {
    const { name, value, type } = e.target
    const newValue = type === 'number' ? parseInt(value) || 0 : value
    
    setForm(prev => ({ ...prev, [name]: newValue }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }))
    }
  }

  function validateForm() {
    const newErrors = {}

    // Basic group validation
    if (!form.name.trim()) {
      newErrors.name = "Group name is required"
    } else if (form.name.length > 100) {
      newErrors.name = "Group name must be 100 characters or less"
    }

    if (!form.field.trim()) {
      newErrors.field = "Field of study is required"
    }

    if (form.description && form.description.length > 500) {
      newErrors.description = "Description must be 500 characters or less"
    }

    if (form.exam && form.exam.length > 100) {
      newErrors.exam = "Exam name must be 100 characters or less"
    }

    // Mission validation
    if (hasMission) {
      if (!form.mission_title.trim()) {
        newErrors.mission_title = "Mission title is required"
      } else if (form.mission_title.length > 100) {
        newErrors.mission_title = "Mission title must be 100 characters or less"
      }

      if (!form.mission_description.trim()) {
        newErrors.mission_description = "Mission description is required"
      } else if (form.mission_description.length > 1000) {
        newErrors.mission_description = "Mission description must be 1000 characters or less"
      }

      if (!form.mission_deadline) {
        newErrors.mission_deadline = "Mission deadline is required"
      } else {
        const deadline = new Date(form.mission_deadline)
        const now = new Date()
        if (deadline <= now) {
          newErrors.mission_deadline = "Mission deadline must be in the future"
        }
      }

      if (form.mission_capacity < 1 || form.mission_capacity > 100) {
        newErrors.mission_capacity = "Mission capacity must be between 1 and 100"
      }

      if (form.mission_badge_name && form.mission_badge_name.length > 50) {
        newErrors.mission_badge_name = "Badge name must be 50 characters or less"
      }

      if (form.mission_badge_description && form.mission_badge_description.length > 200) {
        newErrors.mission_badge_description = "Badge description must be 200 characters or less"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!isAuthenticated) {
      setErrors({ submit: "You must be logged in to edit groups" })
      return
    }

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const groupData = {
        name: form.name.trim(),
        field: form.field.trim(),
        exam: form.exam.trim() || null,
        description: form.description.trim() || null,
      }

      // Add mission data if mission is enabled
      if (hasMission) {
        groupData.mission_title = form.mission_title.trim()
        groupData.mission_description = form.mission_description.trim()
        groupData.mission_deadline = new Date(form.mission_deadline).toISOString()
        groupData.mission_capacity = form.mission_capacity
        groupData.mission_badge_name = form.mission_badge_name.trim() || null
        groupData.mission_badge_description = form.mission_badge_description.trim() || null
      } else {
        // Clear mission data if mission is disabled
        groupData.mission_title = null
        groupData.mission_description = null
        groupData.mission_deadline = null
        groupData.mission_capacity = 10
        groupData.mission_badge_name = null
        groupData.mission_badge_description = null
      }

      await onUpdate(group.id, groupData)
      
    } catch (err) {
      const errorMessage = err?.response?.data?.detail || err?.response?.data?.message || "Failed to update group"
      setErrors({ submit: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  // Get minimum date (today)
  const getMinDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  // Calculate days until deadline
  const getDaysUntilDeadline = () => {
    if (!form.mission_deadline) return null
    const deadline = new Date(form.mission_deadline)
    const now = new Date()
    const diffTime = deadline - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (!group) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-12 h-12 bg-white/20 rounded-xl">
                <FontAwesomeIcon icon={faEdit} className="text-white text-xl" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Edit Group</h2>
                <p className="text-blue-100">Update your study group details</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-white hover:text-blue-200 transition-colors"
            >
              <FontAwesomeIcon icon={faTimes} className="text-xl" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <FontAwesomeIcon icon={faUsers} className="mr-2 text-blue-500" />
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Group Name *</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter group name"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Field of Study *</label>
                <select
                  name="field"
                  value={form.field}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select field</option>
                  {fieldOptions.map(field => (
                    <option key={field} value={field}>{field}</option>
                  ))}
                </select>
                {errors.field && <p className="text-red-500 text-sm mt-1">{errors.field}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upcoming Exam</label>
                <input
                  type="text"
                  name="exam"
                  value={form.exam}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Final Exam, Midterm"
                />
                {errors.exam && <p className="text-red-500 text-sm mt-1">{errors.exam}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe your study group..."
                />
                {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
              </div>
            </div>
          </div>

          {/* Mission Section */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-orange-800 flex items-center">
                <FontAwesomeIcon icon={faTrophy} className="mr-2" />
                Mission Challenge
              </h3>
              <button
                type="button"
                onClick={() => setHasMission(!hasMission)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  hasMission 
                    ? 'bg-orange-500 text-white hover:bg-orange-600' 
                    : 'bg-white text-orange-600 border border-orange-300 hover:bg-orange-50'
                }`}
              >
                {hasMission ? 'Disable Mission' : 'Enable Mission'}
              </button>
            </div>

            {hasMission && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mission Title *</label>
                    <input
                      type="text"
                      name="mission_title"
                      value={form.mission_title}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="e.g., 30-Day Study Challenge"
                    />
                    {errors.mission_title && <p className="text-red-500 text-sm mt-1">{errors.mission_title}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Deadline *</label>
                    <input
                      type="date"
                      name="mission_deadline"
                      value={form.mission_deadline}
                      onChange={handleChange}
                      min={getMinDate()}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    {errors.mission_deadline && <p className="text-red-500 text-sm mt-1">{errors.mission_deadline}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mission Description *</label>
                  <textarea
                    name="mission_description"
                    value={form.mission_description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Describe the mission challenge..."
                  />
                  {errors.mission_description && <p className="text-red-500 text-sm mt-1">{errors.mission_description}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Participants</label>
                    <input
                      type="number"
                      name="mission_capacity"
                      value={form.mission_capacity}
                      onChange={handleChange}
                      min="1"
                      max="100"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    {errors.mission_capacity && <p className="text-red-500 text-sm mt-1">{errors.mission_capacity}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Badge Name</label>
                    <input
                      type="text"
                      name="mission_badge_name"
                      value={form.mission_badge_name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="e.g., Study Champion"
                    />
                    {errors.mission_badge_name && <p className="text-red-500 text-sm mt-1">{errors.mission_badge_name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Badge Description</label>
                    <input
                      type="text"
                      name="mission_badge_description"
                      value={form.mission_badge_description}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Description of the badge"
                    />
                    {errors.mission_badge_description && <p className="text-red-500 text-sm mt-1">{errors.mission_badge_description}</p>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error Messages */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center">
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 mr-2" />
                <p className="text-red-700">{errors.submit}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faSave} />
                  <span>Update Group</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
