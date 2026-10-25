import { createContext, useContext } from "react"

export const AuthContext = createContext(null)

// { user, token, isAuthenticated, isLoading, login, logout, setUser }
export function useAuth() {
  return useContext(AuthContext)
}
