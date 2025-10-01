import axios from "axios"

const base = "https://peerprep.onrender.com/api"
//const base = "http://localhost:8000/api"


console.log("API base at runtime:", base, "PROD:", import.meta.env.PROD)

export const api = axios.create({
  baseURL: base + "/",
  withCredentials: false,
  headers: { "Content-Type": "application/json" }
})

export async function registerUser({ email, password }) {
  const { data } = await api.post("auth/register", { email, password })
  return data
}

export async function loginUser({ email, password }) {
  const { data } = await api.post("auth/login", { email, password })
  return data
}
export function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem("user") || "null") } catch { return null }
}
export function isLoggedIn() {
  return !!localStorage.getItem("access_token")
}
export function logout() {
  localStorage.removeItem("access_token")
  localStorage.removeItem("user")
}


