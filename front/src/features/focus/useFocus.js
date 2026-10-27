import { useMemo, useSyncExternalStore } from "react"
import { useAuth } from "../auth/authContextValue"
import { useNow } from "../../hooks/useNow"
import { focusActions, getFocusData, subscribe } from "./focusStore"
import { progress, remainingMs } from "./focusTimerModel"

export function focusScope(user) {
  return user?.id ? String(user.id) : "guest"
}

// The signed-in user's (or the guest's) timer, plan and log, plus actions to change them
export function useFocus() {
  const { user } = useAuth()
  const scope = focusScope(user)
  const data = useSyncExternalStore(subscribe, () => getFocusData(scope))
  const actions = useMemo(() => focusActions(scope), [scope])
  const currentTask = data.tasks.find((t) => t.id === data.currentTaskId) || null
  return { ...data, currentTask, actions }
}

// useFocus plus the live remaining time; re-renders 4× a second only while running
export function useFocusClock() {
  const focus = useFocus()
  const { timer, settings } = focus
  const now = useNow(timer.status === "running" ? 250 : null)
  return { ...focus, now, remaining: remainingMs(timer, settings, now), fraction: progress(timer, settings, now) }
}
