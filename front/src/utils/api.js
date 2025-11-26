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

// Optimized: Only log in development
const isDev = import.meta.env.DEV

api.interceptors.request.use(
  config => {
    // Always ensure token is fresh from localStorage (in case it was updated)
    const token = localStorage.getItem("access_token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      // Also update the default header to keep it in sync
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`
    } else {
      // Remove header if no token
      delete config.headers.Authorization
      delete api.defaults.headers.common["Authorization"]
    }
    
    // Disable HTTP caching for GET requests in development to ensure Network tab visibility
    if (import.meta.env.DEV && config.method === 'get') {
      config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
      config.headers['Pragma'] = 'no-cache'
      config.headers['Expires'] = '0'
      // Add timestamp to prevent browser cache
      const separator = config.url.includes('?') ? '&' : '?'
      config.url = `${config.url}${separator}_t=${Date.now()}`
    }
    
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  r => r,
  err => {
    if (err?.response?.status === 401) {
      // Only clear token if it's actually invalid (not just missing)
      // Don't clear on first 401 - might be a temporary issue
      const token = localStorage.getItem("access_token")
      if (token) {
        // Try to validate token - if it fails, then clear it
        // But don't clear immediately on first 401
      }
      // Don't automatically clear - let the AuthContext handle it
      // setAuthHeader(null) // Removed - let AuthContext handle token validation
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
export async function listEvents(params = {}, options = {}) {
  const { signal } = options
  const { data } = await api.get("events", { params, signal })
  return data
}

export async function getMyEvents(params = {}) {
  const { data } = await api.get("events/my-events", { params })
  return data
}

export async function getMyEventsCount(params = {}) {
  const { data } = await api.get("events/my-events/count", { params })
  return data.count || 0
}

export async function refineEventText(text, fieldType = "general") {
  const token = localStorage.getItem("access_token")
  
  if (token) {
    setAuthHeader(token)
  }
  
  try {
    const { data } = await api.post("events/refine-text", {
      text,
      field_type: fieldType
    })
    return data.refined_text
  } catch (error) {
    if (isDev) {
      console.error("Refine text error:", error)
    }
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
  try {
    const response = await api.post(`events/${id}/join`)
    return { 
      success: true, 
      attendee_count: response.data?.attendee_count,
      alreadyJoined: response.data?.alreadyJoined
    }
  } catch (error) {
    // Handle 409 (already joined) as a special case - not really an error
    if (error?.response?.status === 409) {
      return { success: true, alreadyJoined: true }
    }
    throw error
  }
}
export async function leaveEvent(id) {
  try {
    const response = await api.delete(`events/${id}/join`)
    return { 
      success: true, 
      attendee_count: response.data?.attendee_count,
      notJoined: response.data?.notJoined
    }
  } catch (error) {
    // Handle 404 (not joined) as a special case - not really an error
    if (error?.response?.status === 404) {
      return { success: true, notJoined: true }
    }
    throw error
  }
}
export async function getAttendees(id) {
  const { data } = await api.get(`events/${id}/attendees`)
  return data
}

export async function getEvent(id) {
  const { data } = await api.get(`events/${id}`)
  return data
}

export async function getEventAttendeesWithDetails(id) {
  const { data } = await api.get(`events/${id}/attendees/details`)
  return data
}

export async function getEventMessages(eventId) {
  const { data } = await api.get(`events/${eventId}/messages`)
  return data
}

export async function postEventMessage(eventId, content) {
  const { data } = await api.post(`events/${eventId}/messages?content=${encodeURIComponent(content)}`)
  return data
}

export async function deleteEventMessage(eventId, messageId) {
  const { data } = await api.delete(`events/${eventId}/messages/${messageId}`)
  return data
}

export async function setEventTypingStatus(eventId) {
  await api.post(`events/${eventId}/typing`)
}

export async function getEventTypingStatus(eventId) {
  const { data } = await api.get(`events/${eventId}/typing`)
  return data
}

export async function getEventPresence(eventId) {
  const { data } = await api.get(`events/${eventId}/presence`)
  return data
}


export async function getUserBadge(userId) {
  const { data } = await api.get(`badges/user/${userId}`)
  return data
}

export async function getMyBadge() {
  const { data } = await api.get("badges/me")
  return data
}

export async function awardPastEventsXP() {
  const { data } = await api.post("badges/me/award-past-events")
  return data
}


export async function getProfile() {
  const { data } = await api.get("auth/me")
  return data
}

export async function getUserProfile(userId) {
  const { data } = await api.get(`auth/user/${userId}`)
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


export async function markEventMessageRead(eventId, messageId) {
  await api.post(`events/${eventId}/messages/${messageId}/read`)
}

