import { Link } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faArrowRight, faUsers } from "@fortawesome/free-solid-svg-icons"
import { useAuth } from "../features/auth/authContextValue"
import { useMyEvents } from "../hooks/useEvents"
import { usePageTitle } from "../hooks/usePageTitle"
import Card from "../components/ui/Card"
import Badge from "../components/ui/Badge"
import Button from "../components/ui/Button"
import PageHeader from "../components/ui/PageHeader"
import FocusTimer from "../features/focus/FocusTimer"
import TaskList from "../features/focus/TaskList"
import FocusWeek from "../features/focus/FocusWeek"
import { useFocusClock } from "../features/focus/useFocus"
import { PHASES, formatClock } from "../features/focus/focusTimerModel"

// Points from solo focus to studying with others: your live session if you have one, otherwise discovery
function StudyTogether() {
  const { isAuthenticated } = useAuth()
  const live = useMyEvents({ status: "ongoing" }, { enabled: isAuthenticated })
  const session = live.data?.[0]

  return (
    <Card>
      {session ? (
        <>
          <Badge tone="highlight" dot>Live now</Badge>
          <p className="mt-2 line-clamp-2 font-semibold text-fg">{session.title}</p>
          <p className="mt-0.5 truncate text-sm text-fg-muted">{session.location}</p>
          <Button as={Link} to={`/events/${session.id}`} size="sm" variant="secondary" className="mt-4">
            Back to your session <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
          </Button>
        </>
      ) : (
        <>
          <h2 className="flex items-center gap-2 font-semibold text-fg">
            <FontAwesomeIcon icon={faUsers} className="text-fg-subtle" />
            Study with others
          </h2>
          <p className="mt-1 text-sm text-fg-muted">
            Focus goes further with a group. Join a session for your exam and keep the timer running alongside the chat.
          </p>
          <Button as={Link} to={isAuthenticated ? "/events" : "/register"} size="sm" variant="secondary" className="mt-4">
            {isAuthenticated ? "Find a session" : "Create a free account"}
          </Button>
        </>
      )}
    </Card>
  )
}

export default function Focus() {
  const { timer, log, remaining, now } = useFocusClock()
  usePageTitle(timer.status === "idle" ? "Focus" : `${formatClock(remaining)} ${PHASES[timer.phase].short}`)

  return (
    <div className="page-container py-8 sm:py-12">
      <PageHeader
        title={<>Focus <span className="serif text-[1.12em]">room</span></>}
        description="A focus timer and a short plan for today. Work in blocks, take real breaks, and see your week add up."
      />
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <FocusTimer />
          <TaskList />
        </div>
        <aside className="space-y-6">
          <FocusWeek log={log} now={now} />
          <StudyTogether />
        </aside>
      </div>
    </div>
  )
}
