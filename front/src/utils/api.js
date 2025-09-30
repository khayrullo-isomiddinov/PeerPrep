import axios from "axios"

const base = "https://peerprep.onrender.com/api"

console.log("API base at runtime:", base, "PROD:", import.meta.env.PROD)

export const api = axios.create({
  baseURL: base + "/",
  withCredentials: false,
  headers: { "Content-Type": "application/json" }
})
