import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { setAuthHeader, api } from "../../utils/api"

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
  const [isLoading, setIsLoading] = useState(!!token) // Show loading while validating token
  const isAuthenticated = !!token && !isLoading

  // Validate token on startup
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsLoading(false)
        return
      }
      
      try {
        setAuthHeader(token)
        const response = await api.get("/auth/me")
        setUser(response.data)
        setIsLoading(false)
      } catch (error) {
        // Token is invalid, clear it
        logout()
        setIsLoading(false)
      }
    }

    validateToken()
  }, []) // Only run on mount

  // keep axios auth header in sync when token changes
  useEffect(() => {
    if (token && !isLoading) {
      setAuthHeader(token)
    }
  }, [token, isLoading])

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

  const value = useMemo(() => ({ token, user, isAuthenticated, isLoading, login, logout, setUser }), [token, user, isAuthenticated, isLoading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
