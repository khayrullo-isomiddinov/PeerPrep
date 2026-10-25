import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faComments, faPaperPlane, faTrash, faInfoCircle, faChalkboard
} from "@fortawesome/free-solid-svg-icons"
import { getErrorMessage } from "../../../utils/api"
import { formatRelativeTime } from "../../../utils/dates"
import { useDeleteMessage } from "../../../hooks/useEventData"
import ConfirmDialog from "../../../components/ui/ConfirmDialog"
import { useToast } from "../../../components/ui/toastContext"
import Card from "../../../components/ui/Card"

const MAX_MESSAGE_LENGTH = 1000
const GROUP_WINDOW_MS = 5 * 60 * 1000 // consecutive messages from one person within 5 min are grouped

function ChatHeader({ eventId, timing, connected, messageCount }) {
  const { isPast, isOngoing } = timing
  const theme = isPast
    ? { bg: "from-gray-700 via-gray-800 to-gray-900", icon: "from-gray-500 to-gray-600" }
    : isOngoing
      ? { bg: "from-green-600 via-emerald-700 to-teal-800", icon: "from-green-400 to-emerald-500" }
      : { bg: "from-slate-900 via-indigo-900 to-purple-900", icon: "from-indigo-400 to-purple-500" }

  let subtitle
  if (isPast) subtitle = messageCount > 0 ? `${messageCount} message${messageCount !== 1 ? "s" : ""}` : "View message history"
  else if (messageCount > 0) subtitle = `${messageCount} message${messageCount !== 1 ? "s" : ""} • ${connected ? "Connected" : "Reconnecting..."}`
  else subtitle = connected ? "Start chatting" : "Connecting..."

  return (
    <div className={`relative p-5 flex-shrink-0 bg-gradient-to-br ${theme.bg}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br ${theme.icon} flex-shrink-0`}>
            <FontAwesomeIcon icon={faComments} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">Event Chat</h2>
              {!isPast && (
                <span
                  className={`w-2 h-2 rounded-full ${connected ? "bg-green-400" : "bg-red-400"}`}
                  title={connected ? "Connected" : "Disconnected"}
                />
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {isOngoing && (
                <span className="px-2 py-0.5 bg-green-500/20 text-green-200 rounded-full text-xs font-semibold border border-green-400/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  Event Ongoing
                </span>
              )}
              {isPast && (
                <span className="px-2 py-0.5 bg-gray-500/20 text-gray-300 rounded-full text-xs font-semibold border border-gray-400/30 flex items-center gap-1">
                  <FontAwesomeIcon icon={faInfoCircle} className="w-3 h-3" />
                  Read Only
                </span>
              )}
              <p className={`text-xs ${isPast ? "text-gray-300" : "text-indigo-200"}`}>{subtitle}</p>
            </div>
          </div>
        </div>
        <Link
          to={`/events/${eventId}/whiteboard`}
          className="touch-target inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white text-sm font-semibold flex-shrink-0"
          title={isPast ? "View the group's whiteboard" : "Draw and plan together on a shared whiteboard"}
        >
          <FontAwesomeIcon icon={faChalkboard} />
          <span className="hidden sm:inline">Whiteboard</span>
        </Link>
      </div>
    </div>
  )
}

function Avatar({ user }) {
  const initial = (user.name || user.email || "U")[0].toUpperCase()
  return user.photo_url ? (
    <img src={user.photo_url} alt={user.name || "User"} className="w-8 h-8 rounded-lg object-cover ring-2 ring-white shadow-sm" />
  ) : (
    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white shadow-sm">
      {initial}
    </div>
  )
}

function MessageBubble({ message, isOwn, isGrouped, isDeleting, onDelete }) {
  return (
    <div className={`relative flex ${isOwn ? "justify-end" : "justify-start"} ${isGrouped ? "mt-1" : "mt-3"}`}>
      {isOwn && !message.is_deleted && (
        <div className="absolute left-0 top-0">
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="touch-target p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            title="Delete message"
            aria-label="Delete message"
          >
            {isDeleting ? (
              <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
            )}
          </button>
        </div>
      )}

      {!isOwn && (
        <div className={`flex-shrink-0 mr-2 ${isGrouped ? "w-8" : ""}`}>
          {!isGrouped && <Avatar user={message.user} />}
        </div>
      )}

      <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} flex-1 min-w-0 max-w-[75%]`}>
        {!isOwn && !isGrouped && (
          <div className="flex items-center gap-2 mb-1 px-1">
            <span className="text-xs font-bold text-gray-700">{message.user.name || message.user.email || "User"}</span>
            <span className="text-[10px] text-gray-400">{formatRelativeTime(message.created_at)}</span>
          </div>
        )}
        <div
          className={`relative flex items-center gap-2 rounded-xl px-3 py-2 shadow-sm ${message.is_deleted ? "italic" : ""} ${
            message.is_deleted
              ? "bg-gray-200/50 text-gray-500 border border-gray-300/50"
              : isOwn
                ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
                : "bg-white text-gray-800 border border-gray-200/80"
          }`}
        >
          {message.is_deleted ? (
            <p className="text-xs leading-relaxed flex-1 flex items-center gap-2">
              <FontAwesomeIcon icon={faTrash} className="w-3 h-3 opacity-50" />
              <span>This message has been deleted</span>
            </p>
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words flex-1">{message.content}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function TypingIndicator({ users }) {
  if (users.length === 0) return null
  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 italic">
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full" />
        <div className="w-2 h-2 bg-gray-400 rounded-full" />
        <div className="w-2 h-2 bg-gray-400 rounded-full" />
      </div>
      <span>{users.length === 1 ? `${users[0].name} is typing...` : `${users.length} people are typing...`}</span>
    </div>
  )
}

function Composer({ onSend, onTyping }) {
  const toast = useToast()
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)

  async function submit(e) {
    e.preventDefault()
    const content = text.trim()
    if (!content || sending) return
    setSending(true)
    try {
      await onSend(content)
      setText("")
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to send message"))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-4 bg-gradient-to-b from-white to-gray-50/50 border-t border-gray-200/60 flex-shrink-0">
      <form onSubmit={submit}>
        <div className="flex items-center gap-2 bg-white rounded-xl border-2 border-gray-200/60 shadow-md hover:border-indigo-300/60 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 p-1">
          <input
            type="text"
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              onTyping()
            }}
            placeholder="Write a message..."
            aria-label="Message"
            className="flex-1 px-3 py-2 bg-transparent border-0 outline-none text-gray-900 placeholder-gray-400 text-sm"
            maxLength={MAX_MESSAGE_LENGTH}
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            aria-label="Send message"
            className={`touch-target w-11 h-11 flex items-center justify-center rounded-lg ${
              text.trim() && !sending ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FontAwesomeIcon icon={faPaperPlane} className="w-3 h-3" />
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function ChatPanel({ eventId, currentUserId, timing, chat }) {
  const { messages, connected, typingUsers, chatError, clearChatError, sendMessage, notifyTyping } = chat
  const toast = useToast()
  const deleteMessage = useDeleteMessage()
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const containerRef = useRef(null)
  const lastCountRef = useRef(0)

  // Jump to the bottom on first load; afterwards follow new messages only if the reader is already near the bottom
  // (or the new message is their own), so scrolling up through history isn't interrupted.
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el || messages.length === lastCountRef.current) return
    const isFirstLoad = lastCountRef.current === 0
    const last = messages[messages.length - 1]
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200
    if (isFirstLoad || nearBottom || last?.user?.id === currentUserId) el.scrollTop = el.scrollHeight
    lastCountRef.current = messages.length
  }, [messages, currentUserId])

  // Errors pushed by the server over the socket (e.g. "chat is read-only")
  useEffect(() => {
    if (!chatError) return
    toast.error(chatError)
    clearChatError()
  }, [chatError, clearChatError, toast])

  function confirmDelete() {
    deleteMessage.mutate(
      { eventId, messageId: confirmDeleteId },
      {
        onSettled: () => setConfirmDeleteId(null),
        onError: (err) => toast.error(getErrorMessage(err, "Failed to delete message")),
      }
    )
  }

  return (
    <Card as="div" padded={false} className="flex flex-col h-[400px] lg:h-[600px]">
      <ChatHeader eventId={eventId} timing={timing} connected={connected} messageCount={messages.length} />

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto premium-scrollbar p-4"
        style={{ background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)" }}
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FontAwesomeIcon icon={faComments} className="w-10 h-10 text-indigo-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">No messages yet</h3>
              <p className="text-gray-500 text-sm">Be the first to start the conversation!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((message, index) => {
              const prev = messages[index - 1]
              const isGrouped = !!prev && prev.user.id === message.user.id &&
                new Date(message.created_at) - new Date(prev.created_at) < GROUP_WINDOW_MS
              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={message.user.id === currentUserId}
                  isGrouped={isGrouped}
                  isDeleting={deleteMessage.isPending && deleteMessage.variables?.messageId === message.id}
                  onDelete={() => setConfirmDeleteId(message.id)}
                />
              )
            })}
            <TypingIndicator users={typingUsers} />
          </div>
        )}
      </div>

      {timing.isPast ? (
        <div className="p-4 bg-gradient-to-b from-gray-50 to-gray-100/50 border-t border-gray-300/60 flex-shrink-0">
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl border-2 border-gray-300/60 p-3 text-gray-500 text-sm">
            <FontAwesomeIcon icon={faInfoCircle} className="w-4 h-4" />
            <span>This event has ended. Chat is now read-only. You can still view message history.</span>
          </div>
        </div>
      ) : (
        <Composer onSend={sendMessage} onTyping={notifyTyping} />
      )}

      <ConfirmDialog
        open={confirmDeleteId != null}
        title="Delete Message"
        description="Are you sure you want to delete this message?"
        confirmLabel="Delete Message"
        busy={deleteMessage.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </Card>
  )
}
