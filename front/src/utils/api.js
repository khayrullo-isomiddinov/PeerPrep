import axios from "axios"

// Set VITE_API_BASE_URL at build time (e.g. https://peerprep-api.onrender.com); defaults to the local backend
const base = `${(import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "")}/api`

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

// Only log in development
const isDev = import.meta.env.DEV

api.interceptors.request.use(
  config => {
    const token = localStorage.getItem("access_token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`
    } else {
      delete config.headers.Authorization
      delete api.defaults.headers.common["Authorization"]
    }
    
    // Removed cache-busting in dev mode to allow proper HTTP caching
    // If you need to bypass cache during development, use browser dev tools
    
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// Fired when a signed-in request comes back 401 (expired or revoked token); AuthContext signs the user out
export const SESSION_EXPIRED_EVENT = "auth:session-expired"
// sessionStorage key for a one-time notice shown on the login page (e.g. after the session expired)
export const AUTH_NOTICE_KEY = "auth_notice"

api.interceptors.response.use(
  r => r,
  err => {
    const isAuthCall = /auth\/(login|register|resend-verification)/.test(err?.config?.url || "")
    if (err?.response?.status === 401 && !isAuthCall && localStorage.getItem("access_token")) {
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
    }
    return Promise.reject(err)
  }
)

// Turns any API error into a sentence that's safe to show to the user.
// FastAPI returns `detail` as a string for HTTPExceptions but as a list of objects for validation errors.
export function getErrorMessage(err, fallback = "Something went wrong. Please try again.") {
  if (!err?.response) {
    if (err?.code === "ERR_CANCELED") return fallback
    return "Can't reach the server. Check that the backend is running and try again."
  }
  const { status, data } = err.response
  const detail = data?.detail
  if (typeof detail === "string" && detail.trim()) return detail
  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map(d => (d?.msg || "").replace(/^Value error, /, ""))
      .filter(Boolean)
      .join(" ") || fallback
  }
  if (status === 401) return "Your session has expired. Please sign in again."
  if (status === 403) return "You don't have permission to do that."
  if (status === 404) return "We couldn't find what you were looking for."
  if (status >= 500) return "The server ran into a problem. Please try again in a moment."
  return fallback
}

export async function registerUser({ email, password }) {
  const { data } = await api.post("auth/register", { email: email.trim(), password })
  return data
}
export async function loginUser({ email, password }) {
  const { data } = await api.post("auth/login", { email: email.trim(), password })
  return data
}
export async function resendVerification(email) {
  const { data } = await api.post("auth/resend-verification", { email: email.trim() })
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
// Errors (e.g. 409 "Event is full") propagate so callers can show them
export async function joinEvent(id) {
  const response = await api.post(`events/${id}/join`)
  return {
    success: true,
    attendee_count: response.data?.attendee_count,
    alreadyJoined: response.data?.alreadyJoined
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

