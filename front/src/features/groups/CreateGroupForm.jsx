import { useState, useEffect } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { 
  faCalendar, faUsers, faTrophy, faExclamationTriangle, faCheckCircle, 
  faInfoCircle, faPlus, faTimes, faRocket, faBullseye, faAward,
  faChevronRight, faChevronDown, faLightbulb, faClock
} from "@fortawesome/free-solid-svg-icons"
import Button from "../../components/Button"
import Card from "../../components/Card"

export default function CreateGroupForm({ addGroup }) {
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

    // Mission validation (only if mission is enabled)
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
          newErrors.mission_deadline = "Deadline must be in the future"
        }
      }

      if (form.mission_capacity < 1 || form.mission_capacity > 100) {
        newErrors.mission_capacity = "Capacity must be between 1 and 100"
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
      }

      await addGroup(groupData)
      
      // Reset form
      setForm({
        name: "", field: "", exam: "", description: "",
        mission_title: "", mission_description: "", mission_deadline: "",
        mission_capacity: 10, mission_badge_name: "", mission_badge_description: ""
      })
      setHasMission(false)
      setShowPreview(false)
    } catch (err) {
      const errorMessage = err?.response?.data?.detail || err?.response?.data?.message || "Failed to create group"
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        {/* Hero Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 rounded-2xl mb-8 shadow-2xl transform hover:scale-105 transition-transform duration-300">
            <FontAwesomeIcon icon={faRocket} className="text-white text-3xl" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent mb-6 leading-tight">
            Create Your Study Group
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto leading-relaxed font-light">
            Build a community of learners. Add an optional mission challenge to make it exciting!
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-16">
          <div className="flex items-center space-x-6">
            <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
              !hasMission 
                ? 'bg-gradient-to-r from-blue-400 to-purple-500 border-transparent text-white shadow-lg' 
                : 'bg-white/10 border-white/30 text-white/60 backdrop-blur-sm'
            }`}>
              <span className="font-bold text-lg">1</span>
            </div>
            <div className={`w-20 h-1 rounded-full transition-all duration-300 ${
              hasMission 
                ? 'bg-gradient-to-r from-blue-400 to-purple-500' 
                : 'bg-white/20'
            }`}></div>
            <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
              hasMission 
                ? 'bg-gradient-to-r from-yellow-400 to-orange-500 border-transparent text-white shadow-lg' 
                : 'bg-white/10 border-white/30 text-white/60 backdrop-blur-sm'
            }`}>
              <span className="font-bold text-lg">2</span>
            </div>
          </div>
          <div className="ml-12 text-sm">
            <span className={`transition-colors duration-300 ${!hasMission ? 'text-white font-semibold' : 'text-white/60'}`}>
              Basic Info
            </span>
            <span className="mx-3 text-white/40">→</span>
            <span className={`transition-colors duration-300 ${hasMission ? 'text-white font-semibold' : 'text-white/60'}`}>
              Mission Setup
            </span>
          </div>
        </div>

        {/* Mission Toggle Card */}
        <div className="mb-12">
          <div className={`relative overflow-hidden rounded-3xl border transition-all duration-500 backdrop-blur-sm ${
            hasMission 
              ? 'border-yellow-400/50 bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10 shadow-2xl shadow-yellow-500/20' 
              : 'border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10'
          }`}>
            <div className="p-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-8">
                  <div className={`flex items-center justify-center w-20 h-20 rounded-3xl transition-all duration-500 shadow-2xl ${
                    hasMission 
                      ? 'bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 transform rotate-12 scale-110' 
                      : 'bg-white/10 backdrop-blur-sm'
                  }`}>
                    <FontAwesomeIcon 
                      icon={faTrophy} 
                      className={`text-3xl transition-all duration-500 ${
                        hasMission ? 'text-white drop-shadow-lg' : 'text-white/60'
                      }`} 
                    />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-white mb-3">
                      {hasMission ? '🎯 Mission Challenge Enabled!' : 'Add Mission Challenge'}
                    </h3>
                    <p className="text-blue-100 text-xl leading-relaxed">
                      {hasMission 
                        ? 'Create an exciting goal with deadlines, leaderboards, and badges'
                        : 'Turn your study group into a competitive challenge with goals and rewards'
                      }
                    </p>
                    {hasMission && (
                      <div className="flex items-center mt-4 text-yellow-300">
                        <FontAwesomeIcon icon={faLightbulb} className="mr-3 text-xl" />
                        <span className="text-lg font-semibold">Participants will submit proof and compete for the top spot!</span>
                      </div>
                    )}
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasMission}
                    onChange={(e) => setHasMission(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-16 h-8 bg-white/20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white/30 after:border after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-yellow-400 peer-checked:to-orange-500 shadow-lg backdrop-blur-sm"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-12">
          {/* Basic Group Information */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500/80 via-purple-600/80 to-indigo-600/80 backdrop-blur-sm px-10 py-8">
              <div className="flex items-center space-x-6">
                <div className="flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <FontAwesomeIcon icon={faUsers} className="text-white text-2xl" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">Basic Information</h2>
                  <p className="text-blue-100 text-lg">Tell us about your study group</p>
                </div>
              </div>
            </div>
            
            <div className="p-10 space-y-10">
              {errors.submit && (
                <div className="bg-red-500/20 border-l-4 border-red-400 rounded-2xl p-8 backdrop-blur-sm">
                  <div className="flex items-start">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-400 mr-4 mt-1 text-xl" />
                    <div>
                      <h3 className="text-red-200 font-bold text-lg">Error</h3>
                      <p className="text-red-100 mt-2 text-lg">{errors.submit}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <label htmlFor="g_name" className="flex items-center text-xl font-bold text-white">
                    <span className="w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full mr-4"></span>
                    Group Name *
                  </label>
                  <input
                    id="g_name"
                    className={`w-full px-6 py-5 text-lg bg-white/10 border-2 rounded-2xl transition-all duration-300 focus:outline-none focus:ring-4 backdrop-blur-sm text-white placeholder-white/60 ${
                      errors.name 
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-400/30' 
                        : 'border-white/30 focus:border-blue-400 focus:ring-blue-400/30 hover:border-white/50'
                    }`}
                    name="name"
                    placeholder="e.g. Data Structures Study Group"
                    value={form.name}
                    onChange={handleChange}
                    maxLength={100}
                  />
                  {errors.name && (
                    <p className="flex items-center text-red-300 mt-3 text-lg">
                      <FontAwesomeIcon icon={faExclamationTriangle} className="mr-3 text-lg" />
                      {errors.name}
                    </p>
                  )}
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-white/70 text-lg">Choose a memorable name</span>
                    <span className={`text-lg font-semibold ${form.name.length > 80 ? 'text-orange-400' : 'text-white/60'}`}>
                      {form.name.length}/100
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <label htmlFor="g_field" className="flex items-center text-xl font-bold text-white">
                    <span className="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full mr-4"></span>
                    Field of Study *
                  </label>
                  <select
                    id="g_field"
                    className={`w-full px-6 py-5 text-lg bg-white/10 border-2 rounded-2xl transition-all duration-300 focus:outline-none focus:ring-4 backdrop-blur-sm text-white ${
                      errors.field 
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-400/30' 
                        : 'border-white/30 focus:border-green-400 focus:ring-green-400/30 hover:border-white/50'
                    }`}
                    name="field"
                    value={form.field}
                    onChange={handleChange}
                  >
                    <option value="" className="bg-slate-800 text-white">Select a field...</option>
                    {fieldOptions.map(field => (
                      <option key={field} value={field} className="bg-slate-800 text-white">{field}</option>
                    ))}
                  </select>
                  {errors.field && (
                    <p className="flex items-center text-red-300 mt-3 text-lg">
                      <FontAwesomeIcon icon={faExclamationTriangle} className="mr-3 text-lg" />
                      {errors.field}
                    </p>
                  )}
                  <p className="text-white/70 text-lg mt-3">What subject will you focus on?</p>
                </div>
              </div>

              <div className="space-y-4">
                <label htmlFor="g_exam" className="flex items-center text-xl font-bold text-white">
                  <span className="w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full mr-4"></span>
                  Upcoming Exam (Optional)
                </label>
                <input
                  id="g_exam"
                  className="w-full px-6 py-5 text-lg bg-white/10 border-2 border-white/30 rounded-2xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-400/30 focus:border-purple-400 hover:border-white/50 backdrop-blur-sm text-white placeholder-white/60"
                  name="exam"
                  placeholder="e.g. CS2100 Midterm, Final Exam, Certification Test"
                  value={form.exam}
                  onChange={handleChange}
                  maxLength={100}
                />
                <div className="flex justify-between items-center mt-3">
                  <span className="text-white/70 text-lg">Any specific exam you're preparing for?</span>
                  <span className="text-white/60 text-lg font-semibold">{form.exam.length}/100</span>
                </div>
              </div>

              <div className="space-y-4">
                <label htmlFor="g_desc" className="flex items-center text-xl font-bold text-white">
                  <span className="w-3 h-3 bg-gradient-to-r from-indigo-400 to-blue-500 rounded-full mr-4"></span>
                  Description
                </label>
                <textarea
                  id="g_desc"
                  className={`w-full px-6 py-5 text-lg bg-white/10 border-2 rounded-2xl transition-all duration-300 focus:outline-none focus:ring-4 resize-none backdrop-blur-sm text-white placeholder-white/60 ${
                    errors.description 
                      ? 'border-red-400 focus:border-red-400 focus:ring-red-400/30' 
                      : 'border-white/30 focus:border-indigo-400 focus:ring-indigo-400/30 hover:border-white/50'
                  }`}
                  name="description"
                  placeholder="What is the group about? What will you study together? How will you help each other?"
                  value={form.description}
                  onChange={handleChange}
                  rows={5}
                  maxLength={500}
                />
                {errors.description && (
                  <p className="flex items-center text-red-300 mt-3 text-lg">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="mr-3 text-lg" />
                    {errors.description}
                  </p>
                )}
                <div className="flex justify-between items-center mt-3">
                  <span className="text-white/70 text-lg">Help others understand your group's purpose</span>
                  <span className={`text-lg font-semibold ${form.description.length > 400 ? 'text-orange-400' : 'text-white/60'}`}>
                    {form.description.length}/500
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Mission Section */}
          {hasMission && (
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
              <div className="bg-gradient-to-r from-yellow-500/80 via-orange-500/80 to-red-500/80 backdrop-blur-sm px-10 py-8">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-sm">
                    <FontAwesomeIcon icon={faBullseye} className="text-white text-2xl" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white">Mission Challenge</h2>
                    <p className="text-yellow-100 text-lg">Set up an exciting goal for your group</p>
                  </div>
                </div>
              </div>
              
              <div className="p-10 space-y-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="lg:col-span-2 space-y-4">
                    <label htmlFor="mission_title" className="flex items-center text-xl font-bold text-white">
                      <span className="w-3 h-3 bg-gradient-to-r from-orange-400 to-red-500 rounded-full mr-4"></span>
                      Mission Title *
                    </label>
                    <input
                      id="mission_title"
                      className={`w-full px-6 py-5 text-lg bg-white/10 border-2 rounded-2xl transition-all duration-300 focus:outline-none focus:ring-4 backdrop-blur-sm text-white placeholder-white/60 ${
                        errors.mission_title 
                          ? 'border-red-400 focus:border-red-400 focus:ring-red-400/30' 
                          : 'border-white/30 focus:border-orange-400 focus:ring-orange-400/30 hover:border-white/50'
                      }`}
                      name="mission_title"
                      placeholder="e.g. Master the Handstand, Learn Python Basics, Complete 100 Push-ups"
                      value={form.mission_title}
                      onChange={handleChange}
                      maxLength={100}
                    />
                    {errors.mission_title && (
                      <p className="flex items-center text-red-300 mt-3 text-lg">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="mr-3 text-lg" />
                        {errors.mission_title}
                      </p>
                    )}
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-white/70 text-lg">What's the main goal participants need to achieve?</span>
                      <span className={`text-lg font-semibold ${form.mission_title.length > 80 ? 'text-orange-400' : 'text-white/60'}`}>
                        {form.mission_title.length}/100
                      </span>
                    </div>
                  </div>

                  <div className="lg:col-span-2 space-y-2">
                    <label htmlFor="mission_description" className="flex items-center text-lg font-semibold text-gray-800">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                      Mission Description *
                    </label>
                    <textarea
                      id="mission_description"
                      className={`w-full px-4 py-4 text-lg border-2 rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-orange-100 resize-none ${
                        errors.mission_description 
                          ? 'border-red-300 focus:border-red-500' 
                          : 'border-gray-200 focus:border-orange-500'
                      }`}
                      name="mission_description"
                      placeholder="Describe what participants need to accomplish. What proof do they need to submit? How will you judge success?"
                      value={form.mission_description}
                      onChange={handleChange}
                      rows={4}
                      maxLength={1000}
                    />
                    {errors.mission_description && (
                      <p className="flex items-center text-red-600 mt-2">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2 text-sm" />
                        {errors.mission_description}
                      </p>
                    )}
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm text-gray-500">Be specific about requirements and submission format</span>
                      <span className={`text-sm ${form.mission_description.length > 800 ? 'text-orange-500' : 'text-gray-400'}`}>
                        {form.mission_description.length}/1000
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="mission_deadline" className="flex items-center text-lg font-semibold text-gray-800">
                      <FontAwesomeIcon icon={faCalendar} className="text-blue-500 mr-3" />
                      Deadline *
                    </label>
                    <input
                      id="mission_deadline"
                      type="date"
                      className={`w-full px-4 py-4 text-lg border-2 rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-orange-100 ${
                        errors.mission_deadline 
                          ? 'border-red-300 focus:border-red-500' 
                          : 'border-gray-200 focus:border-orange-500'
                      }`}
                      name="mission_deadline"
                      value={form.mission_deadline}
                      onChange={handleChange}
                      min={getMinDate()}
                    />
                    {errors.mission_deadline && (
                      <p className="flex items-center text-red-600 mt-2">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2 text-sm" />
                        {errors.mission_deadline}
                      </p>
                    )}
                    {form.mission_deadline && (
                      <div className="flex items-center mt-2 text-blue-600">
                        <FontAwesomeIcon icon={faClock} className="mr-2" />
                        <span className="text-sm font-medium">
                          {getDaysUntilDeadline()} days until deadline
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="mission_capacity" className="flex items-center text-lg font-semibold text-gray-800">
                      <FontAwesomeIcon icon={faUsers} className="text-green-500 mr-3" />
                      Maximum Participants *
                    </label>
                    <input
                      id="mission_capacity"
                      type="number"
                      className={`w-full px-4 py-4 text-lg border-2 rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-orange-100 ${
                        errors.mission_capacity 
                          ? 'border-red-300 focus:border-red-500' 
                          : 'border-gray-200 focus:border-orange-500'
                      }`}
                      name="mission_capacity"
                      value={form.mission_capacity}
                      onChange={handleChange}
                      min="1"
                      max="100"
                    />
                    {errors.mission_capacity && (
                      <p className="flex items-center text-red-600 mt-2">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2 text-sm" />
                        {errors.mission_capacity}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 mt-2">How many people can join this challenge?</p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="mission_badge_name" className="flex items-center text-lg font-semibold text-gray-800">
                      <FontAwesomeIcon icon={faAward} className="text-yellow-500 mr-3" />
                      Badge Name (Optional)
                    </label>
                    <input
                      id="mission_badge_name"
                      className={`w-full px-4 py-4 text-lg border-2 rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-orange-100 ${
                        errors.mission_badge_name 
                          ? 'border-red-300 focus:border-red-500' 
                          : 'border-gray-200 focus:border-orange-500'
                      }`}
                      name="mission_badge_name"
                      placeholder="e.g. Handstand Master, Python Pro, Push-up Champion"
                      value={form.mission_badge_name}
                      onChange={handleChange}
                      maxLength={50}
                    />
                    {errors.mission_badge_name && (
                      <p className="flex items-center text-red-600 mt-2">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2 text-sm" />
                        {errors.mission_badge_name}
                      </p>
                    )}
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm text-gray-500">What will successful participants earn?</span>
                      <span className="text-sm text-gray-400">{form.mission_badge_name.length}/50</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="mission_badge_description" className="flex items-center text-lg font-semibold text-gray-800">
                      <FontAwesomeIcon icon={faInfoCircle} className="text-purple-500 mr-3" />
                      Badge Description (Optional)
                    </label>
                    <textarea
                      id="mission_badge_description"
                      className={`w-full px-4 py-4 text-lg border-2 rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-orange-100 resize-none ${
                        errors.mission_badge_description 
                          ? 'border-red-300 focus:border-red-500' 
                          : 'border-gray-200 focus:border-orange-500'
                      }`}
                      name="mission_badge_description"
                      placeholder="What does earning this badge mean? What skills does it represent?"
                      value={form.mission_badge_description}
                      onChange={handleChange}
                      rows={2}
                      maxLength={200}
                    />
                    {errors.mission_badge_description && (
                      <p className="flex items-center text-red-600 mt-2">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2 text-sm" />
                        {errors.mission_badge_description}
                      </p>
                    )}
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm text-gray-500">Explain the significance of this achievement</span>
                      <span className={`text-sm ${form.mission_badge_description.length > 160 ? 'text-orange-500' : 'text-gray-400'}`}>
                        {form.mission_badge_description.length}/200
                      </span>
                    </div>
                  </div>
        </div>

                {/* Mission Preview */}
                {form.mission_title && form.mission_description && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="flex items-center justify-center w-10 h-10 bg-blue-500 rounded-xl">
                        <FontAwesomeIcon icon={faInfoCircle} className="text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-blue-900">Mission Preview</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-blue-800">
                      <div>
                        <p className="font-semibold text-blue-900 mb-1">🎯 Challenge:</p>
                        <p className="text-blue-700">{form.mission_title}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-blue-900 mb-1">📝 Description:</p>
                        <p className="text-blue-700 text-sm">{form.mission_description}</p>
                      </div>
                      {form.mission_deadline && (
                        <div>
                          <p className="font-semibold text-blue-900 mb-1">⏰ Deadline:</p>
                          <p className="text-blue-700">
                            {new Date(form.mission_deadline).toLocaleDateString()} 
                            <span className="ml-2 text-blue-600 font-medium">({getDaysUntilDeadline()} days)</span>
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-blue-900 mb-1">👥 Capacity:</p>
                        <p className="text-blue-700">{form.mission_capacity} participants</p>
                      </div>
                      {form.mission_badge_name && (
                        <div className="md:col-span-2">
                          <p className="font-semibold text-blue-900 mb-1">🏆 Badge:</p>
                          <p className="text-blue-700">{form.mission_badge_name}</p>
                          {form.mission_badge_description && (
                            <p className="text-blue-600 text-sm mt-1">{form.mission_badge_description}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submit Section */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500/80 via-emerald-600/80 to-teal-600/80 backdrop-blur-sm px-10 py-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-sm">
                    <FontAwesomeIcon icon={faRocket} className="text-white text-2xl" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white">Ready to Launch!</h2>
                    <p className="text-green-100 text-lg">
                      {hasMission 
                        ? 'Your mission-driven study group is ready to go' 
                        : 'Your study group is ready to start learning together'
                      }
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-green-100 text-lg mb-2">Group Type</div>
                  <div className="text-white font-bold text-xl">
                    {hasMission ? '🎯 Mission Challenge' : '👥 Basic Group'}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  {hasMission ? (
                    <div className="flex items-center space-x-3 text-yellow-300">
                      <FontAwesomeIcon icon={faTrophy} className="text-2xl" />
                      <span className="font-bold text-xl">Mission Challenge Enabled</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3 text-blue-300">
                      <FontAwesomeIcon icon={faUsers} className="text-2xl" />
                      <span className="font-bold text-xl">Basic Study Group</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-6">
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    disabled={loading}
                    className="px-8 py-4 border-2 border-white/30 text-white rounded-2xl font-bold text-lg hover:border-white/50 hover:bg-white/10 transition-all duration-300 disabled:opacity-50 backdrop-blur-sm"
                  >
                    {showPreview ? (
                      <>
                        <FontAwesomeIcon icon={faTimes} className="mr-3" />
                        Hide Preview
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faInfoCircle} className="mr-3" />
                        Preview
                      </>
                    )}
                  </button>
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-12 py-5 bg-gradient-to-r from-blue-500 via-purple-600 to-pink-600 text-white rounded-2xl font-bold text-xl hover:from-blue-600 hover:via-purple-700 hover:to-pink-700 transform hover:scale-105 transition-all duration-300 shadow-2xl disabled:opacity-50 disabled:transform-none"
                  >
                    {loading ? (
                      <span className="flex items-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-4"></div>
                        Creating Group...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <FontAwesomeIcon icon={faRocket} className="mr-3" />
                        Launch Group
                      </span>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Success Message Placeholder */}
              {!loading && (
                <div className="mt-8 p-6 bg-green-500/20 border border-green-400/50 rounded-2xl backdrop-blur-sm">
                  <div className="flex items-center space-x-4">
                    <FontAwesomeIcon icon={faCheckCircle} className="text-green-400 text-2xl" />
                    <div>
                      <p className="text-green-200 font-bold text-lg">Almost there!</p>
                      <p className="text-green-100 text-lg">
                        {hasMission 
                          ? 'Your mission challenge will be live once you click "Launch Group"'
                          : 'Your study group will be ready for members to join'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
      </form>
      </div>
    </div>
  )
}
