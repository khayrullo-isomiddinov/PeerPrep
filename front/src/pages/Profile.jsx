import { useEffect, useMemo, useState, useRef } from "react"
import { useNavigate, useParams, Link } from "react-router-dom"
import Card from "../components/Card"
import Button from "../components/Button"
import { useAuth } from "../features/auth/AuthContext"
import { updateProfile, deleteAccount, getUserProfile, getUserBadge, followUser, unfollowUser, getFollowStatus, getFollowCounts, getFollowers, getFollowing } from "../utils/api"
import UserBadge from "../components/UserBadge"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faTrophy, faMedal, faAward, faUsers, faCalendar, faCheckCircle, faStar, faGraduationCap, faBookOpen, faUserPlus, faUserMinus, faUserFriends } from "@fortawesome/free-solid-svg-icons"

export default function Profile() {
  const { userId } = useParams()
  const { user, isAuthenticated, isLoading, setUser, logout } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const [profileUser, setProfileUser] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [editing, setEditing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [userStats, setUserStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [loadingFollow, setLoadingFollow] = useState(false)
  const [followCounts, setFollowCounts] = useState({ followers_count: 0, following_count: 0 })
  const [loadingFollowCounts, setLoadingFollowCounts] = useState(false)
  const [showFollowersModal, setShowFollowersModal] = useState(false)
  const [showFollowingModal, setShowFollowingModal] = useState(false)
  const [followersList, setFollowersList] = useState([])
  const [followingList, setFollowingList] = useState([])
  const [loadingFollowers, setLoadingFollowers] = useState(false)
  const [loadingFollowing, setLoadingFollowing] = useState(false)
  
  const isViewingOwnProfile = !userId || (user && parseInt(userId) === user.id)
  const displayUser = isViewingOwnProfile ? user : profileUser
  const targetUserId = userId ? parseInt(userId) : (user?.id)
  
  const initialForm = useMemo(() => ({
    name: displayUser?.name || "",
    email: displayUser?.email || "",
    bio: displayUser?.bio || "",
    photoUrl: displayUser?.photo_url || displayUser?.photoUrl || "",
    createdAt: displayUser?.created_at || null,
  }), [displayUser])
  const [form, setForm] = useState(initialForm)

  // Load user profile if viewing someone else's profile
  useEffect(() => {
    async function loadUserProfile() {
      if (userId && user && parseInt(userId) !== user.id) {
        try {
          setLoadingProfile(true)
          const profileData = await getUserProfile(parseInt(userId))
          setProfileUser(profileData)
        } catch (error) {
          console.error("Failed to load user profile:", error)
          navigate("/profile", { replace: true })
        } finally {
          setLoadingProfile(false)
        }
      } else if (userId && !user) {
        // If not logged in but trying to view a profile, still load it
        try {
          setLoadingProfile(true)
          const profileData = await getUserProfile(parseInt(userId))
          setProfileUser(profileData)
        } catch (error) {
          console.error("Failed to load user profile:", error)
          navigate("/", { replace: true })
        } finally {
          setLoadingProfile(false)
        }
      }
    }
    loadUserProfile()
  }, [userId, user, navigate])

  // Load user stats (badge info includes stats)
  useEffect(() => {
    async function loadUserStats() {
      if (!targetUserId) return
      
      try {
        setLoadingStats(true)
        const badgeData = await getUserBadge(targetUserId)
        setUserStats(badgeData)
      } catch (error) {
        console.error("Failed to load user stats:", error)
      } finally {
        setLoadingStats(false)
      }
    }
    loadUserStats()
  }, [targetUserId])

  // Load follow status and counts
  useEffect(() => {
    async function loadFollowData() {
      if (!targetUserId) return
      
      // Load follow counts (public, no auth required)
      try {
        setLoadingFollowCounts(true)
        const counts = await getFollowCounts(targetUserId)
        setFollowCounts(counts)
      } catch (error) {
        console.error("Failed to load follow counts:", error)
      } finally {
        setLoadingFollowCounts(false)
      }

      // Check if current user is following this user (requires auth)
      if (!isViewingOwnProfile && isAuthenticated) {
        try {
          const status = await getFollowStatus(targetUserId)
          setIsFollowing(status.following)
        } catch (error) {
          console.error("Failed to load follow status:", error)
        }
      }
    }
    loadFollowData()
  }, [targetUserId, isAuthenticated, isViewingOwnProfile])

  async function handleFollowToggle() {
    if (!isAuthenticated) {
      navigate("/login")
      return
    }
    
    setLoadingFollow(true)
    try {
      if (isFollowing) {
        await unfollowUser(targetUserId)
        setIsFollowing(false)
        setFollowCounts(prev => ({ ...prev, followers_count: prev.followers_count - 1 }))
      } else {
        await followUser(targetUserId)
        setIsFollowing(true)
        setFollowCounts(prev => ({ ...prev, followers_count: prev.followers_count + 1 }))
      }
    } catch (error) {
      console.error("Failed to toggle follow:", error)
    } finally {
      setLoadingFollow(false)
    }
  }

  async function loadFollowers() {
    if (!targetUserId) return
    setLoadingFollowers(true)
    try {
      const data = await getFollowers(targetUserId)
      setFollowersList(data.followers || [])
    } catch (error) {
      console.error("Failed to load followers:", error)
    } finally {
      setLoadingFollowers(false)
    }
  }

  async function loadFollowing() {
    if (!targetUserId) return
    setLoadingFollowing(true)
    try {
      const data = await getFollowing(targetUserId)
      setFollowingList(data.following || [])
    } catch (error) {
      console.error("Failed to load following:", error)
    } finally {
      setLoadingFollowing(false)
    }
  }

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !userId) {
      navigate("/login", { replace: true })
    }
  }, [isLoading, isAuthenticated, navigate, userId])

  useEffect(() => {
    if (displayUser) {
      setForm(prev => ({
        name: displayUser.name || "",
        email: displayUser.email || "",
        bio: displayUser.bio || "",
        photoUrl: displayUser.photo_url || displayUser.photoUrl || prev.photoUrl || "",
        createdAt: displayUser.created_at || null,
      }))
    }
  }, [displayUser])

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
      
      const updatedUser = { ...user, ...updatedProfile }
      setUser(updatedUser)
      
      setForm(prev => ({
        ...prev,
        name: updatedProfile.name || prev.name,
        bio: updatedProfile.bio || prev.bio,
        photoUrl: updatedProfile.photo_url || prev.photoUrl
      }))
      
    setEditing(false)
    } catch (error) {
      console.error("Failed to save profile:", error)
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
    
    const fileName = file.name.toLowerCase()
    const isHeic = fileName.endsWith('.heic') || fileName.endsWith('.heif') || 
                   file.type === 'image/heic' || file.type === 'image/heif'
    
    if (isHeic) {
      alert("HEIC/HEIF format is not supported. Please convert your image to JPG or PNG first. You can do this on your iPhone by going to Settings > Camera > Formats and selecting 'Most Compatible'.")
      return
    }
    
    if (!file.type.startsWith('image/')) {
      alert("Please select an image file (JPG, PNG, GIF, or WebP)")
      return
    }
    
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
      
      setForm(prev => ({ ...prev, photoUrl }))
      
      try {
        const profileData = {
          name: form.name,
          bio: form.bio,
          photo_url: photoUrl
        }
        
        console.log("Saving profile with photo_url length:", photoUrl.length)
        const updatedProfile = await updateProfile(profileData)
        console.log("Profile updated successfully:", updatedProfile)
        console.log("Returned photo_url:", updatedProfile.photo_url ? "exists" : "missing", updatedProfile.photo_url?.substring(0, 50))
        
        const updatedUser = { ...user, ...updatedProfile }
        setUser(updatedUser)
        
        setForm(prev => ({
          ...prev,
          photoUrl: updatedProfile.photo_url || photoUrl
        }))

        console.log("Profile picture saved and updated!")
      } catch (error) {
        console.error("Failed to save photo:", error)
        alert("Failed to save profile picture. Please try again.")
        const updatedUser = { ...user, photo_url: photoUrl }
        setUser(updatedUser)
      }
      
      setUploading(false)
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
      logout()
      navigate("/", { replace: true })
    } catch (error) {
      console.error("Failed to delete account:", error)
      alert("Failed to delete account. Please try again.")
    } finally {
      setDeleting(false)
    }
  }

  if (isLoading || loadingProfile || !displayUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }
  
  if (!isAuthenticated && !userId) return null

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
      
      <section className="relative bg-gradient-to-r from-white via-pink-50/30 to-purple-50/30 border-b border-gray-200/60 backdrop-blur-sm premium-fade-in">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 via-purple-500/5 to-indigo-500/5"></div>
        <div className="container-page py-6 sm:py-8 lg:py-12 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 lg:gap-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
              <div className="relative group">
                <div className="relative h-24 w-24 sm:h-32 sm:w-32 rounded-full overflow-hidden border-4 border-white shadow-2xl ring-4 ring-pink-100">
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
                
                {isViewingOwnProfile && (
                  <>
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
                  </>
                )}
              </div>

              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-pink-600 to-purple-600 bg-clip-text text-transparent">
                    {form.name || (isViewingOwnProfile ? form.email : "User")}
                  </h1>
                  {displayUser?.id && <UserBadge userId={displayUser.id} size="md" />}
                </div>
                {isViewingOwnProfile && (
                  <p className="text-lg sm:text-xl text-gray-600 mb-4">{form.email}</p>
                )}
                <div className="flex items-center gap-6 text-sm flex-wrap mb-4">
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    {formatMemberSince(form.createdAt) ? `Member since ${formatMemberSince(form.createdAt)}` : "Member"}
                  </div>
                  {displayUser?.xp !== undefined && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-semibold">
                      <span>⭐</span>
                      <span>{displayUser.xp || 0} XP</span>
                    </div>
                  )}
                </div>
                {/* Follow counts */}
                {!loadingFollowCounts && (
                  <div className="flex items-center gap-4 text-sm">
                    <button
                      onClick={() => {
                        setShowFollowersModal(true)
                        loadFollowers()
                      }}
                      className="hover:text-pink-600 transition-colors cursor-pointer"
                    >
                      <span className="font-semibold text-gray-900">{followCounts.followers_count || 0}</span>
                      <span className="text-gray-600 ml-1">followers</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowFollowingModal(true)
                        loadFollowing()
                      }}
                      className="hover:text-pink-600 transition-colors cursor-pointer"
                    >
                      <span className="font-semibold text-gray-900">{followCounts.following_count || 0}</span>
                      <span className="text-gray-600 ml-1">following</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {isViewingOwnProfile ? (
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                {!editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="btn-pink-pill text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 shadow-lg hover:shadow-xl w-full sm:w-auto"
                  >
                    <svg className="w-6 h-6 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Profile
                  </button>
                ) : (
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <button
                    onClick={handleSave}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-base sm:text-lg"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-semibold rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-base sm:text-lg"
                  >
                    Cancel
                  </button>
                </div>
              )}
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button
                  onClick={handleFollowToggle}
                  disabled={loadingFollow}
                  className={`text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 shadow-lg hover:shadow-xl w-full sm:w-auto transition-all rounded-full font-semibold ${
                    isFollowing
                      ? "bg-gradient-to-r from-gray-500 to-gray-600 text-white hover:from-gray-600 hover:to-gray-700"
                      : "btn-pink-pill"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loadingFollow ? (
                    <>
                      <svg className="w-5 h-5 inline mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {isFollowing ? "Unfollowing..." : "Following..."}
                    </>
                  ) : isFollowing ? (
                    <>
                      <FontAwesomeIcon icon={faUserMinus} className="w-5 h-5 inline mr-2" />
                      Unfollow
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faUserPlus} className="w-5 h-5 inline mr-2" />
                      Follow
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <main className="container-page py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            {/* Stats Cards */}
            {userStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <FontAwesomeIcon icon={faStar} className="text-white text-sm" />
                    </div>
                    <span className="text-xs font-medium text-gray-600">XP</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{userStats.total_xp || 0}</div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                      <FontAwesomeIcon icon={faCheckCircle} className="text-white text-sm" />
                    </div>
                    <span className="text-xs font-medium text-gray-600">Submissions</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{userStats.total_accepted_submissions || 0}</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                      <FontAwesomeIcon icon={faCalendar} className="text-white text-sm" />
                    </div>
                    <span className="text-xs font-medium text-gray-600">Events</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{userStats.events_attended || 0}</div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-4 border border-orange-200 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-lg flex items-center justify-center">
                      <FontAwesomeIcon icon={faTrophy} className="text-white text-sm" />
                    </div>
                    <span className="text-xs font-medium text-gray-600">Level</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{userStats.badge?.name || "Beginner"}</div>
                </div>
              </div>
            )}

            {/* Badge Shelf */}
            <div className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 rounded-2xl shadow-lg border-2 border-amber-200 p-6 lg:p-8 premium-fade-in">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <FontAwesomeIcon icon={faTrophy} className="text-white text-xl" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Badge Collection</h2>
                  <p className="text-sm text-gray-600">Achievements earned through dedication</p>
                </div>
              </div>
              
              <div className="relative">
                {/* Shelf visual effect */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-300 via-yellow-300 to-orange-300 rounded-full shadow-lg"></div>
                <div className="absolute bottom-1 left-0 right-0 h-0.5 bg-amber-200/50 rounded-full"></div>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pb-4">
                  {[
                    { name: "Beginner", min_xp: 0, icon: "🌱", color: "green", bgFrom: "from-green-100", bgTo: "to-green-200", border: "border-green-400", ring: "ring-green-300", text: "text-green-700", textLight: "text-green-600", bgLightFrom: "from-green-50", bgLightTo: "to-green-100", borderLight: "border-green-300" },
                    { name: "Learner", min_xp: 200, icon: "📚", color: "blue", bgFrom: "from-blue-100", bgTo: "to-blue-200", border: "border-blue-400", ring: "ring-blue-300", text: "text-blue-700", textLight: "text-blue-600", bgLightFrom: "from-blue-50", bgLightTo: "to-blue-100", borderLight: "border-blue-300" },
                    { name: "Achiever", min_xp: 500, icon: "⭐", color: "purple", bgFrom: "from-purple-100", bgTo: "to-purple-200", border: "border-purple-400", ring: "ring-purple-300", text: "text-purple-700", textLight: "text-purple-600", bgLightFrom: "from-purple-50", bgLightTo: "to-purple-100", borderLight: "border-purple-300" },
                    { name: "Expert", min_xp: 1500, icon: "🏆", color: "orange", bgFrom: "from-orange-100", bgTo: "to-orange-200", border: "border-orange-400", ring: "ring-orange-300", text: "text-orange-700", textLight: "text-orange-600", bgLightFrom: "from-orange-50", bgLightTo: "to-orange-100", borderLight: "border-orange-300" },
                    { name: "Master", min_xp: 4000, icon: "👑", color: "gold", bgFrom: "from-yellow-100", bgTo: "to-yellow-200", border: "border-yellow-400", ring: "ring-yellow-300", text: "text-yellow-700", textLight: "text-yellow-600", bgLightFrom: "from-yellow-50", bgLightTo: "to-yellow-100", borderLight: "border-yellow-300" },
                  ].map((badge, index) => {
                    const currentXP = userStats?.total_xp || 0
                    const isUnlocked = currentXP >= badge.min_xp
                    const isCurrent = userStats?.badge?.name === badge.name
                    
                    return (
                      <div
                        key={index}
                        className={`relative flex flex-col items-center p-4 rounded-xl border-2 transition-all transform hover:scale-105 ${
                          isUnlocked
                            ? isCurrent
                              ? `bg-gradient-to-br ${badge.bgFrom} ${badge.bgTo} ${badge.border} shadow-lg ring-2 ${badge.ring}`
                              : `bg-gradient-to-br ${badge.bgLightFrom} ${badge.bgLightTo} ${badge.borderLight} shadow-md`
                            : "bg-gray-100 border-gray-300 opacity-50 grayscale"
                        }`}
                      >
                        {isCurrent && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                            <FontAwesomeIcon icon={faStar} className="text-white text-xs" />
                          </div>
                        )}
                        <div className={`text-4xl mb-2 ${isUnlocked ? "" : "grayscale opacity-50"}`}>
                          {badge.icon}
                        </div>
                        <div className={`text-xs font-semibold text-center ${isUnlocked ? badge.text : "text-gray-500"}`}>
                          {badge.name}
                        </div>
                        <div className={`text-xs mt-1 ${isUnlocked ? badge.textLight : "text-gray-400"}`}>
                          {badge.min_xp}+ XP
                        </div>
                        {!isUnlocked && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 p-4 sm:p-6 lg:p-8 hover:shadow-xl transition-all duration-300 premium-scale-in">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">{isViewingOwnProfile ? "About Me" : "About"}</h2>
                </div>
                {isViewingOwnProfile && editing && (
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
                    {isViewingOwnProfile && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Email</h3>
                        <p className="text-gray-700">{form.email}</p>
                      </div>
                    )}
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Current Badge Card */}
            {userStats?.badge && (
              <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg border border-gray-200 p-6 premium-fade-in sticky top-24">
                <div className="text-center mb-4">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl mb-3 shadow-md">
                    <span className="text-5xl">{userStats.badge.icon}</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{userStats.badge.name}</h3>
                  <p className="text-sm text-gray-600">Current Level</p>
                </div>
                
                <div className="space-y-3 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Total XP</span>
                    <span className="text-lg font-bold text-gray-900">{userStats.total_xp || 0}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full transition-all ${
                        userStats.badge.color === "green" ? "bg-gradient-to-r from-green-500 to-green-600" :
                        userStats.badge.color === "blue" ? "bg-gradient-to-r from-blue-500 to-blue-600" :
                        userStats.badge.color === "purple" ? "bg-gradient-to-r from-purple-500 to-purple-600" :
                        userStats.badge.color === "orange" ? "bg-gradient-to-r from-orange-500 to-orange-600" :
                        "bg-gradient-to-r from-yellow-500 to-yellow-600"
                      }`}
                      style={{ 
                        width: `${Math.min((userStats.total_xp / (userStats.badge.min_xp + 200)) * 100, 100)}%` 
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    {userStats.total_xp >= (userStats.badge.min_xp + 200) 
                      ? "Max level reached!" 
                      : `${(userStats.badge.min_xp + 200) - userStats.total_xp} XP to next level`}
                  </p>
                </div>
              </div>
            )}

            {/* Quick Stats */}
            {userStats && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 premium-fade-in">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FontAwesomeIcon icon={faGraduationCap} className="text-purple-500" />
                  Activity Summary
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FontAwesomeIcon icon={faCheckCircle} className="text-blue-500" />
                      <span className="text-sm font-medium text-gray-700">Accepted Submissions</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">{userStats.total_accepted_submissions || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FontAwesomeIcon icon={faCalendar} className="text-green-500" />
                      <span className="text-sm font-medium text-gray-700">Events Attended</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">{userStats.events_attended || 0}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Followers Modal */}
        {showFollowersModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowFollowersModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-gray-900">Followers</h3>
                  <button
                    onClick={() => setShowFollowersModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {loadingFollowers ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading followers...</p>
                  </div>
                ) : followersList.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FontAwesomeIcon icon={faUsers} className="text-4xl mb-3 text-gray-300" />
                    <p>No followers yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {followersList.map((follower) => (
                      <Link
                        key={follower.id}
                        to={`/profile/${follower.id}`}
                        onClick={() => setShowFollowersModal(false)}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <img
                          src={follower.photo_url || `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(follower.email || "user")}`}
                          alt={follower.name || follower.email}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{follower.name || "User"}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Following Modal */}
        {showFollowingModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowFollowingModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-gray-900">Following</h3>
                  <button
                    onClick={() => setShowFollowingModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {loadingFollowing ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading following...</p>
                  </div>
                ) : followingList.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FontAwesomeIcon icon={faUserFriends} className="text-4xl mb-3 text-gray-300" />
                    <p>Not following anyone yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {followingList.map((following) => (
                      <Link
                        key={following.id}
                        to={`/profile/${following.id}`}
                        onClick={() => setShowFollowingModal(false)}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <img
                          src={following.photo_url || `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(following.email || "user")}`}
                          alt={following.name || following.email}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{following.name || "User"}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {isViewingOwnProfile && user?.email !== "harryshady131@gmail.com" && (
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
