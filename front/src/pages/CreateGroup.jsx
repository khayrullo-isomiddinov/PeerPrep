import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faInfo, faEye, faChevronRight, faCheck,
  faImage, faUpload, faTrash, faWandMagicSparkles
} from "@fortawesome/free-solid-svg-icons"
import { createGroup, refineEventText, generateGroupCoverImage } from "../utils/api"
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
    capacity: 4,
    coverImage: null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState({})
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [refiningName, setRefiningName] = useState(false)
  const [refiningDescription, setRefiningDescription] = useState(false)
  const [refiningMissionTitle, setRefiningMissionTitle] = useState(false)
  const [refiningMissionDescription, setRefiningMissionDescription] = useState(false)


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

  useEffect(() => {
    setLastUpdate(new Date())
  }, [formData])

  function validateStep(step) {
    const errs = {}
    switch (step) {
      case 0:
        // Cover image is optional
        break
      case 1:
        if (!formData.name.trim()) errs.name = "Group name is required"
        if (!formData.field.trim()) errs.field = "Field of study is required"
        break
      case 2:
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

  async function handleRefineName() {
    if (!formData.name.trim()) {
      setError("Please enter a group name first before refining.")
      return
    }
    
    const token = localStorage.getItem("access_token")
    if (!token) {
      setError("Please log in to use AI refinement.")
      navigate("/login")
      return
    }
    
    setRefiningName(true)
    setError("")
    try {
      const refined = await refineEventText(formData.name, "title")
      updateFormData({ name: refined })
    } catch (e) {
      if (e?.response?.status === 401) {
        setError("Your session has expired. Please log in again.")
        navigate("/login")
      } else {
        setError(e?.response?.data?.detail || "Failed to refine name. Please try again.")
      }
    } finally {
      setRefiningName(false)
    }
  }

  async function handleRefineDescription() {
    if (!formData.description.trim()) {
      setError("Please enter a description first before refining.")
      return
    }
    
    const token = localStorage.getItem("access_token")
    if (!token) {
      setError("Please log in to use AI refinement.")
      navigate("/login")
      return
    }
    
    setRefiningDescription(true)
    setError("")
    try {
      const refined = await refineEventText(formData.description, "description")
      updateFormData({ description: refined })
    } catch (e) {
      if (e?.response?.status === 401) {
        setError("Your session has expired. Please log in again.")
        navigate("/login")
      } else {
        setError(e?.response?.data?.detail || "Failed to refine description. Please try again.")
      }
    } finally {
      setRefiningDescription(false)
    }
  }

  async function handleRefineMissionTitle() {
    if (!formData.mission_title?.trim()) {
      setError("Please enter a mission title first before refining.")
      return
    }
    
    const token = localStorage.getItem("access_token")
    if (!token) {
      setError("Please log in to use AI refinement.")
      navigate("/login")
      return
    }
    
    setRefiningMissionTitle(true)
    setError("")
    try {
      const refined = await refineEventText(formData.mission_title, "title")
      updateFormData({ mission_title: refined })
    } catch (e) {
      if (e?.response?.status === 401) {
        setError("Your session has expired. Please log in again.")
        navigate("/login")
      } else {
        setError(e?.response?.data?.detail || "Failed to refine mission title. Please try again.")
      }
    } finally {
      setRefiningMissionTitle(false)
    }
  }

  async function handleRefineMissionDescription() {
    if (!formData.mission_description?.trim()) {
      setError("Please enter a mission description first before refining.")
      return
    }
    
    const token = localStorage.getItem("access_token")
    if (!token) {
      setError("Please log in to use AI refinement.")
      navigate("/login")
      return
    }
    
    setRefiningMissionDescription(true)
    setError("")
    try {
      const refined = await refineEventText(formData.mission_description, "description")
      updateFormData({ mission_description: refined })
    } catch (e) {
      if (e?.response?.status === 401) {
        setError("Your session has expired. Please log in again.")
        navigate("/login")
      } else {
        setError(e?.response?.data?.detail || "Failed to refine mission description. Please try again.")
      }
    } finally {
      setRefiningMissionDescription(false)
    }
  }

  async function handleSubmit() {
    setError("")
    const errs = {}
    if (!formData.name.trim()) errs.name = "Group name is required"
    if (!formData.field.trim()) errs.field = "Field of study is required"

    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

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
      const tokenBeforeApi = localStorage.getItem("access_token")
      if (!tokenBeforeApi) {
        setError("Your session has expired. Please log in again.")
        setTimeout(() => {
          navigate("/login", { replace: true })
        }, 2000)
        setLoading(false)
        return
      }

      const capacity = typeof formData.capacity === 'number' && formData.capacity >= 2 && formData.capacity <= 50
        ? formData.capacity
        : 4

      let coverImageUrl = null
      if (formData.coverImage) {
        try {
          coverImageUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result)
            reader.onerror = () => reject(new Error("Failed to read cover image"))
            reader.readAsDataURL(formData.coverImage)
          })
        } catch (e) {
          console.warn("Failed to read cover image, continuing without it:", e)
        }
      }

      const payload = {
        name: formData.name.trim(),
        field: formData.field.trim(),
        exam: formData.exam.trim() || null,
        description: formData.description.trim() || null,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
        capacity: capacity,
        cover_image_url: coverImageUrl
      }

      const newGroup = await createGroup(payload)
      navigate("/groups", { 
        replace: true,
        state: { newGroup }
      })
    } catch (e) {
      setLoading(false)
      if (e?.response?.status === 401) {
        setError("Your session has expired. Please log in again.")
        setTimeout(() => {
          navigate("/login", { replace: true })
        }, 2000)
      } else {
        setError(e?.response?.data?.detail || "Failed to create group")
      }
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
      <div className="nav-spacer" />
      <div className="flex flex-col lg:flex-row">
        <div className="w-full lg:w-80 bg-white border-r-0 lg:border-r border-b lg:border-b-0 border-gray-200 p-4 lg:p-6 step-sidebar">
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
                      (stepIndex === 0 && formData.coverImage) ||
                      (stepIndex === 1 && formData.name.trim() && formData.field.trim())
                    )

                    return (
                      <button
                        key={step.id}
                        onClick={() => setCurrentStep(stepIndex)}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left step-button ${isActive
                            ? 'bg-pink-50 text-pink-600 border border-pink-200'
                            : isCompleted
                              ? 'text-gray-600 hover:bg-gray-50'
                              : 'text-gray-400 hover:text-gray-600'
                          }`}
                      >
                        <FontAwesomeIcon
                          icon={step.icon}
                          className={`w-4 h-4 ${isActive ? 'text-pink-600' : isCompleted ? 'text-green-500' : ''
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

        <div className="flex-1 p-4 lg:p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 lg:p-8 mb-6 step-content">
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
                  onRefineName={handleRefineName}
                  onRefineDescription={handleRefineDescription}
                  refiningName={refiningName}
                  refiningDescription={refiningDescription}
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

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <button
                onClick={cancel}
                className="text-gray-500 hover:text-gray-700 font-medium text-center sm:text-left"
              >
                ✕ Cancel
              </button>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:space-x-4">
                <button
                  onClick={saveDraft}
                  className="touch-target w-full sm:w-auto px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors font-medium"
                >
                  Save draft
                </button>

                {currentStep < STEPS.length - 1 ? (
                  <button
                    onClick={nextStep}
                    disabled={!canProceedToNext()}
                    className="touch-target w-full sm:w-auto px-6 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 active:bg-pink-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    <span>Next</span>
                    <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !canCreateGroup()}
                    className="touch-target w-full sm:w-auto px-6 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 active:bg-pink-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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

function CoverImageStep({ formData, updateFormData, fieldErrors }) {
  const [dragActive, setDragActive] = useState(false)
  const [mode, setMode] = useState("upload")
  const [aiPrompt, setAiPrompt] = useState("")
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState("")
  const fileInputRef = useRef(null)

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
    setAiPrompt("")
    setGenerateError("")
  }

  async function handleGenerateImage() {
    if (!aiPrompt.trim()) {
      setGenerateError("Please enter a prompt to generate an image")
      return
    }

    setGenerating(true)
    setGenerateError("")
    try {
      const imageUrl = await generateGroupCoverImage(aiPrompt.trim())
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const file = new File([blob], "ai-generated-cover.png", { type: "image/png" })
      updateFormData({ coverImage: file })
    } catch (e) {
      console.error("Image generation error:", e)
      setGenerateError(e?.response?.data?.detail || "Failed to generate image. Please try again.")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Group Cover</h2>
        <p className="text-gray-600">Upload a cover image or generate one with AI to represent your study group (optional)</p>
      </div>

      <div className="flex items-center justify-center space-x-4 mb-6">
        <button
          onClick={() => {
            setMode("upload")
            setGenerateError("")
            // Trigger file input if no image is selected
            if (!formData.coverImage && fileInputRef.current) {
              setTimeout(() => {
                fileInputRef.current?.click()
              }, 100)
            }
          }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === "upload"
              ? "bg-pink-500 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Upload Image
        </button>
        <button
          onClick={() => {
            setMode("generate")
            setGenerateError("")
          }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
            mode === "generate"
              ? "bg-pink-500 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <FontAwesomeIcon icon={faWandMagicSparkles} className="w-4 h-4" />
          <span>Generate with AI</span>
        </button>
      </div>

      {mode === "upload" ? (
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
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive ? 'border-pink-400 bg-pink-50' : 'border-gray-300 hover:border-pink-400'
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
                ref={fileInputRef}
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
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8">
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <FontAwesomeIcon icon={faWandMagicSparkles} className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Generate Cover Image with AI</h3>
              <p className="text-gray-600 text-sm">Describe the image you want, and AI will create it for you</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Image Prompt *
              </label>
              <textarea
                value={aiPrompt}
                onChange={(e) => {
                  setAiPrompt(e.target.value)
                  setGenerateError("")
                }}
                placeholder="e.g., A modern illustration of ADA programming language with code snippets and syntax highlighting"
                rows={4}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-gray-900 bg-white ${
                  generateError ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              <p className="text-xs text-gray-500 mt-2">
                Be specific about what you want. Include subject, style, and any important details.
              </p>
              {generateError && (
                <p className="mt-2 text-sm text-red-600">{generateError}</p>
              )}
            </div>

            <button
              onClick={handleGenerateImage}
              disabled={generating || !aiPrompt.trim()}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Generating image...</span>
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faWandMagicSparkles} className="w-5 h-5" />
                  <span>Generate Image</span>
                </>
              )}
            </button>

            {formData.coverImage && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-4">
                  {mode === "generate" ? "Generated image preview:" : "Current cover image:"}
                </p>
                <div className="relative">
                  <img
                    src={URL.createObjectURL(formData.coverImage)}
                    alt="Cover preview"
                    className="w-full max-h-64 object-cover rounded-lg border-2 border-gray-200"
                  />
                  <button
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                    title="Remove image"
                  >
                    <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  You can generate a new image or switch to upload mode to use a different image
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {fieldErrors.coverImage && (
        <p className="text-red-500 text-sm text-center">{fieldErrors.coverImage}</p>
      )}
    </div>
  )
}

function GeneralInfoStep({ formData, updateFormData, fieldErrors, fieldOptions, onRefineName, onRefineDescription, refiningName, refiningDescription }) {
  const [capacityInput, setCapacityInput] = useState(String(formData.capacity || 4))

  useEffect(() => {
    setCapacityInput(String(formData.capacity || 4))
  }, [formData.capacity])

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <FontAwesomeIcon icon={faInfo} className="w-6 h-6 text-pink-500" />
        <h2 className="text-2xl font-bold text-gray-900">General information</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">
                Group Name *
              </label>
              <button
                onClick={onRefineName}
                disabled={refiningName || !formData.name.trim()}
                className="flex items-center space-x-1 px-2 py-1 text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded hover:from-purple-600 hover:to-pink-600 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refine and polish your group name with AI"
              >
                {refiningName ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    <span>Refining...</span>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faWandMagicSparkles} className="w-3 h-3" />
                    <span>Refine</span>
                  </>
                )}
              </button>
            </div>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateFormData({ name: e.target.value })}
              placeholder="Make it catchy and memorable"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-gray-900 bg-white ${fieldErrors.name ? 'border-red-300' : 'border-gray-300'
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
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-gray-900 bg-white ${fieldErrors.field ? 'border-red-300' : 'border-gray-300'
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

          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">
                Mission Description (Optional)
              </label>
              <button
                onClick={onRefineDescription}
                disabled={refiningDescription || !formData.description.trim()}
                className="flex items-center space-x-1 px-2 py-1 text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded hover:from-purple-600 hover:to-pink-600 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refine and polish your mission description with AI"
              >
                {refiningDescription ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    <span>Refining...</span>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faWandMagicSparkles} className="w-3 h-3" />
                    <span>Refine</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              value={formData.description}
              onChange={(e) => updateFormData({ description: e.target.value })}
              placeholder="Describe the mission or challenge for this group. What should members accomplish? What are the requirements and success criteria?"
              rows={5}
              maxLength={1000}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-gray-900 bg-white"
            />
            <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
              <span>Define the mission that group members should complete</span>
              <span className={formData.description.length > 800 ? "text-orange-500" : ""}>
                {formData.description.length}/1000
              </span>
            </div>
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
              value={capacityInput}
              onChange={(e) => {
                const value = e.target.value
                setCapacityInput(value)
                if (value !== "") {
                  const num = parseInt(value, 10)
                  if (!isNaN(num) && num >= 2 && num <= 50) {
                    updateFormData({ capacity: num })
                  }
                }
              }}
              onBlur={(e) => {
                const value = e.target.value
                const num = parseInt(value, 10)
                if (value === "" || isNaN(num) || num < 2 || num > 50) {
                  const validCapacity = 4
                  setCapacityInput(String(validCapacity))
                  updateFormData({ capacity: validCapacity })
                } else {
                  updateFormData({ capacity: num })
                }
              }}
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
                <span className="text-sm font-medium text-gray-500">Mission Description:</span>
                <p className="text-gray-900">{formData.description || "No mission description provided"}</p>
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
