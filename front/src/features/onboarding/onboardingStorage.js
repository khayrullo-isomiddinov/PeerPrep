// Per-user, per-browser onboarding state. Profile and event progress come from real API data;
// this only remembers things the API doesn't track (dismissal, having opened a whiteboard).

const key = (userId, name) => `peerprep-onboarding:${userId}:${name}`

function read(userId, name) {
  try {
    return localStorage.getItem(key(userId, name)) === "1"
  } catch {
    return false
  }
}

function write(userId, name, value) {
  try {
    if (value) localStorage.setItem(key(userId, name), "1")
    else localStorage.removeItem(key(userId, name))
  } catch { /* storage unavailable: onboarding simply shows again next visit */ }
}

export const onboardingStorage = {
  isDismissed: (userId) => read(userId, "dismissed"),
  setDismissed: (userId, dismissed) => write(userId, "dismissed", dismissed),
  hasOpenedWhiteboard: (userId) => read(userId, "whiteboard"),
  markWhiteboardOpened: (userId) => write(userId, "whiteboard", true),
}
