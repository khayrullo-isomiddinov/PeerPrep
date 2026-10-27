// A soft two-note chime made with the Web Audio API (no sound file to download).
// Browsers only allow audio after a user gesture, so `primeChime()` is called from the Start button.
let context = null

export function primeChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    context ??= new AudioCtx()
    if (context.state === "suspended") context.resume()
  } catch { /* audio unavailable */ }
}

export function playChime() {
  if (!context) return
  try {
    const t = context.currentTime
    for (const [i, freq] of [660, 880].entries()) {
      const osc = context.createOscillator()
      const gain = context.createGain()
      osc.type = "sine"
      osc.frequency.value = freq
      const at = t + i * 0.22
      gain.gain.setValueAtTime(0, at)
      gain.gain.linearRampToValueAtTime(0.18, at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.9)
      osc.connect(gain).connect(context.destination)
      osc.start(at)
      osc.stop(at + 1)
    }
  } catch { /* audio unavailable */ }
}
