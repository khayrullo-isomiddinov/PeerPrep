import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { 
  faImage, faInfo, faMapMarkerAlt, faEye, faChevronRight, 
  faChevronLeft, faCalendarAlt, faClock, faUsers, faGraduationCap,
  faBook, faTrash, faUpload, faCheck
} from "@fortawesome/free-solid-svg-icons"
import { createEvent } from "../../utils/api"

const STEPS = [
  { id: 'cover', title: 'Upload cover', icon: faImage, section: 'EVENT INFORMATION' },
  { id: 'general', title: 'General information', icon: faInfo, section: 'EVENT INFORMATION' },
  { id: 'location', title: 'Location and time', icon: faMapMarkerAlt, section: 'EVENT INFORMATION' },
  { id: 'review', title: 'Review and Publish', icon: faEye, section: 'PUBLISH EVENT' }
]

export default function CreateEventForm({ onCreated }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    startsAt: "",
    location: "",
    address: "",
    city: "",
    state: "",
    country: "",
    capacity: 8,
    kind: "one_off",
    coverImage: null,
    albumImages: []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState({})
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const navigate = useNavigate()

  // Update last update time when form data changes
  useEffect(() => {
    setLastUpdate(new Date())
  }, [formData])

  function validateStep(step) {
    const errs = {}
    switch (step) {
      case 0: // Cover
        // Cover is optional, no validation needed
        break
      case 1: // General
        if (!formData.title.trim()) errs.title = "Title is required"
        if (!formData.category) errs.category = "Category is required"
        break
      case 2: // Location and time
        if (!formData.startsAt) errs.startsAt = "Start date/time is required"
        if (!formData.location.trim()) errs.location = "Location is required"
        if (!formData.address.trim()) errs.address = "Address is required"
        if (!formData.city.trim()) errs.city = "City is required"
        break
    }
    return errs
  }

  function canProceedToNext() {
    const errs = validateStep(currentStep)
    return Object.keys(errs).length === 0
  }

  function nextStep() {
    if (canProceedToNext() && currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  function prevStep() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  function updateFormData(updates) {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  async function handleSubmit() {
    setError("")
    const errs = validateStep(currentStep)
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    try {
      const payload = {
        title: formData.title.trim(),
        starts_at: new Date(formData.startsAt).toISOString(),
        location: formData.location.trim(),
        capacity: Number(formData.capacity),
        description: formData.description?.trim() || null,
        group_id: null,
        kind: formData.kind
      }
      const evt = await createEvent(payload)
      onCreated?.(evt)
      navigate("/events")
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to create event")
    } finally {
      setLoading(false)
    }
  }

  function saveDraft() {
    // Save form data to localStorage as draft
    localStorage.setItem('eventDraft', JSON.stringify(formData))
    setError("")
    // Show success message
  }

  function cancel() {
    if (confirm("Are you sure you want to cancel? All changes will be lost.")) {
      localStorage.removeItem('eventDraft')
      navigate("/events")
    }
  }

  const categories = [
    "Mathematics", "Physics", "Chemistry", "Biology", "Computer Science",
    "Engineering", "Literature", "History", "Economics", "Psychology",
    "Medicine", "Law", "Business", "Art", "Music", "Other"
  ]

  return (
    <div className="min-h-screen bg-gray-50 event-creation-form">
      <div className="flex">
        {/* Left Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 p-6 step-sidebar">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Create a Study Group</h1>
            <div className="text-sm text-gray-500 mb-1">
              Last update: {lastUpdate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })} | {lastUpdate.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
            <div className="text-sm text-gray-500">
              Status: <span className="text-orange-600 font-medium">Draft</span>
            </div>
          </div>

          <div className="space-y-6">
            {Object.entries(
              STEPS.reduce((acc, step) => {
                if (!acc[step.section]) acc[step.section] = []
                acc[step.section].push(step)
                return acc
              }, {})
            ).map(([section, steps]) => (
              <div key={section}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  {section}
                </h3>
                <div className="space-y-2">
                  {steps.map((step, index) => {
                    const stepIndex = STEPS.findIndex(s => s.id === step.id)
                    const isActive = stepIndex === currentStep
                    const isCompleted = stepIndex < currentStep
                    
                    return (
                      <button
                        key={step.id}
                        onClick={() => setCurrentStep(stepIndex)}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left step-button ${
                          isActive 
                            ? 'bg-pink-50 text-pink-600 border border-pink-200' 
                            : isCompleted
                            ? 'text-gray-600 hover:bg-gray-50'
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        <FontAwesomeIcon 
                          icon={step.icon} 
                          className={`w-4 h-4 ${
                            isActive ? 'text-pink-600' : isCompleted ? 'text-green-500' : ''
                          }`}
                        />
                        <span className="text-sm font-medium">{step.title}</span>
                        {isCompleted && (
                          <FontAwesomeIcon icon={faCheck} className="w-3 h-3 text-green-500 ml-auto" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            {/* Step Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6 step-content">
              {currentStep === 0 && (
                <UploadCoverStep 
                  formData={formData} 
                  updateFormData={updateFormData}
                  fieldErrors={fieldErrors}
                />
              )}
              {currentStep === 1 && (
                <GeneralInfoStep 
                  formData={formData} 
                  updateFormData={updateFormData}
                  fieldErrors={fieldErrors}
                  categories={categories}
                />
              )}
              {currentStep === 2 && (
                <LocationTimeStep 
                  formData={formData} 
                  updateFormData={updateFormData}
                  fieldErrors={fieldErrors}
                />
              )}
              {currentStep === 3 && (
                <ReviewPublishStep 
                  formData={formData} 
                  updateFormData={updateFormData}
                  error={error}
                />
              )}
          </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <button
                onClick={cancel}
                className="text-gray-500 hover:text-gray-700 font-medium"
              >
                ✕ Cancel
              </button>
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={saveDraft}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Save draft
                </button>
                
                {currentStep < STEPS.length - 1 ? (
                  <button
                    onClick={nextStep}
                    disabled={!canProceedToNext()}
                    className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <span>Next</span>
                    <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4" />
                  </button>
                ) : (
              <button
                    onClick={handleSubmit}
                    disabled={loading || !canProceedToNext()}
                    className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <span>{loading ? "Publishing..." : "Publish Study Group"}</span>
                    <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4" />
              </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Step Components
function UploadCoverStep({ formData, updateFormData, fieldErrors }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <FontAwesomeIcon icon={faImage} className="w-6 h-6 text-pink-500" />
        <h2 className="text-2xl font-bold text-gray-900">Upload cover</h2>
      </div>
      
      <p className="text-gray-600 mb-6">
        Upload a cover image to capture your study group's focus and attract participants.
      </p>

      <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-pink-400 transition-colors">
        {formData.coverImage ? (
          <div className="space-y-4">
            <img 
              src={formData.coverImage} 
              alt="Cover preview" 
              className="mx-auto max-h-64 rounded-lg shadow-lg"
            />
            <div className="flex items-center justify-center space-x-4">
              <span className="text-sm text-gray-600">cover-image.jpg</span>
              <button className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center space-x-1">
                <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                <span>Remove</span>
              </button>
              <button className="bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 transition-colors text-sm font-medium">
                Change
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto">
              <FontAwesomeIcon icon={faUpload} className="w-8 h-8 text-pink-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload cover image</h3>
              <p className="text-gray-600 mb-4">Drag and drop or click to browse</p>
              <button className="bg-pink-500 text-white px-6 py-2 rounded-lg hover:bg-pink-600 transition-colors font-medium">
                Choose File
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function GeneralInfoStep({ formData, updateFormData, fieldErrors, categories }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <FontAwesomeIcon icon={faInfo} className="w-6 h-6 text-pink-500" />
        <h2 className="text-2xl font-bold text-gray-900">General information</h2>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => updateFormData({ title: e.target.value })}
              placeholder="Make it catchy and memorable"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 form-input ${
                fieldErrors.title ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {fieldErrors.title && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.title}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => updateFormData({ description: e.target.value })}
              placeholder="Provide essential study group details, topics covered, and what participants can expect"
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 form-input"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => updateFormData({ category: e.target.value })}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 ${
                fieldErrors.category ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Choose the subject for your study group</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {fieldErrors.category && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.category}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Study Materials
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <div className="space-y-2">
                <FontAwesomeIcon icon={faUpload} className="w-8 h-8 text-gray-400 mx-auto" />
                <p className="text-sm text-gray-600">Upload study materials, notes, or resources</p>
                <button className="text-pink-500 hover:text-pink-600 text-sm font-medium">
                  + Add files
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LocationTimeStep({ formData, updateFormData, fieldErrors }) {
  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-3 mb-6">
        <FontAwesomeIcon icon={faMapMarkerAlt} className="w-6 h-6 text-pink-500" />
        <h2 className="text-2xl font-bold text-gray-900">Location and time</h2>
      </div>

      {/* Location Section */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Location</h3>
          <p className="text-gray-600 mb-4">
            Specify where your study group will meet - online or in person.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Study Location *
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => updateFormData({ location: e.target.value })}
                placeholder="e.g., Library Room 3B, Zoom Meeting, Coffee Shop"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 ${
                  fieldErrors.location ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {fieldErrors.location && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.location}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => updateFormData({ address: e.target.value })}
                placeholder="Street address"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 ${
                  fieldErrors.address ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {fieldErrors.address && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.address}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => updateFormData({ city: e.target.value })}
                  placeholder="City"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 ${
                    fieldErrors.city ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {fieldErrors.city && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.city}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  State/Province
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => updateFormData({ state: e.target.value })}
                  placeholder="State"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <FontAwesomeIcon icon={faMapMarkerAlt} className="w-12 h-12 mb-2" />
              <p className="text-sm">Map integration would go here</p>
            </div>
          </div>
        </div>
      </div>

      {/* Time Section */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Schedule</h3>
          <p className="text-gray-600 mb-4">
            Choose when your study group will meet.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Study Date *
              </label>
              <input
                type="date"
                value={formData.startsAt ? formData.startsAt.split('T')[0] : ''}
                onChange={(e) => {
                  const date = e.target.value
                  const time = formData.startsAt ? formData.startsAt.split('T')[1] : '18:00'
                  updateFormData({ startsAt: `${date}T${time}` })
                }}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 ${
                  fieldErrors.startsAt ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {fieldErrors.startsAt && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.startsAt}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={formData.startsAt ? formData.startsAt.split('T')[1] : '18:00'}
                  onChange={(e) => {
                    const date = formData.startsAt ? formData.startsAt.split('T')[0] : new Date().toISOString().split('T')[0]
                    const time = e.target.value
                    updateFormData({ startsAt: `${date}T${time}` })
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Duration
                </label>
                <select
                  value={formData.capacity}
                  onChange={(e) => updateFormData({ capacity: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                >
                  <option value="1">1 hour</option>
                  <option value="2">2 hours</option>
                  <option value="3">3 hours</option>
                  <option value="4">4 hours</option>
                  <option value="8">All day</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Group Size
              </label>
              <input
                type="number"
                min="2"
                max="50"
                value={formData.capacity}
                onChange={(e) => updateFormData({ capacity: e.target.value })}
                placeholder="Maximum participants"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Study Type
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="kind"
                    value="one_off"
                    checked={formData.kind === "one_off"}
                    onChange={(e) => updateFormData({ kind: e.target.value })}
                    className="mr-3"
                  />
                  <span className="text-sm">One-time session</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="kind"
                    value="group"
                    checked={formData.kind === "group"}
                    onChange={(e) => updateFormData({ kind: e.target.value })}
                    className="mr-3"
                  />
                  <span className="text-sm">Ongoing study group</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReviewPublishStep({ formData, updateFormData, error }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <FontAwesomeIcon icon={faEye} className="w-6 h-6 text-pink-500" />
        <h2 className="text-2xl font-bold text-gray-900">Review and Publish</h2>
      </div>

      <p className="text-gray-600 mb-6">
        Review your study group details before publishing. Make sure everything looks correct!
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div className="bg-gray-50 rounded-xl p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Study Group Details</h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500">Name:</span>
                <p className="text-gray-900">{formData.title || "Not specified"}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Category:</span>
                <p className="text-gray-900">{formData.category || "Not specified"}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Description:</span>
                <p className="text-gray-900">{formData.description || "No description provided"}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Schedule & Location</h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500">Date & Time:</span>
                <p className="text-gray-900">
                  {formData.startsAt 
                    ? new Date(formData.startsAt).toLocaleString() 
                    : "Not specified"
                  }
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Location:</span>
                <p className="text-gray-900">{formData.location || "Not specified"}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Address:</span>
                <p className="text-gray-900">
                  {[formData.address, formData.city, formData.state].filter(Boolean).join(", ") || "Not specified"}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Max Participants:</span>
                <p className="text-gray-900">{formData.capacity}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}