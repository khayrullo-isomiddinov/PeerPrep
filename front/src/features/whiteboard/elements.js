// Geometry, hit-testing and canvas rendering for whiteboard elements.
// All element coordinates are in "world" units; the view transform maps them to screen pixels.

export const FONT_FAMILY = "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
export const NOTE_PADDING = 14
export const NOTE_TEXT_COLOR = "#1f2937"
export const NOTE_SIZE = { w: 220, h: 170 }

export const PEN_COLORS = ["#111827", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"]
export const NOTE_COLORS = ["#fef08a", "#fbcfe8", "#bfdbfe", "#bbf7d0", "#fed7aa"]
export const STROKE_WIDTHS = [2, 4, 8, 14]

// Distinct colors for each collaborator's cursor, chosen by user id
const USER_COLORS = ["#ec4899", "#8b5cf6", "#3b82f6", "#14b8a6", "#f97316", "#ef4444", "#22c55e", "#6366f1"]
export function userColor(userId) {
  return USER_COLORS[Math.abs(Number(userId) || 0) % USER_COLORS.length]
}

export function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export const round = (n) => Math.round(n * 10) / 10

export function normalizeRect(x1, y1, x2, y2) {
  return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) }
}

let measureCtx = null
function getMeasureCtx() {
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d")
  return measureCtx
}

export function textFont(fontSize, weight = 500) {
  return `${weight} ${fontSize}px ${FONT_FAMILY}`
}

export function lineHeight(fontSize) {
  return fontSize * 1.3
}

// Splits text into lines that fit maxWidth, honoring explicit newlines
export function wrapText(ctx, text, maxWidth) {
  const lines = []
  for (const paragraph of (text || "").split("\n")) {
    const words = paragraph.split(/(\s+)/)
    let line = ""
    for (const word of words) {
      const candidate = line + word
      if (line && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line.trimEnd())
        line = word.trimStart()
      } else {
        line = candidate
      }
    }
    lines.push(line)
  }
  return lines
}

function measureTextElement(el) {
  const ctx = getMeasureCtx()
  ctx.font = textFont(el.fontSize)
  const lines = (el.text || "").split("\n")
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width), el.fontSize * 0.5)
  return { w, h: lines.length * lineHeight(el.fontSize) }
}

export function getBounds(el) {
  switch (el.type) {
    case "stroke":
    case "line":
    case "arrow": {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const [x, y] of el.points) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
      const pad = el.width / 2 + (el.type === "arrow" ? el.width * 3 : 0)
      return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 }
    }
    case "text": {
      const { w, h } = measureTextElement(el)
      return { x: el.x, y: el.y, w, h }
    }
    default:
      return { x: el.x, y: el.y, w: el.w, h: el.h }
  }
}

function distToSegment(px, py, [x1, y1], [x2, y2]) {
  const dx = x2 - x1, dy = y2 - y1
  const len2 = dx * dx + dy * dy
  let t = len2 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

function nearPolyline(points, x, y, maxDist) {
  if (points.length === 1) return Math.hypot(x - points[0][0], y - points[0][1]) <= maxDist
  for (let i = 1; i < points.length; i++) {
    if (distToSegment(x, y, points[i - 1], points[i]) <= maxDist) return true
  }
  return false
}

function insideBox(b, x, y, tol) {
  return x >= b.x - tol && x <= b.x + b.w + tol && y >= b.y - tol && y <= b.y + b.h + tol
}

// mode "select": anywhere inside a shape counts. mode "erase": only near the visible outline,
// so erasing scribbles inside a big rectangle doesn't wipe the rectangle too.
export function hitTest(el, x, y, tol, mode = "select") {
  switch (el.type) {
    case "stroke":
    case "line":
    case "arrow":
      return nearPolyline(el.points, x, y, el.width / 2 + tol)
    case "rect": {
      if (mode === "select") return insideBox(el, x, y, tol)
      const { x: rx, y: ry, w, h } = el
      const corners = [[rx, ry], [rx + w, ry], [rx + w, ry + h], [rx, ry + h], [rx, ry]]
      return nearPolyline(corners, x, y, el.width / 2 + tol)
    }
    case "ellipse": {
      const rx = el.w / 2, ry = el.h / 2
      if (rx < 1 || ry < 1) return insideBox(el, x, y, tol)
      const nx = (x - (el.x + rx)) / rx, ny = (y - (el.y + ry)) / ry
      const r = Math.hypot(nx, ny)
      if (mode === "select") return r <= 1 + tol / Math.min(rx, ry)
      return Math.abs(r - 1) * Math.min(rx, ry) <= el.width / 2 + tol
    }
    default:
      return insideBox(getBounds(el), x, y, tol)
  }
}

export function translate(el, dx, dy) {
  if (el.points) {
    return { ...el, points: el.points.map(([x, y]) => [round(x + dx), round(y + dy)]) }
  }
  return { ...el, x: round(el.x + dx), y: round(el.y + dy) }
}

function drawSmoothPath(ctx, pts) {
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2
    const my = (pts[i][1] + pts[i + 1][1]) / 2
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my)
  }
  const last = pts[pts.length - 1]
  ctx.lineTo(last[0], last[1])
  ctx.stroke()
}

function drawArrowHead(ctx, [x1, y1], [x2, y2], width) {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const len = Math.max(12, width * 3.5)
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - len * Math.cos(angle - Math.PI / 7), y2 - len * Math.sin(angle - Math.PI / 7))
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - len * Math.cos(angle + Math.PI / 7), y2 - len * Math.sin(angle + Math.PI / 7))
  ctx.stroke()
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export function drawElement(ctx, el) {
  ctx.save()
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  ctx.strokeStyle = el.color
  ctx.fillStyle = el.color
  ctx.lineWidth = el.width || 2
  ctx.globalAlpha = el.opacity ?? 1

  switch (el.type) {
    case "stroke":
      if (el.points.length === 1) {
        ctx.beginPath()
        ctx.arc(el.points[0][0], el.points[0][1], el.width / 2, 0, Math.PI * 2)
        ctx.fill()
      } else {
        drawSmoothPath(ctx, el.points)
      }
      break
    case "line":
    case "arrow": {
      const [a, b] = el.points
      ctx.beginPath()
      ctx.moveTo(a[0], a[1])
      ctx.lineTo(b[0], b[1])
      ctx.stroke()
      if (el.type === "arrow") drawArrowHead(ctx, a, b, el.width)
      break
    }
    case "rect":
      roundedRect(ctx, el.x, el.y, el.w, el.h, Math.min(6, el.w / 2, el.h / 2))
      ctx.stroke()
      break
    case "ellipse":
      ctx.beginPath()
      ctx.ellipse(el.x + el.w / 2, el.y + el.h / 2, el.w / 2, el.h / 2, 0, 0, Math.PI * 2)
      ctx.stroke()
      break
    case "text": {
      ctx.font = textFont(el.fontSize)
      ctx.textBaseline = "top"
      const lh = lineHeight(el.fontSize)
      ;(el.text || "").split("\n").forEach((line, i) => ctx.fillText(line, el.x, el.y + i * lh))
      break
    }
    case "note": {
      ctx.shadowColor = "rgba(15, 23, 42, 0.18)"
      ctx.shadowBlur = 14
      ctx.shadowOffsetY = 4
      roundedRect(ctx, el.x, el.y, el.w, el.h, 8)
      ctx.fill()
      ctx.shadowColor = "transparent"
      ctx.font = textFont(el.fontSize || 18)
      ctx.fillStyle = NOTE_TEXT_COLOR
      ctx.textBaseline = "top"
      const fs = el.fontSize || 18
      const lh = lineHeight(fs)
      const lines = wrapText(ctx, el.text || "", el.w - NOTE_PADDING * 2)
      ctx.save()
      ctx.beginPath()
      ctx.rect(el.x, el.y, el.w, el.h)
      ctx.clip()
      lines.forEach((line, i) => ctx.fillText(line, el.x + NOTE_PADDING, el.y + NOTE_PADDING + i * lh))
      ctx.restore()
      if (el.author) {
        ctx.font = textFont(11, 600)
        ctx.fillStyle = "rgba(31, 41, 55, 0.55)"
        ctx.textBaseline = "bottom"
        ctx.fillText(el.author, el.x + NOTE_PADDING, el.y + el.h - 8)
      }
      break
    }
  }
  ctx.restore()
}

export function drawGrid(ctx, view, width, height) {
  let spacing = 24
  while (spacing * view.scale < 14) spacing *= 2
  const step = spacing * view.scale
  const offsetX = ((view.x % step) + step) % step
  const offsetY = ((view.y % step) + step) % step
  const r = Math.max(0.8, Math.min(1.4, view.scale))
  ctx.fillStyle = "#d4d4d8"
  for (let x = offsetX; x < width; x += step) {
    for (let y = offsetY; y < height; y += step) {
      ctx.fillRect(x - r / 2, y - r / 2, r, r)
    }
  }
}

export function drawSelection(ctx, el, scale) {
  const b = getBounds(el)
  const pad = 6 / scale
  ctx.save()
  ctx.strokeStyle = "#6366f1"
  ctx.lineWidth = 1.5 / scale
  ctx.setLineDash([6 / scale, 4 / scale])
  ctx.strokeRect(b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2)
  ctx.restore()
}

export function drawCursor(ctx, x, y, name, color) {
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = color
  ctx.strokeStyle = "white"
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, 17)
  ctx.lineTo(4.5, 13)
  ctx.lineTo(8, 20)
  ctx.lineTo(10.5, 19)
  ctx.lineTo(7, 12)
  ctx.lineTo(13, 12)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.font = textFont(12, 600)
  const label = name || "Someone"
  const w = ctx.measureText(label).width + 12
  roundedRect(ctx, 12, 20, w, 20, 10)
  ctx.fill()
  ctx.fillStyle = "white"
  ctx.textBaseline = "middle"
  ctx.fillText(label, 18, 30)
  ctx.restore()
}

// Renders every element onto a fresh canvas sized to the content, for PNG export
export function renderToImage(elements, padding = 40) {
  if (elements.length === 0) return null
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const el of elements) {
    const b = getBounds(el)
    minX = Math.min(minX, b.x)
    minY = Math.min(minY, b.y)
    maxX = Math.max(maxX, b.x + b.w)
    maxY = Math.max(maxY, b.y + b.h)
  }
  const width = maxX - minX + padding * 2
  const height = maxY - minY + padding * 2
  // Retina-quality by default, scaled down for huge boards to stay within browser canvas limits
  const scale = Math.min(2, 8000 / Math.max(width, height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.ceil(width * scale)
  canvas.height = Math.ceil(height * scale)
  const ctx = canvas.getContext("2d")
  ctx.fillStyle = "white"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.setTransform(scale, 0, 0, scale, (padding - minX) * scale, (padding - minY) * scale)
  elements.forEach((el) => drawElement(ctx, el))
  return canvas
}
