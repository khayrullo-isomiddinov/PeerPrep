import { useSyncExternalStore } from "react"
import { getServerStatus, subscribe } from "../lib/serverStatus"

// { waking, since, inlineLoaders }: whether the API is slowly waking up from sleep, and since when
export function useServerStatus() {
  return useSyncExternalStore(subscribe, getServerStatus)
}
