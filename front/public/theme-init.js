// Apply the saved (or system) theme before first paint to avoid a flash of the wrong theme
(function () {
  var theme = "light"
  try {
    var saved = localStorage.getItem("peerprep-theme")
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    theme = saved === "dark" || saved === "light" ? saved : prefersDark ? "dark" : "light"
  } catch { /* storage or matchMedia unavailable: keep light */ }
  var root = document.documentElement
  root.dataset.theme = theme
  root.style.colorScheme = theme
  document.querySelector('meta[name="theme-color"]').setAttribute("content", theme === "dark" ? "#0F0F0E" : "#F7F6F2")
})()

