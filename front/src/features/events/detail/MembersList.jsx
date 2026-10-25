import { Link } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCircleCheck, faUsers } from "@fortawesome/free-solid-svg-icons"
import { usePrefetchProfile } from "../../../hooks/useProfile"
import Card from "../../../components/ui/Card"
import Avatar from "../../../components/ui/Avatar"

export default function MembersList({ members, presence, currentUserId, hostId, capacity }) {
  const prefetchProfile = usePrefetchProfile()
  const onlineIds = new Set(presence.filter((p) => p.is_online).map((p) => p.id))
  const onlineCount = members.filter((m) => onlineIds.has(m.id)).length

  return (
    <Card padded={false}>
      <div className="flex items-center justify-between px-5 pb-3 pt-5">
        <h2 className="font-semibold text-fg">
          Members <span className="font-normal text-fg-subtle">{members.length}/{capacity}</span>
        </h2>
        {onlineCount > 0 && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-success">
            <span className="size-1.5 rounded-full bg-success" aria-hidden />
            {onlineCount} online
          </span>
        )}
      </div>
      {members.length === 0 ? (
        <div className="flex flex-col items-center px-5 pb-8 pt-2 text-center">
          <FontAwesomeIcon icon={faUsers} className="text-xl text-fg-subtle" />
          <p className="mt-2 text-sm text-fg-muted">No members yet</p>
        </div>
      ) : (
        <ul className="max-h-80 overflow-y-auto px-2 pb-3">
          {members.map((member) => {
            const name = member.name || "Student"
            const online = onlineIds.has(member.id)
            return (
              <li key={member.id}>
                <Link
                  to={`/profile/${member.id}`}
                  onMouseEnter={() => prefetchProfile(member.id, { own: member.id === currentUserId })}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-surface-2"
                >
                  <span className="relative">
                    <Avatar name={name} src={member.photo_url} id={member.id} size="sm" />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-surface ${online ? "bg-success" : "bg-surface-3"}`}
                      aria-hidden
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-fg">{name}</span>
                      {member.is_verified && <FontAwesomeIcon icon={faCircleCheck} className="text-xs text-accent-text" title="Verified" />}
                    </span>
                    <span className="block text-xs text-fg-subtle">
                      {member.id === hostId ? "Host" : "Member"}
                      {member.id === currentUserId && " · You"}
                      {online && " · Online"}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
