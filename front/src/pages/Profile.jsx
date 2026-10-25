import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCamera, faPen, faUserSlash, faStar, faCalendarCheck, faFire, faChartSimple } from "@fortawesome/free-solid-svg-icons"
import { useAuth } from "../features/auth/authContextValue"
import { deleteAccount, getErrorMessage } from "../utils/api"
import { readAsDataUrl } from "../utils/files"
import { useUserProfile, useUserBadge, useUpdateProfile, useAwardPastEventsXP } from "../hooks/useProfile"
import { useToast } from "../components/ui/toastContext"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import Badge from "../components/ui/Badge"
import Avatar from "../components/ui/Avatar"
import ConfirmDialog from "../components/ui/ConfirmDialog"
import { EmptyState, PageLoader, Skeleton } from "../components/ui/Feedback"
import LevelCard from "../features/profile/LevelCard"
import BadgeLadder from "../features/profile/BadgeLadder"
import AppearanceCard from "../features/profile/AppearanceCard"
import EditProfileDialog from "../features/profile/EditProfileDialog"

const MAX_PHOTO_BYTES = 5 * 1024 * 1024

function Stat({ icon, label, value, tone = "text-fg-subtle" }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <FontAwesomeIcon icon={icon} className={`text-sm ${tone}`} />
      <p className="mt-3 font-mono text-2xl font-medium tracking-tight text-fg">{value}</p>
      <p className="text-xs text-fg-subtle">{label}</p>
    </div>
  )
}

function memberSince(createdAt) {
  const d = createdAt ? new Date(createdAt) : null
  return d && !isNaN(d) ? d.toLocaleDateString("en-US", { month: "long", year: "numeric" }) : null
}

export default function Profile() {
  const { userId } = useParams()
  const { user, isAuthenticated, isLoading, setUser, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const fileRef = useRef(null)
  const [editing, setEditing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isOwn = !userId || (!!user && Number(userId) === user.id)
  const targetId = isOwn ? user?.id : Number(userId)
  const other = useUserProfile(targetId, { enabled: !isOwn && !!targetId })
  const stats = useUserBadge(targetId, { enabled: !!targetId })
  const updateProfile = useUpdateProfile()
  const { mutate: awardPastXP } = useAwardPastEventsXP()
  const awardedForRef = useRef(null)

  const profile = isOwn ? user : other.data

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !userId) navigate("/login", { replace: true })
  }, [isLoading, isAuthenticated, userId, navigate])

  // Credit XP for sessions that ended since the last visit (once per visit to your own profile)
  useEffect(() => {
    if (isOwn && targetId && awardedForRef.current !== targetId) {
      awardedForRef.current = targetId
      awardPastXP()
    }
  }, [isOwn, targetId, awardPastXP])

  if (!isOwn && other.isError) {
    return (
      <div className="page-container py-16">
        <EmptyState icon={faUserSlash} title="Profile not found" description="This account doesn't exist or was deleted." action={<Button as={Link} to="/" variant="secondary">Go home</Button>} />
      </div>
    )
  }
  if (!profile) return <PageLoader label="Loading profile" />

  const name = profile.name || profile.email?.split("@")[0] || "Student"
  const since = memberSince(profile.created_at)
  const s = stats.data

  async function saveProfile(changes) {
    try {
      const updated = await updateProfile.mutateAsync(changes)
      setUser({ ...user, ...updated })
      setEditing(false)
      toast.success("Profile saved")
    } catch (e) {
      toast.error(getErrorMessage(e, "Couldn't save your profile."))
    }
  }

  async function onPhotoSelected(e) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    const lower = file.name.toLowerCase()
    if (lower.endsWith(".heic") || lower.endsWith(".heif") || /image\/hei[cf]/.test(file.type)) {
      toast.error("HEIC photos aren't supported. Convert it to JPG or PNG first (on iPhone: Settings › Camera › Formats › Most Compatible).")
      return
    }
    if (!file.type.startsWith("image/")) return toast.error("Choose an image file (JPG, PNG, GIF or WebP).")
    if (file.size > MAX_PHOTO_BYTES) return toast.error("Photos must be smaller than 5 MB.")

    setUploading(true)
    try {
      const updated = await updateProfile.mutateAsync({ photo_url: await readAsDataUrl(file) })
      setUser({ ...user, ...updated })
      toast.success("Profile photo updated")
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't update your photo."))
    } finally {
      setUploading(false)
    }
  }

  async function confirmDeleteAccount() {
    setDeleting(true)
    try {
      await deleteAccount()
      setConfirmDelete(false)
      logout()
      navigate("/", { replace: true })
    } catch (e) {
      toast.error(getErrorMessage(e, "Couldn't delete your account."))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="page-container py-8 sm:py-12">
      <Card padded={false}>
        <div className="ruled relative h-24 border-b border-line bg-surface-2 sm:h-28" aria-hidden><span className="absolute inset-y-0 left-8 w-px bg-danger/25" /></div>
        <div className="px-5 pb-6 sm:px-8">
          <div className="relative -mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
            <div className="relative w-fit">
              <Avatar name={name} src={profile.photo_url} id={profile.id} size="xl" className="ring-4 ring-surface" />
              {isOwn && (
                <>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    aria-label="Change profile photo"
                    className="absolute bottom-1 right-1 grid size-9 place-items-center rounded-full border-2 border-surface bg-accent text-accent-fg shadow-raised hover:bg-accent-hover disabled:opacity-70"
                  >
                    {uploading ? <span className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin" /> : <FontAwesomeIcon icon={faCamera} className="text-sm" />}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhotoSelected} />
                </>
              )}
            </div>
            {isOwn && (
              <Button variant="secondary" onClick={() => setEditing(true)} className="w-full sm:w-auto">
                <FontAwesomeIcon icon={faPen} />
                Edit profile
              </Button>
            )}
          </div>

          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[1.75rem] tracking-[-0.035em] text-fg sm:text-4xl">{name}</h1>
              {s?.badge && <Badge tone="highlight">{s.badge.name}</Badge>}
            </div>
            <p className="mt-1 text-sm text-fg-muted">
              {isOwn && <>{profile.email} · </>}
              {since ? `Member since ${since}` : "Member"}
            </p>
            {profile.bio ? (
              <p className="mt-4 max-w-2xl whitespace-pre-line text-fg">{profile.bio}</p>
            ) : isOwn ? (
              <button type="button" onClick={() => setEditing(true)} className="mt-4 text-sm font-semibold text-accent-text hover:underline">
                Add a short bio so study partners know what you're working on
              </button>
            ) : null}
          </div>
        </div>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-6">
          {stats.isLoading && !s ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
          ) : s ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat icon={faStar} label="Total XP" value={s.total_xp || 0} tone="text-fg" />
              <Stat icon={faCalendarCheck} label="Sessions attended" value={s.events_attended || 0} />
              <Stat icon={faFire} label="Week streak" value={s.weekly_streak || 0} tone="text-warning" />
              <Stat icon={faChartSimple} label="Engagement" value={`${Math.round((s.engagement_score || 0) * 100)}%`} tone="text-fg-subtle" />
            </div>
          ) : null}
          {s && <BadgeLadder stats={s} />}
        </div>

        <aside className="space-y-6">
          <LevelCard stats={s} loading={stats.isLoading} />
          {isOwn && <AppearanceCard />}
          {isOwn && (
            <Card tone="danger">
              <h2 className="font-semibold text-fg">Delete account</h2>
              <p className="mt-1 text-sm text-fg-muted">Permanently removes your profile, the sessions you host and your messages.</p>
              <Button variant="danger-soft" size="sm" className="mt-4" onClick={() => setConfirmDelete(true)}>Delete my account</Button>
            </Card>
          )}
        </aside>
      </div>

      {editing && <EditProfileDialog user={profile} saving={updateProfile.isPending} onSave={saveProfile} onClose={() => setEditing(false)} />}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete your account?"
        description="Your profile, the sessions you host and your messages will be permanently deleted."
        confirmLabel="Delete my account"
        requireText="DELETE"
        busy={deleting}
        onConfirm={confirmDeleteAccount}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
