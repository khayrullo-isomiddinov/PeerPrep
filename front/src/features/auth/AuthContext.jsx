import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { setAuthHeader, api } from "../../utils/api"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try { return localStorage.getItem("access_token") } catch { return null }
  })
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true) // Always start with loading true
  const isAuthenticated = !!token && !!user && !isLoading

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
        localStorage.removeItem("access_token")
        setToken(null)
        setUser(null)
        setAuthHeader(null)
        setIsLoading(false)
      }
    }

    validateToken()
  }, []) // Only run once on mount

  // keep axios auth header in sync when token changes
  useEffect(() => {
    if (token) {
      setAuthHeader(token)
    }
  }, [token])

  async function login({ access_token, user: fullUser }) {
    // Persist token immediately
    localStorage.setItem("access_token", access_token)
    setAuthHeader(access_token)
    setToken(access_token)
    
    // Use the full user data from login response (no additional API call needed)
    setUser(fullUser)
    setIsLoading(false)
  }

  function logout() {
    localStorage.removeItem("access_token")
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
