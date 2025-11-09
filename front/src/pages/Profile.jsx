import { useEffect, useMemo, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import Card from "../components/Card"
import Button from "../components/Button"
import { useAuth } from "../features/auth/AuthContext"
import { updateProfile, deleteAccount } from "../utils/api"

export default function Profile() {
  const { user, isAuthenticated, isLoading, setUser, logout } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const [editing, setEditing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const initialForm = useMemo(() => ({
    name: user?.name || "",
    email: user?.email || "",
    bio: user?.bio || "",
    photoUrl: user?.photo_url || user?.photoUrl || "",
    createdAt: user?.created_at || null,
  }), [user])
  const [form, setForm] = useState(initialForm)

  useEffect(() => {
    // Only redirect if we're done loading and definitely not authenticated
    if (!isLoading && !isAuthenticated) {
      navigate("/login", { replace: true })
    }
  }, [isLoading, isAuthenticated, navigate])

  useEffect(() => {
    if (user) {
      setForm(prev => ({
        name: user.name || "",
        email: user.email || "",
        bio: user.bio || "",
        photoUrl: user.photo_url || user.photoUrl || prev.photoUrl || "",
        createdAt: user.created_at || null,
      }))
    }
  }, [user])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleSave() {
    try {
      const profileData = {
        name: form.name,
        bio: form.bio,
        photo_url: form.photoUrl
      }
      
      const updatedProfile = await updateProfile(profileData)
      console.log("Profile saved:", updatedProfile)
      
      // Update local state
      const updatedUser = { ...user, ...updatedProfile }
      setUser(updatedUser)
      
      // Ensure form is also updated with the server response
      setForm(prev => ({
        ...prev,
        name: updatedProfile.name || prev.name,
        bio: updatedProfile.bio || prev.bio,
        photoUrl: updatedProfile.photo_url || prev.photoUrl
      }))

      // Rely on server as source of truth (no local persistence)
      
    setEditing(false)
    } catch (error) {
      console.error("Failed to save profile:", error)
      // You could add a toast notification here
    }
  }

  function onPickPhoto() {
    try { fileRef.current?.click() } catch {}
  }

  async function onPhotoSelected(e) {
    const file = e.target.files?.[0]
    if (!file) {
      console.log("No file selected")
      return
    }
    
    // Check for HEIC/HEIF files (not supported by browsers)
    const fileName = file.name.toLowerCase()
    const isHeic = fileName.endsWith('.heic') || fileName.endsWith('.heif') || 
                   file.type === 'image/heic' || file.type === 'image/heif'
    
    if (isHeic) {
      alert("HEIC/HEIF format is not supported. Please convert your image to JPG or PNG first. You can do this on your iPhone by going to Settings > Camera > Formats and selecting 'Most Compatible'.")
      return
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert("Please select an image file (JPG, PNG, GIF, or WebP)")
      return
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB. Please compress or resize your image.")
      return
    }
    
    console.log("Processing image:", file.name, file.type, file.size)
    setUploading(true)
    
    const reader = new FileReader()
    reader.onerror = () => {
      console.error("Error reading file")
      setUploading(false)
      alert("Failed to read image file")
    }
    
    reader.onload = async () => {
      const photoUrl = String(reader.result || "")
      console.log("Image converted to base64, length:", photoUrl.length)
      
      // Update form immediately so user sees the image right away
      setForm(prev => ({ ...prev, photoUrl }))
      
      try {
        // Save photo to database
        const profileData = {
          name: form.name,
          bio: form.bio,
          photo_url: photoUrl
        }
        
        console.log("Saving profile with photo_url length:", photoUrl.length)
        const updatedProfile = await updateProfile(profileData)
        console.log("Profile updated successfully:", updatedProfile)
        console.log("Returned photo_url:", updatedProfile.photo_url ? "exists" : "missing", updatedProfile.photo_url?.substring(0, 50))
        
        // Update user state with the response from server
        const updatedUser = { ...user, ...updatedProfile }
        setUser(updatedUser)
        
        // Ensure form is also updated with the server response
        setForm(prev => ({
          ...prev,
          photoUrl: updatedProfile.photo_url || photoUrl
        }))

        console.log("Profile picture saved and updated!")
      } catch (error) {
        console.error("Failed to save photo:", error)
        alert("Failed to save profile picture. Please try again.")
        // Still update local state even if API fails
        const updatedUser = { ...user, photo_url: photoUrl }
        setUser(updatedUser)
        // Note: this change is temporary until next successful save
      }
      
      setUploading(false)
      // Reset file input so same file can be selected again
      if (fileRef.current) {
        fileRef.current.value = ''
      }
    }
    reader.readAsDataURL(file)
  }

  function getProfileImage() {
    if (form.photoUrl && form.photoUrl.trim()) return form.photoUrl
    return `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(form.email || "user")}`
  }

  async function handleDeleteAccount() {
    if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      return
    }
    
    const confirmText = prompt("Type 'DELETE' to confirm account deletion:")
    if (confirmText !== "DELETE") {
      alert("Account deletion cancelled.")
      return
    }
    
    setDeleting(true)
    try {
      await deleteAccount()
      // Logout and redirect to home
      logout()
      navigate("/", { replace: true })
    } catch (error) {
      console.error("Failed to delete account:", error)
      alert("Failed to delete account. Please try again.")
    } finally {
      setDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }
  
  if (!isAuthenticated) return null

  function formatMemberSince(createdAt) {
    if (!createdAt) return null
    try {
      const d = new Date(createdAt)
      return d.toLocaleDateString(undefined, { year: "numeric", month: "long" })
    } catch {
      return null
    }
  }

  return (
    <div className="min-h-screen tap-safe premium-scrollbar bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 route-transition">
      <div className="nav-spacer" />
      
      {}
      <section className="relative bg-gradient-to-r from-white via-pink-50/30 to-purple-50/30 border-b border-gray-200/60 backdrop-blur-sm premium-fade-in">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 via-purple-500/5 to-indigo-500/5"></div>
        <div className="container-page py-12 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            {}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {}
              <div className="relative group">
                <div className="relative h-32 w-32 rounded-full overflow-hidden border-4 border-white shadow-2xl ring-4 ring-pink-100">
                  <img
                    key={form.photoUrl || 'default'}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    src={getProfileImage()}
                    alt="Profile"
                    onError={(e) => {
                      e.target.src = `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(form.email || "user")}`
                    }}
                  />
                  {uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>
                
                {}
                <button
                  onClick={onPickPhoto}
                  className="absolute -bottom-2 -right-2 h-12 w-12 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 ring-2 ring-white"
                  title="Change photo"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                
                <input 
                  ref={fileRef} 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={onPhotoSelected} 
                />
              </div>

              {}
              <div className="flex-1">
                <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-pink-600 to-purple-600 bg-clip-text text-transparent mb-3">
                  {form.name || form.email}
                </h1>
                <p className="text-xl text-gray-600 mb-4">{form.email}</p>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    {formatMemberSince(form.createdAt) ? `Member since ${formatMemberSince(form.createdAt)}` : "Member"}
                  </div>
                  {}
                </div>
              </div>
            </div>

            {}
            <div className="flex flex-col sm:flex-row gap-3">
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="btn-pink-pill text-lg px-8 py-4 shadow-lg hover:shadow-xl"
                >
                  <svg className="w-6 h-6 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Profile
                </button>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={handleSave}
                    className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-lg"
                  >
                    <svg className="w-6 h-6 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-8 py-4 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-semibold rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-lg"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {}
      <main className="container-page py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {}
          <div className="lg:col-span-2 space-y-6">
            {}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 p-8 hover:shadow-xl transition-all duration-300 premium-scale-in">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">About Me</h2>
                </div>
                {editing && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 text-sm shadow-md"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-medium rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-200 text-sm shadow-md"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              
          {!editing ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Bio</h3>
                    <p className="text-gray-700 leading-relaxed min-h-[4rem]">
                      {form.bio || "Tell others about yourself! Add a bio to showcase your interests, goals, and what you're studying."}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Full Name</h3>
                      <p className="text-gray-700">{form.name || "Not provided"}</p>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Email</h3>
                      <p className="text-gray-700">{form.email}</p>
                    </div>
                  </div>
            </div>
          ) : (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Bio</label>
                    <textarea
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-200 resize-none"
                      name="bio"
                      value={form.bio}
                      onChange={handleChange}
                      placeholder="Tell us about yourself, your interests, and what you're studying..."
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                <input
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-200"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                        placeholder="Enter your full name"
                />
              </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <input
                        className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl text-gray-600 cursor-not-allowed"
                  name="email"
                  value={form.email}
                  disabled
                />
              </div>
              </div>
            </div>
          )}
            </div>

            {}
            {false && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 p-8 hover:shadow-xl transition-all duration-300 premium-fade-in">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Recent Activity</h2>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 font-medium">Joined "React Study Group"</p>
                    <p className="text-gray-500 text-sm">2 hours ago</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 font-medium">Completed "JavaScript Fundamentals"</p>
                    <p className="text-gray-500 text-sm">1 day ago</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 font-medium">Attended "Web Development Workshop"</p>
                    <p className="text-gray-500 text-sm">3 days ago</p>
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>

          {}
          {false && (
          <div className="space-y-6">
            {}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 p-6 hover:shadow-xl transition-all duration-300 premium-scale-in">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Quick Stats</h3>
              </div>
              
              <div className="space-y-6">
                {}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Groups</p>
                      <p className="text-sm text-gray-600">Study groups</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-gray-900">{form.joinedGroups.length}</span>
                </div>

                {}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-purple-500 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Events</p>
                      <p className="text-sm text-gray-600">Upcoming</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-gray-900">{form.upcomingEvents.length}</span>
                </div>

                {}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-green-500 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Study Hours</p>
                      <p className="text-sm text-gray-600">This month</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-gray-900">42</span>
                </div>
              </div>
            </div>

            {}
            {form.joinedGroups.length > 0 && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 p-6 hover:shadow-xl transition-all duration-300 premium-fade-in">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 w-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">My Groups</h3>
                </div>
                <div className="space-y-3">
                  {form.joinedGroups.slice(0, 3).map((group, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                      <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">{group.charAt(0)}</span>
                      </div>
                      <span className="text-blue-700 font-medium">{group}</span>
                    </div>
                  ))}
                  {form.joinedGroups.length > 3 && (
                    <p className="text-gray-500 text-sm text-center">+{form.joinedGroups.length - 3} more groups</p>
                  )}
                </div>
              </div>
            )}

            {}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 p-6 hover:shadow-xl transition-all duration-300 premium-scale-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Study Progress</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Monthly Goal</span>
                    <span className="text-gray-900 font-semibold">75%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-gradient-to-r from-green-400 to-green-500 h-3 rounded-full" style={{width: '75%'}}></div>
                  </div>
                  <p className="text-green-600 text-sm mt-2">42 hours completed</p>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
        
        {}
        {user?.email !== "harryshady131@gmail.com" && (
          <div className="mt-8">
            <div className="bg-red-50/80 backdrop-blur-sm rounded-2xl shadow-lg border border-red-200/60 p-8 hover:shadow-xl transition-all duration-300 premium-fade-in">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-red-900">Danger Zone</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-red-900 mb-2">Delete Account</h3>
                  <p className="text-red-700 mb-4">
                    Once you delete your account, there is no going back. This will permanently remove your account, 
                    all your data, and your participation in groups and events.
                  </p>
                </div>
                
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {deleting ? (
                    <>
                      <svg className="w-5 h-5 inline mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Deleting Account...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete My Account
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
