import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"

const TONES = {
  dark: "bg-gray-800 text-white",
  blue: "bg-gradient-to-r from-blue-500 to-cyan-500 text-white",
  green: "bg-gradient-to-r from-green-500 to-emerald-500 text-white",
  red: "bg-gradient-to-r from-red-500 to-pink-500 text-white",
  pink: "bg-pink-50 text-pink-600",
}

// <Badge tone="green" icon={faCheckCircle}>Attending</Badge>
export default function Badge({ tone = "dark", icon, className = "", children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${TONES[tone]} ${className}`}>
      {icon && <FontAwesomeIcon icon={icon} className="w-3 h-3" />}
      {children}
    </span>
  )
}
