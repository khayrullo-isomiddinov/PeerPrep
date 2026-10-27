// Shapes of the data the PeerPrep API returns. Timestamps are ISO strings in UTC.

export type ISODateString = string

// The signed-in user (from /auth/me). Only your own account includes the email address.
export interface User {
  id: number
  email: string
  name: string | null
  bio: string | null
  photo_url: string | null
  is_verified: boolean
  created_at: ISODateString
  xp: number
}

// How anyone else appears. `name` falls back to the part of the email before the @, server-side.
export interface PublicUser {
  id: number
  name: string
  photo_url: string | null
  is_verified: boolean
}

export interface PublicProfile extends PublicUser {
  bio: string | null
  created_at: ISODateString
  xp: number
}

export type EventStatus = "upcoming" | "ongoing" | "past"
export type EventStatusFilter = EventStatus | "all"

export interface PeerEvent {
  id: number
  title: string
  description: string | null
  location: string
  starts_at: ISODateString
  ends_at: ISODateString
  duration: number // hours
  capacity: number
  exam: string | null
  cover_image_url: string | null
  // JSON array of StudyMaterial. Only sent to members, and only on single-event responses (never in lists)
  study_materials: string | null
  created_by: number
  created_at: ISODateString
  status: EventStatus
  is_upcoming: boolean
  is_ongoing: boolean
  is_past: boolean
  // Present when the request is authenticated
  attendee_count?: number
  is_joined?: boolean
  // How many files are attached; on single-event responses only, for members and non-members alike
  materials_count?: number | null
}

export interface StudyMaterial {
  name: string
  type: string
  size: number
  data: string // data: URL
}

export interface EventInput {
  title: string
  starts_at: ISODateString
  location: string
  capacity?: number
  duration?: number
  description?: string | null
  cover_image_url?: string | null
  study_materials?: string | null
  exam?: string | null
}

export interface EventListParams {
  q?: string
  location?: string
  exam?: string
  status?: EventStatusFilter
  // "soonest" orders upcoming/live events by start time; the API default is "newest" (most recently created)
  sort?: "soonest" | "newest"
  limit?: number
  offset?: number
}

export interface Member extends PublicUser {
  joined_at: ISODateString
}

export type MessageAuthor = PublicUser

export interface ChatMessage {
  id: number
  content: string | null
  is_deleted: boolean
  created_at: ISODateString
  is_read_by_me: boolean
  read_count?: number
  user: MessageAuthor
}

export interface PresenceEntry {
  id: number
  name: string
  photo_url: string | null
  is_online: boolean
  last_seen: ISODateString | null
}

export interface MembershipResult {
  success: true
  attendee_count?: number
  alreadyJoined?: boolean
  notJoined?: boolean
}

export interface AuthResponse {
  access_token: string
  token_type: "bearer"
  user: User
}

export interface VerificationResponse {
  message: string
  email_sent?: boolean
  verify_url?: string
  already_verified?: boolean
}

export interface ProfileUpdate {
  name?: string | null
  bio?: string | null
  photo_url?: string | null
}

export interface AwardXPResult {
  success: boolean
  message: string
  total_xp_awarded: number
  events_processed: number
}

export interface EventSuggestion {
  id: number
  title: string
  location: string
  full: string
}

// Badge/stats payload from /badges; its exact shape is owned by the gamification service
export type UserBadgeStats = Record<string, unknown>
