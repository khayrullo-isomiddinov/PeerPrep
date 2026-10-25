import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faUsers, faCalendar, faMapMarkerAlt, faClock, faUserPlus, faUserMinus,
  faCheckCircle, faFire, faStar, faGraduationCap
} from "@fortawesome/free-solid-svg-icons"
import { formatLongDate, formatClockTime } from "../../../utils/dates"
import Badge from "../../../components/ui/Badge"
import Button from "../../../components/ui/Button"
import Card from "../../../components/ui/Card"

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
  const label = busy ? (isMember ? "Leaving..." : "Joining...") : isMember ? "Leave Event" : isFull ? "Event Full" : "Join Event"
  return (
    <Button
      variant={isMember ? "muted" : "primary"}
      size="lg"
      className="w-full lg:w-auto min-w-[160px] touch-target font-bold"
      loading={busy}
      disabled={!isMember && isFull}
      onClick={onClick}
    >
      <span className="whitespace-nowrap">{label}</span>
      {!busy && <FontAwesomeIcon icon={isMember ? faUserMinus : faUserPlus} className="w-5 h-5" />}
    </Button>
  )
}

export default function EventSummary({ event, memberCount, isOwner, isMember, timing, joinBusy, onJoinLeave }) {
  const isFull = memberCount >= event.capacity
  const canJoinOrLeave = !isOwner && !timing.hasStarted

  return (
    <Card>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {timing.isPast && <Badge tone="dark" icon={faCheckCircle}>Completed</Badge>}
            {isOwner && <Badge tone="blue" icon={faStar}>Organizer</Badge>}
            {isMember && !isOwner && <Badge tone="green" icon={faCheckCircle}>Attending</Badge>}
            {isFull && <Badge tone="red" icon={faFire}>Full</Badge>}
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
    </Card>
  )
}
