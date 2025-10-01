export function getSystemPref() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "peerprep-dark" : "peerprep-light"
}
export function applyTheme(theme) {
  const t = theme || localStorage.getItem("theme") || getSystemPref()
  document.documentElement.setAttribute("data-theme", t)
  document.documentElement.classList.toggle("dark", t === "peerprep-dark")
  localStorage.setItem("theme", t)
  return t
}
