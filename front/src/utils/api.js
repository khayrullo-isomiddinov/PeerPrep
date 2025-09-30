import axios from "axios"

const prodBase = "https://peerprep.onrender.com/api"
const base =
  (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.replace(/\/$/, "")) ||
  (import.meta.env.PROD ? prodBase : "http://localhost:8000/api")

console.log("API base at runtime:", base, "PROD:", import.meta.env.PROD)

export const api = axios.create({
  baseURL: base + "/",
  withCredentials: false,
  headers: { "Content-Type": "application/json" }
})
