import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { 
  faUsers, faInfo, faGraduationCap, faEye, faChevronRight, 
  faChevronLeft, faCalendarAlt, faTrophy, faBook, faCheck,
  faImage, faUpload, faTrash
} from "@fortawesome/free-solid-svg-icons"
import { createGroup } from "../utils/api"
import { useAuth } from "../features/auth/AuthContext"

const STEPS = [
  { id: 'cover', title: 'Upload cover', icon: faImage, section: 'GROUP INFORMATION' },
  { id: 'general', title: 'General information', icon: faInfo, section: 'GROUP INFORMATION' },
  { id: 'review', title: 'Review and Create', icon: faEye, section: 'CREATE GROUP' }
]

export default function CreateGroup() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({
    name: "",
    field: "",
    exam: "",
    description: "",
    deadline: "",
    capacity: 10,
    coverImage: null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState({})
  const [lastUpdate, setLastUpdate] = useState(new Date())


  if (!isLoading && !isAuthenticated) {
    navigate("/login", { replace: true })
    return null
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Update last update time when form data changes
  useEffect(() => {
    setLastUpdate(new Date())
  }, [formData])

  function validateStep(step) {
    const errs = {}
    switch (step) {
      case 0: // Cover Image (optional)
        // Cover image is optional, so no validation needed
        break
      case 1: // General Info
        if (!formData.name.trim()) errs.name = "Group name is required"
        if (!formData.field.trim()) errs.field = "Field of study is required"
        break
      case 2: // Review
        // Final validation - check all required fields
        if (!formData.name.trim()) errs.name = "Group name is required"
        if (!formData.field.trim()) errs.field = "Field of study is required"
        break
    }
    return errs
  }

  function canProceedToNext() {
    const errs = validateStep(currentStep)
    return Object.keys(errs).length === 0
  }

  function canCreateGroup() {
    // Check if all required fields are filled
    return formData.name.trim() && formData.field.trim()
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
    // Validate all required fields for final submission
    const errs = {}
    if (!formData.name.trim()) errs.name = "Group name is required"
    if (!formData.field.trim()) errs.field = "Field of study is required"
    
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

    // Check if token still exists before making API call
    const currentToken = localStorage.getItem("access_token")
    if (!currentToken) {
      setError("Your session has expired. Please log in again.")
      setTimeout(() => {
        navigate("/login", { replace: true })
      }, 2000)
      return
    }
    
    setLoading(true)
    try {
      const payload = {
        name: formData.name.trim(),
        field: formData.field.trim(),
        exam: formData.exam.trim() || null,
        description: formData.description.trim() || null,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
        capacity: formData.capacity,
      }
      
      // Handle cover image
      if (formData.coverImage) {
        // Convert image to data URL for now (in production, you'd upload to a service like AWS S3)
        const reader = new FileReader()
        reader.onload = async () => {
          // Check token again before API call (in case it expired during image processing)
          const tokenBeforeApi = localStorage.getItem("access_token")
          if (!tokenBeforeApi) {
            setError("Your session has expired. Please log in again.")
            setTimeout(() => {
              navigate("/login", { replace: true })
            }, 2000)
            return
          }
          
          payload.cover_image_url = reader.result
          await createGroup(payload)
          navigate("/groups", { replace: true })
        }
        reader.readAsDataURL(formData.coverImage)
      } else {
        await createGroup(payload)
        navigate("/groups", { replace: true })
      }
    } catch (e) {
      if (e?.response?.status === 401) {
        setError("Your session has expired. Please log in again.")
        setTimeout(() => {
          navigate("/login", { replace: true })
        }, 2000)
      } else {
        setError(e?.response?.data?.detail || "Failed to create group")
      }
    } finally {
      setLoading(false)
    }
  }

  function saveDraft() {
    localStorage.setItem('groupDraft', JSON.stringify(formData))
    setError("")
  }

  function cancel() {
    if (confirm("Are you sure you want to cancel? All changes will be lost.")) {
      localStorage.removeItem('groupDraft')
      navigate("/groups")
    }
  }

  const fieldOptions = [
    "Computer Science", "Mathematics", "Physics", "Chemistry", "Biology",
    "Engineering", "Medicine", "Business", "Economics", "Psychology",
    "Languages", "History", "Literature", "Art", "Music", "Sports",
    "Wellness", "Productivity", "Other"
  ]

  return (
    <div className="min-h-screen bg-gray-50 group-creation-form">
      <div className="flex">
        {/* Left Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 p-6 step-sidebar">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Create Study Group</h1>
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
                           const isCompleted = stepIndex < currentStep && (
                             stepIndex === 0 || // Cover image step is always considered completed if we've moved past it
                             (stepIndex === 1 && formData.name.trim() && formData.field.trim()) // General info completed
                           )
                    
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
                             <CoverImageStep 
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
                               fieldOptions={fieldOptions}
                             />
                           )}
                           {currentStep === 2 && (
                             <ReviewCreateStep 
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
                    disabled={loading || !canCreateGroup()}
                    className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <span>{loading ? "Creating..." : "Create Study Group"}</span>
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
function CoverImageStep({ formData, updateFormData, fieldErrors }) {
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type.startsWith('image/')) {
        updateFormData({ coverImage: file })
      }
    }
  }

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      updateFormData({ coverImage: e.target.files[0] })
    }
  }

  const removeImage = () => {
    updateFormData({ coverImage: null })
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Group Cover</h2>
        <p className="text-gray-600">Choose a cover image that represents your study group</p>
      </div>

      <div className="max-w-md mx-auto">
        {formData.coverImage ? (
          <div className="relative">
            <img
              src={URL.createObjectURL(formData.coverImage)}
              alt="Group cover preview"
              className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
            />
            <button
              onClick={removeImage}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
              title="Remove image"
            >
              <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-pink-400 bg-pink-50' : 'border-gray-300 hover:border-pink-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <FontAwesomeIcon icon={faUpload} className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Drag and drop an image here, or</p>
            <label className="inline-flex items-center px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 cursor-pointer transition-colors">
              <FontAwesomeIcon icon={faImage} className="w-4 h-4 mr-2" />
              Choose File
              <input
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
              />
            </label>
            <p className="text-sm text-gray-500 mt-2">PNG, JPG, GIF up to 10MB</p>
          </div>
        )}
      </div>

      {fieldErrors.coverImage && (
        <p className="text-red-500 text-sm text-center">{fieldErrors.coverImage}</p>
      )}
    </div>
  )
}

function GeneralInfoStep({ formData, updateFormData, fieldErrors, fieldOptions }) {
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
              Group Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateFormData({ name: e.target.value })}
              placeholder="Make it catchy and memorable"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-gray-900 bg-white ${
                fieldErrors.name ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {fieldErrors.name && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Field of Study *
            </label>
            <select
              value={formData.field}
              onChange={(e) => updateFormData({ field: e.target.value })}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-gray-900 bg-white ${
                fieldErrors.field ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Choose the subject for your study group</option>
              {fieldOptions.map(field => (
                <option key={field} value={field}>{field}</option>
              ))}
            </select>
            {fieldErrors.field && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.field}</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Exam/Certification
            </label>
            <input
              type="text"
              value={formData.exam}
              onChange={(e) => updateFormData({ exam: e.target.value })}
              placeholder="e.g., GRE, MCAT, CPA, AWS Certification"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-gray-900 bg-white"
            />
          </div>

                 <div>
                   <label className="block text-sm font-semibold text-gray-700 mb-2">
                     Description
                   </label>
                   <textarea
                     value={formData.description}
                     onChange={(e) => updateFormData({ description: e.target.value })}
                     placeholder="Describe your study group's focus, goals, and what participants can expect"
                     rows={4}
                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-gray-900 bg-white"
                   />
                 </div>

                 <div>
                   <label className="block text-sm font-semibold text-gray-700 mb-2">
                     Group Deadline
                   </label>
                   <input
                     type="date"
                     value={formData.deadline}
                     onChange={(e) => updateFormData({ deadline: e.target.value })}
                     min={new Date().toISOString().split('T')[0]}
                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-gray-900 bg-white"
                   />
                 </div>

                 <div>
                   <label className="block text-sm font-semibold text-gray-700 mb-2">
                     Maximum Participants
                   </label>
                   <input
                     type="number"
                     min="2"
                     max="50"
                     value={formData.capacity}
                     onChange={(e) => updateFormData({ capacity: parseInt(e.target.value) || 10 })}
                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-gray-900 bg-white"
                   />
                 </div>
        </div>
      </div>
    </div>
  )
}


function ReviewCreateStep({ formData, updateFormData, error }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <FontAwesomeIcon icon={faEye} className="w-6 h-6 text-pink-500" />
        <h2 className="text-2xl font-bold text-gray-900">Review and Create</h2>
      </div>

      <p className="text-gray-600 mb-6">
        Review your study group details before creating. Make sure everything looks correct!
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Cover Image Preview */}
      {formData.coverImage && (
        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cover Image</h3>
          <div className="max-w-md mx-auto">
            <img
              src={URL.createObjectURL(formData.coverImage)}
              alt="Group cover preview"
              className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
            />
          </div>
        </div>
      )}

             <div className="bg-gray-50 rounded-xl p-6 space-y-6">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="space-y-4">
                   <h3 className="text-lg font-semibold text-gray-900">Group Details</h3>
                   <div className="space-y-3">
                     <div>
                       <span className="text-sm font-medium text-gray-500">Name:</span>
                       <p className="text-gray-900">{formData.name || "Not specified"}</p>
                     </div>
                     <div>
                       <span className="text-sm font-medium text-gray-500">Field:</span>
                       <p className="text-gray-900">{formData.field || "Not specified"}</p>
                     </div>
                     <div>
                       <span className="text-sm font-medium text-gray-500">Exam:</span>
                       <p className="text-gray-900">{formData.exam || "Not specified"}</p>
                     </div>
                     <div>
                       <span className="text-sm font-medium text-gray-500">Description:</span>
                       <p className="text-gray-900">{formData.description || "No description provided"}</p>
                     </div>
                   </div>
                 </div>

                 <div className="space-y-4">
                   <h3 className="text-lg font-semibold text-gray-900">Group Settings</h3>
                   <div className="space-y-3">
                     <div>
                       <span className="text-sm font-medium text-gray-500">Deadline:</span>
                       <p className="text-gray-900">
                         {formData.deadline 
                           ? new Date(formData.deadline).toLocaleDateString() 
                           : "No deadline set"
                         }
                       </p>
                     </div>
                     <div>
                       <span className="text-sm font-medium text-gray-500">Capacity:</span>
                       <p className="text-gray-900">{formData.capacity} members</p>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
    </div>
  )
}
