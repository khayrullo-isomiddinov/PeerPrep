import { useEffect } from "react"

const SITE = "PeerPrep"
const DEFAULT_TITLE = "PeerPrep — Find your study group"

// Sets the browser tab title for the current page, e.g. "Events · PeerPrep". Pass nothing for the default.
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE}` : DEFAULT_TITLE
  }, [title])
}
