import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { setAuthHeader } from "../../utils/api"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const isAuthenticated = !!token

  useEffect(() => {
    const t = localStorage.getItem("access_token")
    const u = localStorage.getItem("user")
    if (t) {
      setToken(t)
      setAuthHeader(t)
    }
    if (u) setUser(JSON.parse(u))
  }, [])

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
