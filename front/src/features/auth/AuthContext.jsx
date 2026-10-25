import { useCallback, useEffect, useMemo, useState } from "react"
import { setAuthHeader, api, SESSION_EXPIRED_EVENT, AUTH_NOTICE_KEY } from "../../utils/api"
import { AuthContext } from "./authContextValue"

function storedToken() {
  try {
    return localStorage.getItem("access_token")
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(storedToken)
  const [user, setUser] = useState(null)
  // Only show the startup loader if there's a saved session to validate
  const [isLoading, setIsLoading] = useState(() => !!storedToken())
  const isAuthenticated = !!token && !!user

  const clearSession = useCallback(() => {
    setAuthHeader(null)
    setToken(null)
    setUser(null)
  }, [])

  // On startup, check that the saved token is still valid and load the user
  useEffect(() => {
    const saved = storedToken()
    if (!saved) return
    let cancelled = false
    setAuthHeader(saved)
    api.get("/auth/me")
      .then((response) => {
        if (!cancelled) setUser(response.data)
      })
      .catch((error) => {
        const status = error?.response?.status
        if (!cancelled && (status === 401 || status === 403)) clearSession()
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [clearSession])

  // Any request that comes back 401 signs the user out with a notice on the login page
  useEffect(() => {
    function handleExpired() {
      try { sessionStorage.setItem(AUTH_NOTICE_KEY, "Your session has expired. Please sign in again.") } catch { /* storage unavailable (private mode) */ }
      clearSession()
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired)
  }, [clearSession])

  const login = useCallback(({ access_token, user: fullUser }) => {
    setAuthHeader(access_token)
    setToken(access_token)
    setUser(fullUser)
    setIsLoading(false)
  }, [])

  const value = useMemo(
    () => ({ token, user, isAuthenticated, isLoading, login, logout: clearSession, setUser }),
    [token, user, isAuthenticated, isLoading, login, clearSession]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
