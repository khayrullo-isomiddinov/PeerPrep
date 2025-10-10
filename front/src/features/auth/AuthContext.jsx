import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { setAuthHeader } from "../../utils/api"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try { return localStorage.getItem("access_token") } catch { return null }
  })
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem("user")
      return u ? JSON.parse(u) : null
    } catch { return null }
  })
  const isAuthenticated = !!token

  // keep axios auth header in sync immediately on mount and when token changes
  useEffect(() => {
    setAuthHeader(token)
  }, [token])

  function login({ access_token, user }) {
    localStorage.setItem("access_token", access_token)
    localStorage.setItem("user", JSON.stringify(user))
    setToken(access_token)
    setUser(user)
    setAuthHeader(access_token)
  }

  function logout() {
    localStorage.removeItem("access_token")
    localStorage.removeItem("user")
    setToken(null)
    setUser(null)
    setAuthHeader(null)
  }

  const value = useMemo(() => ({ token, user, isAuthenticated, login, logout, setUser }), [token, user, isAuthenticated])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
