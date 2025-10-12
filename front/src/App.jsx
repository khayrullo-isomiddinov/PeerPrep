import { Routes, Route } from "react-router-dom"
import { useEffect, useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faMoon, faSun, faSpinner } from "@fortawesome/free-solid-svg-icons"
import { initParallax } from "./utils/parallax"
import ScrollProgressBar from "./components/ScrollProgressBar"
import Navbar from "./components/Navbar"
import Footer from "./components/Footer"
import Home from "./pages/Home"
import Groups from "./pages/Groups"
import Events from "./pages/Events"
import Profile from "./pages/Profile"
import RegisterForm from "./features/auth/RegisterForm"
import LoginForm from "./features/auth/LoginForm"
import { useAuth } from "./features/auth/AuthContext"

/*
function DarkModeToggle() {
  const [dark, setDark] = useState(
    typeof window !== "undefined" &&
      document.documentElement.classList.contains("dark")
  )

  useEffect(() => {
    const saved = localStorage.getItem("theme")
    if (saved) {
      const isDark = saved === "dark"
      document.documentElement.classList.toggle("dark", isDark)
      setDark(isDark)
    }
  }, [])

  function toggle() {
    const html = document.documentElement
    const next = !html.classList.contains("dark")
    html.classList.toggle("dark", next)
    localStorage.setItem("theme", next ? "dark" : "light")
    setDark(next)
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className={`fixed bottom-5 left-5 z-50 flex items-center justify-center
                  h-12 w-12 rounded-full shadow-lg active:scale-95
                  transition-all duration-300 ease-in-out
                  ${dark
                    ? "bg-slate-700 hover:bg-slate-600 text-yellow-300"
                    : "bg-indigo-500 hover:bg-indigo-600 text-white"
                  }`}
      title={dark ? "Switch to light" : "Switch to dark"}
    >
      <FontAwesomeIcon icon={dark ? faSun : faMoon} className="h-5 w-5" />
    </button>
  )
}
*/
export default function App() {
  const { isLoading } = useAuth()
  
  useEffect(() => {
    try { initParallax() } catch (e) { console.error(e) }
    // mount toast container
    import("./utils/toast.jsx").then(m => m.ensureToastContainer()).catch(() => {})
  }, [])

  // Show loading screen while validating authentication
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
    <>
      <Navbar />
      <ScrollProgressBar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/events" element={<Events />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/register" element={<RegisterForm />} />
          <Route path="/login" element={<LoginForm />} />
        </Routes>
      </main>
      <Footer />
{/*    <DarkModeToggle /> */ }  
    </>
  )
}
