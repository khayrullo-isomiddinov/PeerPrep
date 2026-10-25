import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCircleCheck, faCircleExclamation, faCircleInfo } from "@fortawesome/free-solid-svg-icons"

const TONES = {
  success: { icon: faCircleCheck, classes: "bg-success-soft text-success" },
  error: { icon: faCircleExclamation, classes: "bg-danger-soft text-danger" },
  info: { icon: faCircleInfo, classes: "bg-accent-soft text-accent-text" },
}

// Inline message above an auth form (verification result, errors, next steps)
export default function AuthNotice({ tone = "info", children }) {
  const { icon, classes } = TONES[tone]
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`mb-6 flex gap-3 rounded-xl p-3.5 text-sm ${classes}`}>
      <FontAwesomeIcon icon={icon} className="mt-0.5 shrink-0" />
      <div className="min-w-0 space-y-2 text-fg">{children}</div>
    </div>
  )
}
