import axios from "axios"

const base =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? "https://peerprep.onrender.com/api"
    : "http://localhost:8000/api")

export const api = axios.create({
  baseURL: base,
  withCredentials: false,
  headers: { "Content-Type": "application/json" }
})
