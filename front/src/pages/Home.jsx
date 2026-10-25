import { useAuth } from "../features/auth/authContextValue"
import Landing from "../features/home/Landing"
import Dashboard from "../features/home/Dashboard"

// Visitors see what PeerPrep is; signed-in students land straight on their sessions
export default function Home() {
  const { isAuthenticated, user } = useAuth()
  return isAuthenticated && user ? <Dashboard /> : <Landing />
}
