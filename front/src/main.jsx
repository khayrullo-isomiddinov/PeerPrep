import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"
import { initParallax } from "./utils/parallax"

initParallax()


const savedTheme = localStorage.getItem("theme")
if (savedTheme === "dark") {
  document.documentElement.classList.add("dark")
} else if (savedTheme === "light") {
  document.documentElement.classList.remove("dark")
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
