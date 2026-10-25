// Shapes of the data the PeerPrep API returns. Timestamps are ISO strings in UTC.

export type ISODateString = string

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
  study_materials: string | null // JSON array of StudyMaterial
  created_by: number
  created_at: ISODateString
  status: EventStatus
  is_upcoming: boolean
  is_ongoing: boolean
  is_past: boolean
  // Present when the request is authenticated
  attendee_count?: number
  is_joined?: boolean
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
  limit?: number
  offset?: number
}

export interface Member {
  id: number
  name: string | null
  email: string
  photo_url: string | null
  is_verified: boolean
  joined_at: ISODateString
}

export interface MessageAuthor {
  id: number
  name: string | null
  email: string
  photo_url: string | null
  is_verified: boolean
}

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
