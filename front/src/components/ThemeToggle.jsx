import { useEffect, useState } from "react"
import { applyTheme, getSystemPref } from "../utils/theme"

export default function ThemeToggle() {
  const [t, setT] = useState("peerprep-light")
  useEffect(() => { setT(applyTheme()) }, [])
  function next() {
    const n = t === "peerprep-light" ? "peerprep-dark" : "peerprep-light"
    setT(applyTheme(n))
  }
  return (
    <button onClick={next} className="btn btn-sm rounded-full">
      {t === "peerprep-dark" ? "Light" : "Dark"}
    </button>
  )
}
