import { BrowserRouter, Routes, Route } from "react-router-dom"
import { useEffect, useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faMoon, faSun } from "@fortawesome/free-solid-svg-icons"
import ScrollProgressBar from "./components/ScrollProgressBar"
import Navbar from "./components/Navbar"
import Footer from "./components/Footer"
import Home from "./pages/Home"
import Groups from "./pages/Groups"
import Events from "./pages/Events"
import Profile from "./pages/Profile"

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
                    ? "bg-slate-700 hover:bg-slate-600 text-yellow-300" // dark mode colors
                    : "bg-indigo-500 hover:bg-indigo-600 text-white"    // light mode colors
                  }`}
      title={dark ? "Switch to light" : "Switch to dark"}
    >
      <FontAwesomeIcon icon={dark ? faSun : faMoon} className="h-5 w-5" />
    </button>
  )
}


function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <ScrollProgressBar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/events" element={<Events />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>
      <Footer />

      {/* Floating dark mode button */}
      <DarkModeToggle />
    </BrowserRouter>
  )
}

export default App
