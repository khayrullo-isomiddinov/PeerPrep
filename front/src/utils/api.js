import axios from "axios"

const base = "http://localhost:8000/api"

export const api = axios.create({ baseURL: base })

export function setAuthHeader(token) {
  if (token) {
    localStorage.setItem("access_token", token)
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`
  } else {
    localStorage.removeItem("access_token")
    delete api.defaults.headers.common["Authorization"]
  }
}

const existing = localStorage.getItem("access_token")
if (existing) setAuthHeader(existing)

api.interceptors.request.use(
  config => {
    console.log("📤 API Request:", config.method?.toUpperCase(), config.url)
    console.log("📤 Headers:", config.headers)
    console.log("📤 Auth header:", config.headers?.Authorization ? "✅ Present" : "❌ Missing")
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  r => r,
  err => {
    console.log("📥 API Response Error:", err?.response?.status, err?.response?.data)
    if (err?.response?.status === 401) {
      console.error("❌ 401 Unauthorized - Clearing token")
      setAuthHeader(null)
    }
    return Promise.reject(err)
  }
)

export async function registerUser({ email, password }) {
  const { data } = await api.post("auth/register", { email, password })
  return data
}
export async function loginUser({ email, password }) {
  const { data } = await api.post("auth/login", { email, password })
  return data
}
export async function listEvents(params = {}) {
  const { data } = await api.get("events", { params })
  return data
}

export async function refineEventText(text, fieldType = "general") {
  const token = localStorage.getItem("access_token")
  console.log("🔍 Refine text - Token exists:", !!token)
  console.log("🔍 Refine text - Token preview:", token ? token.substring(0, 20) + "..." : "none")
  console.log("🔍 Refine text - Current auth header:", api.defaults.headers.common["Authorization"] ? "exists" : "missing")
  
  if (token) {
    setAuthHeader(token)
    console.log("🔍 Refine text - Auth header set:", api.defaults.headers.common["Authorization"] ? "yes" : "no")
  } else {
    console.error("❌ No token found in localStorage!")
  }
  
  try {
    const { data } = await api.post("events/refine-text", {
      text,
      field_type: fieldType
    })
    return data.refined_text
  } catch (error) {
    console.error("❌ Refine text error:", error)
    console.error("❌ Error response:", error?.response?.data)
    console.error("❌ Request headers sent:", error?.config?.headers)
    throw error
  }
}

export async function createEvent(payload) {
  const { data } = await api.post("events", payload)
  return data
}

export async function generateCoverImage(prompt) {
  const token = localStorage.getItem("access_token")
  if (token) {
    setAuthHeader(token)
  }
  const { data } = await api.post("events/generate-image", { prompt })
  return data.image_url
}
export async function updateEvent(id, patch) {
  const { data } = await api.patch(`events/${id}`, patch)
  return data
}
export async function deleteEvent(id) {
  await api.delete(`events/${id}`)
}
export async function joinEvent(id) {
  await api.post(`events/${id}/join`)
}
export async function leaveEvent(id) {
  await api.delete(`events/${id}/join`)
}
export async function getAttendees(id) {
  const { data } = await api.get(`events/${id}/attendees`)
  return data
}

export async function listGroups(params = {}) {
  const { data } = await api.get("groups", { params })
  return data
}

export async function createGroup(payload) {
  const { data } = await api.post("groups", payload)
  return data
}

export async function generateGroupCoverImage(prompt) {
  const token = localStorage.getItem("access_token")
  if (token) {
    setAuthHeader(token)
  }
  const { data } = await api.post("groups/generate-image", { prompt })
  return data.image_url
}

export async function getGroup(id) {
  const { data } = await api.get(`groups/${id}`)
  return data
}

export async function updateGroup(id, payload) {
  const { data } = await api.put(`groups/${id}`, payload)
  return data
}

export async function joinGroup(id) {
  const { data } = await api.post(`groups/${id}/join`)
  return data
}

export async function leaveGroup(id) {
  const { data } = await api.delete(`groups/${id}/leave`)
  return data
}

export async function checkGroupMembership(id) {
  const { data } = await api.get(`groups/${id}/membership`)
  return data
}

export async function getGroupMembers(id) {
  const { data } = await api.get(`groups/${id}/members`)
  return data
}

export async function getGroupLeaderboard(id) {
  const { data } = await api.get(`groups/${id}/leaderboard`)
  return data
}

export async function submitMission(groupId, payload) {
  const { data } = await api.post(`groups/${groupId}/missions`, payload)
  return data
}

export async function getGroupMissions(groupId) {
  const { data } = await api.get(`groups/${groupId}/missions`)
  return data
}

export async function getMyMissions(groupId) {
  const { data } = await api.get(`groups/${groupId}/missions/my-submissions`)
  return data
}

export async function reviewMission(groupId, submissionId, payload) {
  const { data } = await api.patch(`groups/${groupId}/missions/${submissionId}`, payload)
  return data
}

export async function deleteMission(groupId, submissionId) {
  await api.delete(`groups/${groupId}/missions/${submissionId}`)
}

export async function getUserBadge(userId) {
  const { data } = await api.get(`badges/user/${userId}`)
  return data
}

export async function getMyBadge() {
  const { data } = await api.get("badges/me")
  return data
}

export async function deleteGroup(id) {
  const { data } = await api.delete(`groups/${id}`)
  return data
}

export async function getProfile() {
  const { data } = await api.get("auth/me")
  return data
}

export async function updateProfile(profileData) {
  const { data } = await api.put("auth/profile", profileData)
  return data
}

export async function deleteAccount() {
  const { data } = await api.delete("auth/account")
  return data
}

export async function searchLocations(query) {
  const { data } = await api.get("locations", { params: { query } })
  return data 
}

export async function autocompleteEvents(query) {
  const { data } = await api.get("events/autocomplete", { params: { q: query } })
  return data 
}

export async function autocompleteGroups(query) {
  const { data } = await api.get("groups/autocomplete", { params: { q: query } })
  return data 
}
