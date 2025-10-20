import { Routes, Route } from "react-router-dom"
import { useEffect, useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faSpinner } from "@fortawesome/free-solid-svg-icons"
import { initParallax } from "./utils/parallax"
import ScrollProgressBar from "./components/ScrollProgressBar"
import Navbar from "./components/Navbar"
import Footer from "./components/Footer"
import Home from "./pages/Home"
import Groups from "./pages/Groups"
import Events from "./pages/Events"
import CreateEvent from "./pages/CreateEvent"
import CreateGroup from "./pages/CreateGroup"
import Profile from "./pages/Profile"
import RegisterForm from "./features/auth/RegisterForm"
import LoginForm from "./features/auth/LoginForm"
import { useAuth } from "./features/auth/AuthContext"

export default function App() {
  const { isLoading } = useAuth()
  
  useEffect(() => {
    try { initParallax() } catch (e) { console.error(e) }
    import("./utils/toast.jsx").then(m => m.ensureToastContainer()).catch(() => {})
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center">
          <FontAwesomeIcon 
            icon={faSpinner} 
            className="h-8 w-8 text-indigo-600 animate-spin mb-4" 
          />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="route-transition">
      <Navbar />
      <ScrollProgressBar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/groups/create" element={<CreateGroup />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/create" element={<CreateEvent />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/register" element={<RegisterForm />} />
          <Route path="/login" element={<LoginForm />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
