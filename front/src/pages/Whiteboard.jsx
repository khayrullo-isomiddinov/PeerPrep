import { useEffect, useRef, useState, useCallback } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faArrowLeft, faDownload, faTrashCan, faPlus, faMinus, faExpand, faLock
} from "@fortawesome/free-solid-svg-icons"
import { useAuth } from "../features/auth/AuthContext"
import { useEvent } from "../hooks/useEvents"
import { useWhiteboardSocket } from "../features/whiteboard/useWhiteboardSocket"
import WhiteboardToolbar from "../features/whiteboard/WhiteboardToolbar"
import { TOOLS } from "../features/whiteboard/tools"
import ConfirmDialog from "../components/ui/ConfirmDialog"
import { useToast } from "../components/ui/toastContext"
import {
  PEN_COLORS, NOTE_COLORS, NOTE_SIZE, NOTE_PADDING, NOTE_TEXT_COLOR,
  newId, round, normalizeRect, getBounds, hitTest, translate,
  drawElement, drawGrid, drawSelection, drawCursor, renderToImage,
  textFont, lineHeight, userColor
} from "../features/whiteboard/elements"

const MIN_SCALE = 0.2
const MAX_SCALE = 4
const DRAFT_INTERVAL_MS = 50
const CURSOR_INTERVAL_MS = 40
const CURSOR_TTL_MS = 10000
const MAX_UNDO = 100
const SEND_CHUNK = 200
const TEXT_SIZES = { 2: 18, 4: 24, 8: 32, 14: 44 }

function chunk(list, size) {
  const out = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

function Avatar({ user, label }) {
  const ring = { boxShadow: `0 0 0 2px white, 0 0 0 4px ${userColor(user.id)}` }
  return user.photo_url ? (
    <img src={user.photo_url} alt={user.name} title={label} className="w-8 h-8 rounded-full object-cover" style={ring} />
  ) : (
    <div title={label} className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ ...ring, backgroundColor: userColor(user.id) }}>
      {(user.name || "U")[0].toUpperCase()}
    </div>
  )
}

export default function Whiteboard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { data: event } = useEvent(id, { enabled: !!id && isAuthenticated })

  const [tool, setTool] = useState("pen")
  const [color, setColor] = useState(PEN_COLORS[0])
  const [width, setWidth] = useState(4)
  const [noteColor, setNoteColor] = useState(NOTE_COLORS[0])
  const [selectedId, setSelectedId] = useState(null)
  const [editing, setEditing] = useState(null) // { element, before, isNew }
  const [board, setBoard] = useState(null) // { you, isOwner, readOnly } as reported by the server
  const [onlineUsers, setOnlineUsers] = useState([])
  const [history, setHistory] = useState({ canUndo: false, canRedo: false })
  const [zoom, setZoom] = useState(1)
  const toast = useToast()
  const [confirmClear, setConfirmClear] = useState(false)
  const [spaceHeld, setSpaceHeld] = useState(false)

  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const textareaRef = useRef(null)
  const elementsRef = useRef(new Map()) // element id -> element, in z-order
  const draftsRef = useRef(new Map()) // element id -> { element, userId } for collaborators' in-progress work
  const cursorsRef = useRef(new Map()) // user id -> { x, y, t }
  const usersRef = useRef(new Map())
  const viewRef = useRef({ x: 0, y: 0, scale: 1 })
  const sizeRef = useRef({ w: 0, h: 0 })
  const gestureRef = useRef(null)
  const undoRef = useRef([])
  const redoRef = useRef([])
  const frameRef = useRef(0)
  const lastCursorSentRef = useRef(0)
  const selectedRef = useRef(null)
  const editingRef = useRef(null)
  const fittedRef = useRef(false)
  const handlersRef = useRef({})

  const readOnly = board?.readOnly ?? false

  const { status, send } = useWhiteboardSocket(id, {
    enabled: isAuthenticated,
    onMessage: handleMessage,
  })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate("/login")
  }, [authLoading, isAuthenticated, navigate])

  // ---------- Rendering ----------

  const render = useCallback(() => {
    frameRef.current = 0
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    const dpr = window.devicePixelRatio || 1
    const { w, h } = sizeRef.current
    const view = viewRef.current

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, w, h)
    drawGrid(ctx, view, w, h)

    ctx.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, dpr * view.x, dpr * view.y)
    const overrides = new Map()
    for (const [elId, d] of draftsRef.current) overrides.set(elId, d.element)
    const local = gestureRef.current?.preview
    if (local) overrides.set(local.id, local)
    const hiddenId = editingRef.current?.element.id

    for (const el of elementsRef.current.values()) {
      if (el.id === hiddenId) continue
      drawElement(ctx, overrides.get(el.id) || el)
      overrides.delete(el.id)
    }
    for (const el of overrides.values()) {
      if (el.id !== hiddenId) drawElement(ctx, el)
    }

    const selId = selectedRef.current
    const selected = selId && (local?.id === selId ? local : elementsRef.current.get(selId))
    if (selected) drawSelection(ctx, selected, view.scale)

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const now = Date.now()
    for (const [userId, c] of cursorsRef.current) {
      if (now - c.t > CURSOR_TTL_MS) {
        cursorsRef.current.delete(userId)
        continue
      }
      drawCursor(ctx, c.x * view.scale + view.x, c.y * view.scale + view.y, usersRef.current.get(userId)?.name, userColor(userId))
    }
  }, [])

  const requestRender = useCallback(() => {
    if (!frameRef.current) frameRef.current = requestAnimationFrame(render)
  }, [render])

  const fitToContent = useCallback(() => {
    const { w, h } = sizeRef.current
    const els = [...elementsRef.current.values()]
    if (!w || !h) return false
    if (els.length === 0) {
      viewRef.current = { x: w / 2, y: h / 2, scale: 1 }
    } else {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const el of els) {
        const b = getBounds(el)
        minX = Math.min(minX, b.x)
        minY = Math.min(minY, b.y)
        maxX = Math.max(maxX, b.x + b.w)
        maxY = Math.max(maxY, b.y + b.h)
      }
      const scale = Math.max(MIN_SCALE, Math.min(1, (w - 120) / (maxX - minX || 1), (h - 160) / (maxY - minY || 1)))
      viewRef.current = {
        scale,
        x: w / 2 - ((minX + maxX) / 2) * scale,
        y: h / 2 + 20 - ((minY + maxY) / 2) * scale,
      }
    }
    setZoom(viewRef.current.scale)
    requestRender()
    return true
  }, [requestRender])

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return
    const observer = new ResizeObserver(() => {
      const { width: w, height: h } = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      const firstSize = sizeRef.current.w === 0
      sizeRef.current = { w, h }
      if (firstSize) viewRef.current = { x: w / 2, y: h / 2, scale: 1 }
      if (fittedRef.current === "pending") fittedRef.current = fitToContent()
      requestRender()
    })
    observer.observe(container)
    // Re-render periodically so idle collaborators' cursors fade out
    const tick = setInterval(requestRender, 2000)
    return () => {
      observer.disconnect()
      clearInterval(tick)
      cancelAnimationFrame(frameRef.current)
      frameRef.current = 0
    }
  }, [fitToContent, requestRender])

  useEffect(() => {
    selectedRef.current = selectedId
    requestRender()
  }, [selectedId, requestRender])

  // ---------- Applying changes ----------

  const syncHistory = () => setHistory({ canUndo: undoRef.current.length > 0, canRedo: redoRef.current.length > 0 })

  function forgetElements(ids) {
    for (const elId of ids) {
      elementsRef.current.delete(elId)
      draftsRef.current.delete(elId)
    }
    if (ids.includes(selectedRef.current)) setSelectedId(null)
  }

  function applyRemote(msg) {
    switch (msg.type) {
      case "upsert":
        for (const el of msg.elements) {
          elementsRef.current.set(el.id, el)
          draftsRef.current.delete(el.id)
        }
        break
      case "delete":
        forgetElements(msg.ids)
        break
      case "clear":
        elementsRef.current.clear()
        draftsRef.current.clear()
        undoRef.current = []
        redoRef.current = []
        syncHistory()
        setSelectedId(null)
        break
    }
  }

  function handleMessage(msg, pending) {
    switch (msg.type) {
      case "init":
        elementsRef.current = new Map(msg.elements.map((el) => [el.id, el]))
        draftsRef.current.clear()
        cursorsRef.current.clear()
        // Edits made while we were offline are re-applied on top of the fresh snapshot (and re-sent by the hook)
        for (const m of pending || []) applyRemote(m)
        usersRef.current = new Map([...msg.users, msg.you].map((u) => [u.id, u]))
        setOnlineUsers(msg.users.filter((u) => u.id !== msg.you.id))
        setBoard({ you: msg.you, isOwner: msg.is_owner, readOnly: msg.read_only })
        if (msg.read_only) setTool("select")
        if (!fittedRef.current) fittedRef.current = fitToContent() || "pending"
        break
      case "upsert":
      case "delete":
        applyRemote(msg)
        break
      case "clear":
        applyRemote(msg)
        toast.info(`${usersRef.current.get(msg.user_id)?.name || "The organizer"} cleared the board`)
        break
      case "draft":
        draftsRef.current.set(msg.element.id, { element: msg.element, userId: msg.user_id })
        break
      case "draft_end":
        draftsRef.current.delete(msg.id)
        break
      case "cursor":
        cursorsRef.current.set(msg.user_id, { x: msg.x, y: msg.y, t: Date.now() })
        break
      case "cursor_leave":
        cursorsRef.current.delete(msg.user_id)
        break
      case "user_joined":
        usersRef.current.set(msg.user.id, msg.user)
        setOnlineUsers((prev) => (prev.some((u) => u.id === msg.user.id) ? prev : [...prev, msg.user]))
        break
      case "user_left":
        cursorsRef.current.delete(msg.user_id)
        for (const [elId, d] of draftsRef.current) if (d.userId === msg.user_id) draftsRef.current.delete(elId)
        setOnlineUsers((prev) => prev.filter((u) => u.id !== msg.user_id))
        break
      case "error":
        toast.error(msg.message)
        break
    }
    requestRender()
  }

  // A change is { before, after }: before=null is a creation, after=null is a deletion
  function applyChanges(changes, forward) {
    const upserts = []
    const deletes = []
    for (const c of changes) {
      const target = forward ? c.after : c.before
      if (target) {
        elementsRef.current.set(target.id, target)
        upserts.push(target)
      } else {
        const elId = (c.before || c.after).id
        elementsRef.current.delete(elId)
        deletes.push(elId)
      }
    }
    chunk(upserts, SEND_CHUNK).forEach((elements) => send({ type: "upsert", elements }))
    chunk(deletes, SEND_CHUNK).forEach((ids) => send({ type: "delete", ids }))
    if (deletes.includes(selectedRef.current)) setSelectedId(null)
    requestRender()
  }

  function pushHistory(changes) {
    undoRef.current.push(changes)
    if (undoRef.current.length > MAX_UNDO) undoRef.current.shift()
    redoRef.current = []
    syncHistory()
  }

  function commit(changes) {
    if (readOnly || changes.length === 0) return
    applyChanges(changes, true)
    pushHistory(changes)
  }

  function undo() {
    if (readOnly) return
    const changes = undoRef.current.pop()
    if (!changes) return
    applyChanges(changes, false)
    redoRef.current.push(changes)
    syncHistory()
  }

  function redo() {
    if (readOnly) return
    const changes = redoRef.current.pop()
    if (!changes) return
    applyChanges(changes, true)
    undoRef.current.push(changes)
    syncHistory()
  }

  function deleteSelected() {
    const el = elementsRef.current.get(selectedRef.current)
    if (el) commit([{ before: el, after: null }])
    setSelectedId(null)
  }

  function clearBoard() {
    setConfirmClear(false)
    send({ type: "clear" })
    applyRemote({ type: "clear" })
    requestRender()
  }

  // ---------- Text & sticky-note editing ----------

  function startEdit(element, isNew = false) {
    const state = { element, before: isNew ? null : element, isNew }
    editingRef.current = state
    setEditing(state)
    setSelectedId(null)
    requestRender()
  }

  function commitEdit() {
    const state = editingRef.current
    if (!state) return
    editingRef.current = null
    const text = (textareaRef.current?.value ?? "").replace(/\s+$/, "")
    setEditing(null)
    if (!text.trim()) {
      if (!state.isNew) commit([{ before: state.before, after: null }])
    } else if (state.isNew || text !== state.before.text) {
      commit([{ before: state.before, after: { ...state.element, text } }])
    }
    requestRender()
  }

  useEffect(() => {
    const ta = textareaRef.current
    if (!editing || !ta) return
    ta.focus()
    ta.setSelectionRange(ta.value.length, ta.value.length)
    autosizeTextarea()
  }, [editing])

  function autosizeTextarea() {
    const ta = textareaRef.current
    if (!ta || editingRef.current?.element.type !== "text") return
    ta.style.width = "0px"
    ta.style.height = "0px"
    ta.style.width = `${ta.scrollWidth + 4}px`
    ta.style.height = `${ta.scrollHeight}px`
  }

  // ---------- Pointer interaction ----------

  function screenPoint(e) {
    const r = canvasRef.current.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top]
  }

  function toWorld([sx, sy]) {
    const v = viewRef.current
    return [(sx - v.x) / v.scale, (sy - v.y) / v.scale]
  }

  function topmostHit(x, y, filter) {
    const tol = 6 / viewRef.current.scale
    const els = [...elementsRef.current.values()]
    for (let i = els.length - 1; i >= 0; i--) {
      if ((!filter || filter(els[i])) && hitTest(els[i], x, y, tol, "select")) return els[i]
    }
    return null
  }

  function eraseAlong(from, to) {
    const g = gestureRef.current
    const tol = 8 / viewRef.current.scale
    // Sample along the pointer's path so fast swipes don't skip over thin strokes
    const steps = Math.max(1, Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]) / tol))
    const hits = []
    for (const el of elementsRef.current.values()) {
      for (let i = 0; i <= steps; i++) {
        const x = from[0] + ((to[0] - from[0]) * i) / steps
        const y = from[1] + ((to[1] - from[1]) * i) / steps
        if (hitTest(el, x, y, tol, "erase")) {
          hits.push(el)
          break
        }
      }
    }
    if (hits.length === 0) return
    const ids = hits.map((el) => el.id)
    forgetElements(ids)
    g.removed.push(...hits)
    send({ type: "delete", ids })
  }

  function buildShape(type, shapeId, [x1, y1], [x2, y2], constrain) {
    if (constrain) {
      const dx = x2 - x1, dy = y2 - y1
      if (type === "rect" || type === "ellipse") {
        const s = Math.max(Math.abs(dx), Math.abs(dy))
        x2 = x1 + Math.sign(dx || 1) * s
        y2 = y1 + Math.sign(dy || 1) * s
      } else {
        const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4)
        const len = Math.hypot(dx, dy)
        x2 = x1 + Math.cos(angle) * len
        y2 = y1 + Math.sin(angle) * len
      }
    }
    const base = { id: shapeId, type, color, width }
    if (type === "line" || type === "arrow") {
      return { ...base, points: [[round(x1), round(y1)], [round(x2), round(y2)]] }
    }
    const r = normalizeRect(x1, y1, x2, y2)
    return { ...base, x: round(r.x), y: round(r.y), w: round(r.w), h: round(r.h) }
  }

  function handlePointerDown(e) {
    e.preventDefault()
    if (editingRef.current) {
      commitEdit()
      return
    }
    if (e.button === 2) return
    canvasRef.current.setPointerCapture(e.pointerId)
    const sp = screenPoint(e)
    const [x, y] = toWorld(sp)
    const active = e.button === 1 || spaceHeld ? "hand" : tool

    if (active === "hand" || (readOnly && active !== "select")) {
      gestureRef.current = { kind: "pan", last: sp }
      return
    }

    switch (active) {
      case "select": {
        const hit = topmostHit(x, y)
        setSelectedId(hit?.id ?? null)
        gestureRef.current = hit && !readOnly
          ? { kind: "move", original: hit, start: [x, y], preview: null, lastDraft: 0 }
          : { kind: "pan", last: sp }
        break
      }
      case "pen":
      case "highlighter": {
        const highlighter = active === "highlighter"
        gestureRef.current = {
          kind: "draw",
          lastDraft: 0,
          preview: {
            id: newId(),
            type: "stroke",
            color,
            width: highlighter ? width * 3 : width,
            ...(highlighter && { opacity: 0.35 }),
            points: [[round(x), round(y)]],
          },
        }
        break
      }
      case "rect":
      case "ellipse":
      case "line":
      case "arrow":
        gestureRef.current = { kind: "shape", type: active, id: newId(), start: [x, y], preview: null, lastDraft: 0 }
        break
      case "eraser":
        gestureRef.current = { kind: "erase", removed: [], last: [x, y] }
        eraseAlong([x, y], [x, y])
        break
      case "text": {
        const hit = topmostHit(x, y, (el) => el.type === "text")
        const fontSize = TEXT_SIZES[width] || 24
        if (hit) startEdit(hit)
        else startEdit({ id: newId(), type: "text", x: round(x), y: round(y - fontSize * 0.65), color, fontSize, text: "" }, true)
        break
      }
      case "note": {
        const hit = topmostHit(x, y, (el) => el.type === "note")
        if (hit) startEdit(hit)
        else startEdit({
          id: newId(), type: "note", text: "",
          x: round(x - NOTE_SIZE.w / 2), y: round(y - NOTE_SIZE.h / 2), w: NOTE_SIZE.w, h: NOTE_SIZE.h,
          color: noteColor, fontSize: 18, author: board?.you?.name,
        }, true)
        break
      }
    }
    requestRender()
  }

  function handlePointerMove(e) {
    const sp = screenPoint(e)
    const [x, y] = toWorld(sp)
    const now = performance.now()
    if (now - lastCursorSentRef.current > CURSOR_INTERVAL_MS) {
      lastCursorSentRef.current = now
      send({ type: "cursor", x: round(x), y: round(y) })
    }

    const g = gestureRef.current
    if (!g) return
    switch (g.kind) {
      case "pan": {
        const v = viewRef.current
        v.x += sp[0] - g.last[0]
        v.y += sp[1] - g.last[1]
        g.last = sp
        break
      }
      case "draw": {
        const pts = g.preview.points
        const samples = e.nativeEvent.getCoalescedEvents?.() || []
        for (const ev of samples.length ? samples : [e]) {
          const [px, py] = toWorld(screenPoint(ev))
          const [lx, ly] = pts[pts.length - 1]
          if (Math.hypot(px - lx, py - ly) * viewRef.current.scale >= 1.5) pts.push([round(px), round(py)])
        }
        break
      }
      case "shape":
        g.preview = buildShape(g.type, g.id, g.start, [x, y], e.shiftKey)
        break
      case "erase":
        eraseAlong(g.last, [x, y])
        g.last = [x, y]
        break
      case "move":
        g.preview = translate(g.original, x - g.start[0], y - g.start[1])
        break
    }
    if (g.preview && now - g.lastDraft > DRAFT_INTERVAL_MS) {
      g.lastDraft = now
      g.drafted = true
      send({ type: "draft", element: g.preview })
    }
    requestRender()
  }

  function handlePointerUp() {
    const g = gestureRef.current
    gestureRef.current = null
    if (!g) return
    const scale = viewRef.current.scale
    switch (g.kind) {
      case "draw":
        commit([{ before: null, after: g.preview }])
        break
      case "shape": {
        const p = g.preview
        const size = p && (p.points
          ? Math.hypot(p.points[1][0] - p.points[0][0], p.points[1][1] - p.points[0][1])
          : Math.max(p.w, p.h))
        if (p && size * scale > 4) commit([{ before: null, after: p }])
        else if (g.drafted) send({ type: "draft_end", id: g.id })
        break
      }
      case "erase":
        if (g.removed.length) pushHistory(g.removed.map((el) => ({ before: el, after: null })))
        break
      case "move": {
        const p = g.preview
        const moved = p && JSON.stringify(p) !== JSON.stringify(g.original)
        if (moved) commit([{ before: g.original, after: p }])
        else if (g.drafted) send({ type: "draft_end", id: g.original.id })
        break
      }
    }
    requestRender()
  }

  function handleDoubleClick(e) {
    if (readOnly) return
    const hit = topmostHit(...toWorld(screenPoint(e)), (el) => el.type === "text" || el.type === "note")
    if (hit) startEdit(hit)
  }

  function zoomAt([sx, sy], factor) {
    const v = viewRef.current
    const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, v.scale * factor))
    v.x = sx - (sx - v.x) * (scale / v.scale)
    v.y = sy - (sy - v.y) * (scale / v.scale)
    v.scale = scale
    setZoom(scale)
    requestRender()
  }

  function zoomFromCenter(factor) {
    zoomAt([sizeRef.current.w / 2, sizeRef.current.h / 2], factor)
  }

  // Wheel and keyboard listeners are attached once; they call into the latest handlers through a ref
  useEffect(() => {
    handlersRef.current = {
      wheel(e) {
        e.preventDefault()
        if (editingRef.current) commitEdit()
        const unit = e.deltaMode === 1 ? 16 : 1
        if (e.ctrlKey || e.metaKey) {
          zoomAt(screenPoint(e), Math.exp(-e.deltaY * unit * 0.01))
        } else {
          viewRef.current.x -= e.deltaX * unit
          viewRef.current.y -= e.deltaY * unit
          requestRender()
        }
      },
      keydown(e) {
        if (e.target instanceof Element && e.target.closest("input, textarea, select, [contenteditable]")) return
        const key = e.key.toLowerCase()
        if (e.ctrlKey || e.metaKey) {
          if (key === "z") {
            e.preventDefault()
            e.shiftKey ? redo() : undo()
          } else if (key === "y") {
            e.preventDefault()
            redo()
          }
          return
        }
        if (e.key === " ") {
          e.preventDefault()
          setSpaceHeld(true)
        } else if ((e.key === "Delete" || e.key === "Backspace") && selectedRef.current && !readOnly) {
          e.preventDefault()
          deleteSelected()
        } else if (e.key === "Escape") {
          setSelectedId(null)
        } else if (e.key === "+" || e.key === "=") {
          zoomFromCenter(1.2)
        } else if (e.key === "-") {
          zoomFromCenter(1 / 1.2)
        } else {
          const match = TOOLS.find((t) => t.key.toLowerCase() === key)
          if (match && !(readOnly && match.draws)) setTool(match.id)
        }
      },
      keyup(e) {
        if (e.key === " ") setSpaceHeld(false)
      },
    }
  })

  useEffect(() => {
    const container = containerRef.current
    const onWheel = (e) => handlersRef.current.wheel(e)
    const onKeyDown = (e) => handlersRef.current.keydown(e)
    const onKeyUp = (e) => handlersRef.current.keyup(e)
    container?.addEventListener("wheel", onWheel, { passive: false })
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    return () => {
      container?.removeEventListener("wheel", onWheel)
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
    }
  }, [])

  function exportPng() {
    const canvas = renderToImage([...elementsRef.current.values()])
    if (!canvas) {
      toast.info("The board is empty, so there's nothing to export yet.")
      return
    }
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      const slug = (event?.title || "event").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
      link.href = url
      link.download = `${slug || "event"}-whiteboard.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    })
  }

  // ---------- View ----------

  const panning = spaceHeld || tool === "hand" || readOnly
  const cursor = panning ? "grab" : tool === "select" ? "default" : tool === "text" ? "text" : "crosshair"

  let editorStyle = null
  if (editing) {
    const v = viewRef.current
    const el = editing.element
    const fs = el.fontSize * v.scale
    editorStyle = {
      left: el.x * v.scale + v.x,
      top: el.y * v.scale + v.y,
      font: textFont(fs),
      lineHeight: `${lineHeight(el.fontSize) * v.scale}px`,
    }
    if (el.type === "note") {
      Object.assign(editorStyle, {
        width: el.w * v.scale,
        height: el.h * v.scale,
        padding: NOTE_PADDING * v.scale,
        backgroundColor: el.color,
        color: NOTE_TEXT_COLOR,
        borderRadius: 8 * v.scale,
        boxShadow: "0 4px 14px rgba(15, 23, 42, 0.18)",
      })
    } else {
      Object.assign(editorStyle, { color: el.color, minWidth: fs, whiteSpace: "pre" })
    }
  }

  const connectionLabel = {
    connecting: "Connecting...",
    open: "Live",
    closed: "Reconnecting...",
    denied: "No access",
  }[status]

  return (
    <div className="h-[100dvh] flex flex-col bg-gray-50 overflow-hidden">
      <div className="nav-spacer flex-shrink-0" />

      <header className="flex items-center gap-3 px-3 sm:px-4 py-2 bg-white border-b border-gray-200 flex-shrink-0">
        <Link
          to={`/events/${id}`}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 hover:text-pink-600 flex-shrink-0"
          title="Back to event"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
        </Link>
        <div className="min-w-0">
          <h1 className="font-bold text-gray-900 truncate text-sm sm:text-base">
            {event?.title ? `${event.title} · Whiteboard` : "Whiteboard"}
          </h1>
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${status === "open" ? "bg-green-500" : status === "denied" ? "bg-gray-400" : "bg-amber-400"}`} />
            {connectionLabel}
            {status === "open" && ` · ${onlineUsers.length + 1} here`}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {board && (
            <div className="hidden sm:flex items-center -space-x-1 mr-2">
              <Avatar user={board.you} label={`${board.you.name} (you)`} />
              {onlineUsers.slice(0, 5).map((u) => <Avatar key={u.id} user={u} label={u.name} />)}
              {onlineUsers.length > 5 && (
                <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 text-xs font-bold flex items-center justify-center ring-2 ring-white">
                  +{onlineUsers.length - 5}
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={exportPng}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100"
            title="Download the board as an image"
          >
            <FontAwesomeIcon icon={faDownload} />
            <span className="hidden sm:inline">Export</span>
          </button>
          {board?.isOwner && !readOnly && (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50"
              title="Clear the board for everyone"
            >
              <FontAwesomeIcon icon={faTrashCan} />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>
      </header>

      <div ref={containerRef} className="relative flex-1 min-h-0 overflow-hidden select-none">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 touch-none"
          style={{ cursor }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={() => !gestureRef.current && send({ type: "cursor_leave" })}
          onDoubleClick={handleDoubleClick}
          onContextMenu={(e) => e.preventDefault()}
        />

        {status !== "denied" && (
          <WhiteboardToolbar
            tool={tool} setTool={setTool}
            color={color} setColor={setColor}
            width={width} setWidth={setWidth}
            noteColor={noteColor} setNoteColor={setNoteColor}
            readOnly={readOnly}
            canUndo={history.canUndo && !readOnly}
            canRedo={history.canRedo && !readOnly}
            onUndo={undo}
            onRedo={redo}
            canDelete={!!selectedId && !readOnly}
            onDelete={deleteSelected}
          />
        )}

        {editing && (
          <textarea
            ref={textareaRef}
            defaultValue={editing.element.text}
            onInput={autosizeTextarea}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Escape" || (e.key === "Enter" && (e.ctrlKey || e.metaKey))) {
                e.preventDefault()
                commitEdit()
              }
            }}
            placeholder={editing.element.type === "note" ? "Write a note..." : "Type..."}
            wrap={editing.element.type === "note" ? "soft" : "off"}
            maxLength={2000}
            className="absolute z-20 m-0 border-0 outline-none resize-none overflow-hidden bg-transparent p-0 placeholder:text-gray-400"
            style={editorStyle}
          />
        )}

        <div className="absolute bottom-3 right-3 z-10 flex items-center bg-white/95 backdrop-blur rounded-xl shadow-lg border border-gray-200 p-1">
          <button type="button" onClick={() => zoomFromCenter(1 / 1.2)} className="w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100" title="Zoom out (-)" aria-label="Zoom out">
            <FontAwesomeIcon icon={faMinus} />
          </button>
          <button type="button" onClick={() => zoomFromCenter(1 / zoom)} className="min-w-[3.25rem] h-8 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100" title="Reset zoom to 100%">
            {Math.round(zoom * 100)}%
          </button>
          <button type="button" onClick={() => zoomFromCenter(1.2)} className="w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100" title="Zoom in (+)" aria-label="Zoom in">
            <FontAwesomeIcon icon={faPlus} />
          </button>
          <button type="button" onClick={fitToContent} className="w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100" title="Fit everything on screen" aria-label="Fit to content">
            <FontAwesomeIcon icon={faExpand} />
          </button>
        </div>

        {readOnly && (
          <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 bg-gray-900/85 text-white text-xs sm:text-sm px-3 py-2 rounded-xl shadow-lg max-w-[calc(100%-220px)]">
            <FontAwesomeIcon icon={faLock} />
            <span>This event has ended. The whiteboard is view-only.</span>
          </div>
        )}


        {status === "connecting" && !board && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70">
            <div className="inline-block h-10 w-10 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin" />
          </div>
        )}

        {status === "denied" && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/90 p-4">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <FontAwesomeIcon icon={faLock} className="w-7 h-7 text-gray-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Members only</h2>
              <p className="text-gray-600 mb-6">Join this event to draw and plan together with the group on its whiteboard.</p>
              <Link to={`/events/${id}`} className="btn-pink-pill">
                <FontAwesomeIcon icon={faArrowLeft} />
                Back to event
              </Link>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Clear Whiteboard"
        description="Everything on the board will be removed for all members."
        confirmLabel="Clear Board"
        onConfirm={clearBoard}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  )
}
