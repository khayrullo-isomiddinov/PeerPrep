import { useAuth } from "../features/auth/authContextValue"
import Landing from "../features/home/Landing"
import Dashboard from "../features/home/Dashboard"
import { usePageTitle } from "../hooks/usePageTitle"

// Visitors see what PeerPrep is; signed-in students land straight on their sessions
export default function Home() {
  usePageTitle()
  const { isAuthenticated, user } = useAuth()
  return isAuthenticated && user ? <Dashboard /> : <Landing />
}
