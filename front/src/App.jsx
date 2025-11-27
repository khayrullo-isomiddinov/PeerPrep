import { Routes, Route } from "react-router-dom"
import { useEffect, Suspense, lazy } from "react"
import Navbar from "./components/Navbar"
import Footer from "./components/Footer"
import { useAuth } from "./features/auth/AuthContext"

const Home = lazy(() => import("./pages/Home"))
const Events = lazy(() => import("./pages/Events"))
const EventDetail = lazy(() => import("./pages/EventDetail"))
const CreateEvent = lazy(() => import("./pages/CreateEvent"))
const Profile = lazy(() => import("./pages/Profile"))
const RegisterForm = lazy(() => import("./features/auth/RegisterForm"))
const LoginForm = lazy(() => import("./features/auth/LoginForm"))

export default function App() {
  const { isLoading } = useAuth()
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="inline-block h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="route-transition">
      <Navbar />
      <main style={{ position: "relative", minHeight: "100vh" }}>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:id" element={<EventDetail />} />
            <Route path="/events/create" element={<CreateEvent />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="/register" element={<RegisterForm />} />
            <Route path="/login" element={<LoginForm />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
