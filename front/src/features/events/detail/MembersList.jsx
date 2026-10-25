import { Link } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faUsers, faTrophy, faCheckCircle } from "@fortawesome/free-solid-svg-icons"
import { usePrefetchProfile } from "../../../hooks/useProfile"

const RANK_COLORS = ["text-yellow-500", "text-gray-400", "text-orange-400"]

function MemberRow({ member, rank, isOnline, isYou, onHover }) {
  const name = member.name || member.email || "User"
  return (
    <Link
      to={`/profile/${member.id}`}
      onMouseEnter={onHover}
      className="group flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-gray-50 to-white border-2 border-gray-200 hover:border-orange-300 hover:shadow-lg"
    >
      <div className="flex-shrink-0 w-8 text-center">
        <span className={`text-lg font-bold ${RANK_COLORS[rank] || "text-gray-400"}`}>{rank + 1}</span>
      </div>
      <div className="relative flex-shrink-0">
        {member.photo_url ? (
          <img src={member.photo_url} alt={name} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold border-2 border-white shadow-md">
            {name[0].toUpperCase()}
          </div>
        )}
        <div
          className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${isOnline ? "bg-green-500" : "bg-gray-400"}`}
          title={isOnline ? "Online" : "Offline"}
        />
        {rank === 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center border-2 border-white">
            <FontAwesomeIcon icon={faTrophy} className="text-white text-xs" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-bold text-gray-900 truncate text-sm">{name}{isYou && <span className="text-gray-400 font-medium"> (you)</span>}</p>
          {member.is_verified && <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3 text-blue-500 flex-shrink-0" />}
        </div>
        {member.joined_at && (
          <p className="text-xs text-gray-500 mt-0.5">Joined {new Date(member.joined_at).toLocaleDateString()}</p>
        )}
      </div>
    </Link>
  )
}

export default function MembersList({ members, presence, currentUserId }) {
  const prefetchProfile = usePrefetchProfile()
  const onlineIds = new Set(presence.filter((p) => p.is_online).map((p) => p.id))

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200/60 overflow-hidden flex flex-col h-[400px] lg:h-[600px]">
      <div className="bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500 p-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <FontAwesomeIcon icon={faTrophy} className="text-white text-xl" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Members</h2>
            <p className="text-white/80 text-sm">{members.length} participant{members.length === 1 ? "" : "s"}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3 flex-1 overflow-y-auto premium-scrollbar">
        {members.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <FontAwesomeIcon icon={faUsers} className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No participants yet</p>
          </div>
        ) : (
          members.map((member, index) => (
            <MemberRow
              key={member.id}
              member={member}
              rank={index}
              isOnline={onlineIds.has(member.id)}
              isYou={member.id === currentUserId}
              onHover={() => prefetchProfile(member.id, { own: member.id === currentUserId })}
            />
          ))
        )}
      </div>
    </div>
  )
}
