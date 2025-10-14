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

api.interceptors.response.use(
  r => r,
  err => {
    if (err?.response?.status === 401) {
      setAuthHeader(null)
      localStorage.removeItem("user")
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
export async function createEvent(payload) {
  const { data } = await api.post("events", payload)
  return data
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

// Group API functions
export async function listGroups(params = {}) {
  const { data } = await api.get("groups", { params })
  return data
}

export async function createGroup(payload) {
  const { data } = await api.post("groups", payload)
  return data
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

export async function getGroupMembers(id) {
  const { data } = await api.get(`groups/${id}/members`)
  return data
}

export async function getGroupLeaderboard(id) {
  const { data } = await api.get(`groups/${id}/leaderboard`)
  return data
}

export async function deleteGroup(id) {
  const { data } = await api.delete(`groups/${id}`)
  return data
}