import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faUsers, faCalendar, faMapMarkerAlt, faClock, faUserPlus, faUserMinus,
  faCheckCircle, faFire, faStar, faGraduationCap
} from "@fortawesome/free-solid-svg-icons"
import { formatLongDate, formatClockTime } from "../../../utils/dates"

function InfoItem({ icon, color, label, children }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <FontAwesomeIcon icon={icon} className={`${color} w-4 h-4`} />
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-semibold text-gray-900 truncate">{children}</p>
      </div>
    </div>
  )
}

function JoinLeaveButton({ isMember, isFull, busy, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={busy || (!isMember && isFull)}
      className={`touch-target font-bold rounded-xl px-8 py-4 shadow-lg w-full lg:w-auto min-w-[160px] focus:outline-none disabled:cursor-default ${
        busy ? "" : "hover:shadow-xl"
      } ${
        isMember
          ? "bg-gray-100 text-gray-700 border-2 border-gray-300"
          : "bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 text-white disabled:opacity-60"
      }`}
    >
      <span className="inline-flex items-center justify-center w-full" style={{ opacity: busy ? 0.7 : 1 }}>
        {busy && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />}
        <span className="whitespace-nowrap">
          {busy ? (isMember ? "Leaving..." : "Joining...") : isMember ? "Leave Event" : isFull ? "Event Full" : "Join Event"}
        </span>
        {!busy && <FontAwesomeIcon icon={isMember ? faUserMinus : faUserPlus} className="w-5 h-5 ml-2" />}
      </span>
    </button>
  )
}

export default function EventSummary({ event, memberCount, isOwner, isMember, timing, joinBusy, onJoinLeave }) {
  const isFull = memberCount >= event.capacity
  const canJoinOrLeave = !isOwner && !timing.hasStarted

  return (
    <section className="bg-white rounded-2xl shadow-xl border border-gray-200/60 p-6 lg:p-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {timing.isPast && (
              <span className="px-3 py-1 bg-gray-800 text-white rounded-full text-xs font-semibold">
                <FontAwesomeIcon icon={faCheckCircle} className="mr-1.5" />
                Completed
              </span>
            )}
            {isOwner && (
              <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full text-xs font-semibold">
                <FontAwesomeIcon icon={faStar} className="mr-1.5" />
                Organizer
              </span>
            )}
            {isMember && !isOwner && (
              <span className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full text-xs font-semibold">
                <FontAwesomeIcon icon={faCheckCircle} className="mr-1.5" />
                Attending
              </span>
            )}
            {isFull && (
              <span className="px-3 py-1 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full text-xs font-semibold">
                <FontAwesomeIcon icon={faFire} className="mr-1.5" />
                Full
              </span>
            )}
          </div>

          <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-3">{event.title}</h1>
          {event.description && <p className="text-gray-600 text-base mb-4 max-w-3xl">{event.description}</p>}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoItem icon={faCalendar} color="text-pink-500" label="Date">{formatLongDate(event.starts_at)}</InfoItem>
            <InfoItem icon={faClock} color="text-purple-500" label="Time">{formatClockTime(event.starts_at)}</InfoItem>
            <InfoItem icon={faClock} color="text-teal-500" label="Duration">
              {event.duration === 8 ? "All day" : `${event.duration} hour${event.duration === 1 ? "" : "s"}`}
            </InfoItem>
            <InfoItem icon={faMapMarkerAlt} color="text-indigo-500" label="Location">{event.location}</InfoItem>
            <InfoItem icon={faUsers} color="text-orange-500" label="Capacity">{memberCount} / {event.capacity}</InfoItem>
            {event.exam && <InfoItem icon={faGraduationCap} color="text-green-500" label="Exam">{event.exam}</InfoItem>}
          </div>
        </div>

        {canJoinOrLeave && (
          <div className="flex-shrink-0">
            <JoinLeaveButton isMember={isMember} isFull={isFull} busy={joinBusy} onClick={onJoinLeave} />
          </div>
        )}
      </div>
    </section>
  )
}
