import axios, { type AxiosError } from "axios"
import type {
  AuthResponse, AwardXPResult, PublicProfile, ChatMessage, EventInput, EventListParams, EventSuggestion, Member,
  MembershipResult, PeerEvent, PresenceEntry, ProfileUpdate, User, UserBadgeStats, VerificationResponse,
} from "../types/api"

type Id = number | string

// Set VITE_API_BASE_URL at build time (e.g. https://peerprep-api.onrender.com); defaults to the local backend
const base = `${(import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "")}/api`

export const api = axios.create({ baseURL: base })

export function setAuthHeader(token: string | null) {
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

// Always send the latest token (it can change in another tab)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  } else {
    delete config.headers.Authorization
  }
  return config
})

// Fired when a signed-in request comes back 401 (expired or revoked token); AuthContext signs the user out
export const SESSION_EXPIRED_EVENT = "auth:session-expired"
// sessionStorage key for a one-time notice shown on the login page (e.g. after the session expired)
export const AUTH_NOTICE_KEY = "auth_notice"

api.interceptors.response.use(
  (r) => r,
  (err: AxiosError) => {
    const isAuthCall = /auth\/(login|register|resend-verification)/.test(err.config?.url || "")
    if (err.response?.status === 401 && !isAuthCall && localStorage.getItem("access_token")) {
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
    }
    return Promise.reject(err)
  }
)

export { getErrorMessage } from "./errors"

// ---------- Auth & profile ----------

export async function registerUser({ email, password }: { email: string; password: string }) {
  const { data } = await api.post<VerificationResponse>("auth/register", { email: email.trim(), password })
  return data
}

export async function loginUser({ email, password }: { email: string; password: string }) {
  const { data } = await api.post<AuthResponse>("auth/login", { email: email.trim(), password })
  return data
}

export async function resendVerification(email: string) {
  const { data } = await api.post<VerificationResponse>("auth/resend-verification", { email: email.trim() })
  return data
}

export async function getUserProfile(userId: Id) {
  const { data } = await api.get<PublicProfile>(`auth/user/${userId}`)
  return data
}

export async function updateProfile(profileData: ProfileUpdate) {
  const { data } = await api.put<User>("auth/profile", profileData)
  return data
}

export async function deleteAccount() {
  const { data } = await api.delete<{ message: string }>("auth/account")
  return data
}

// ---------- Events ----------

export async function listEvents(params: EventListParams = {}, options: { signal?: AbortSignal } = {}) {
  const { data } = await api.get<PeerEvent[]>("events", { params, signal: options.signal })
  return data
}

export async function getMyEvents(params: EventListParams = {}) {
  const { data } = await api.get<PeerEvent[]>("events/my-events", { params })
  return data
}

export async function getMyEventsCount(params: EventListParams = {}) {
  const { data } = await api.get<{ count: number }>("events/my-events/count", { params })
  return data.count || 0
}

export async function getEvent(id: Id) {
  const { data } = await api.get<PeerEvent>(`events/${id}`)
  return data
}

export async function createEvent(payload: EventInput) {
  const { data } = await api.post<PeerEvent>("events", payload)
  return data
}

export async function updateEvent(id: Id, patch: Partial<EventInput>) {
  const { data } = await api.patch<PeerEvent>(`events/${id}`, patch)
  return data
}

export async function deleteEvent(id: Id) {
  await api.delete(`events/${id}`)
}

export async function autocompleteEvents(query: string) {
  const { data } = await api.get<EventSuggestion[]>("events/autocomplete", { params: { q: query } })
  return data
}

export async function refineEventText(text: string, fieldType = "general") {
  const { data } = await api.post<{ refined_text: string }>("events/refine-text", { text, field_type: fieldType })
  return data.refined_text
}

export async function generateCoverImage(prompt: string) {
  const { data } = await api.post<{ image_url: string }>("events/generate-image", { prompt })
  return data.image_url
}

// ---------- Membership ----------

// Errors (e.g. 409 "Event is full") propagate so callers can show them
export async function joinEvent(id: Id): Promise<MembershipResult> {
  const { data } = await api.post<Partial<MembershipResult>>(`events/${id}/join`)
  return { success: true, attendee_count: data?.attendee_count, alreadyJoined: data?.alreadyJoined }
}

export async function leaveEvent(id: Id): Promise<MembershipResult> {
  try {
    const { data } = await api.delete<Partial<MembershipResult>>(`events/${id}/join`)
    return { success: true, attendee_count: data?.attendee_count, notJoined: data?.notJoined }
  } catch (error) {
    if ((error as AxiosError).response?.status === 404) return { success: true, notJoined: true }
    throw error
  }
}

export async function getEventAttendeesWithDetails(id: Id) {
  const { data } = await api.get<Member[]>(`events/${id}/attendees/details`)
  return data
}

// ---------- Chat ----------

export async function getEventMessages(eventId: Id) {
  const { data } = await api.get<ChatMessage[]>(`events/${eventId}/messages`)
  return data
}

export async function postEventMessage(eventId: Id, content: string) {
  const { data } = await api.post<ChatMessage>(`events/${eventId}/messages`, null, { params: { content } })
  return data
}

export async function deleteEventMessage(eventId: Id, messageId: Id) {
  const { data } = await api.delete<{ message: string }>(`events/${eventId}/messages/${messageId}`)
  return data
}

export async function markEventMessageRead(eventId: Id, messageId: Id) {
  await api.post(`events/${eventId}/messages/${messageId}/read`)
}

export async function setEventTypingStatus(eventId: Id) {
  await api.post(`events/${eventId}/typing`)
}

export async function getEventPresence(eventId: Id) {
  const { data } = await api.get<{ presence: PresenceEntry[] }>(`events/${eventId}/presence`)
  return data
}

// ---------- Badges ----------

export async function getUserBadge(userId: Id) {
  const { data } = await api.get<UserBadgeStats>(`badges/user/${userId}`)
  return data
}

export async function awardPastEventsXP() {
  const { data } = await api.post<AwardXPResult>("badges/me/award-past-events")
  return data
}
