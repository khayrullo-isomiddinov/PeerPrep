import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { setAuthHeader, api, SESSION_EXPIRED_EVENT, AUTH_NOTICE_KEY } from "../../utils/api"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try { return localStorage.getItem("access_token") } catch { return null }
  })
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const isAuthenticated = !!token && !!user


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
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          localStorage.removeItem("access_token")
          setToken(null)
          setUser(null)
          setAuthHeader(null)
        }
        setIsLoading(false)
      }
    }

    validateToken()
  }, []) 

  useEffect(() => {
    if (token) {
      setAuthHeader(token)
    }
  }, [token])

  useEffect(() => {
    function handleExpired() {
      try { sessionStorage.setItem(AUTH_NOTICE_KEY, "Your session has expired. Please sign in again.") } catch { /* storage unavailable (private mode) */ }
      localStorage.removeItem("access_token")
      setAuthHeader(null)
      setToken(null)
      setUser(null)
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired)
  }, [])

  async function login({ access_token, user: fullUser }) {
    localStorage.setItem("access_token", access_token)
    setAuthHeader(access_token)
    setToken(access_token)
    
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
