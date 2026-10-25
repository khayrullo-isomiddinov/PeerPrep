import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faComments, faPaperPlane, faTrash, faLock } from "@fortawesome/free-solid-svg-icons"
import { getErrorMessage } from "../../../utils/api"
import { formatRelativeTime } from "../../../utils/dates"
import { useDeleteMessage } from "../../../hooks/useEventData"
import ConfirmDialog from "../../../components/ui/ConfirmDialog"
import { useToast } from "../../../components/ui/toastContext"
import Card from "../../../components/ui/Card"
import Avatar from "../../../components/ui/Avatar"
import { EmptyState } from "../../../components/ui/Feedback"

const MAX_MESSAGE_LENGTH = 1000
const GROUP_WINDOW_MS = 5 * 60 * 1000 // consecutive messages from one person within 5 min are grouped

function ConnectionStatus({ timing, connected }) {
  if (timing.isPast) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-subtle">
        <FontAwesomeIcon icon={faLock} className="text-[0.65rem]" />
        Read-only
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${connected ? "text-success" : "text-warning"}`}>
      <span className={`size-1.5 rounded-full ${connected ? "bg-success" : "bg-warning animate-pulse"}`} aria-hidden />
      {connected ? "Live" : "Reconnecting…"}
    </span>
  )
}

function MessageBubble({ message, isOwn, isGrouped, isDeleting, onDelete }) {
  const name = message.user.name || message.user.email || "User"
  return (
    <li className={`group flex gap-2.5 ${isOwn ? "flex-row-reverse" : ""} ${isGrouped ? "mt-1" : "mt-4"}`}>
      {!isOwn && (
        <div className="w-8 shrink-0">
          {!isGrouped && <Avatar name={name} src={message.user.photo_url} id={message.user.id} size="sm" />}
        </div>
      )}
      <div className={`flex min-w-0 max-w-[80%] flex-col sm:max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
        {!isGrouped && (
          <div className={`mb-1 flex items-baseline gap-2 px-1 ${isOwn ? "flex-row-reverse" : ""}`}>
            {!isOwn && <span className="text-xs font-semibold text-fg">{name}</span>}
            <time dateTime={message.created_at} className="text-[0.7rem] text-fg-subtle">{formatRelativeTime(message.created_at)}</time>
          </div>
        )}
        <div className={`flex items-center gap-1.5 ${isOwn ? "flex-row-reverse" : ""}`}>
          <div
            className={`rounded-2xl px-3.5 py-2 text-[0.925rem] leading-relaxed ${
              message.is_deleted
                ? "border border-dashed border-line-strong italic text-fg-subtle"
                : isOwn
                  ? "bg-accent text-accent-fg rounded-br-md"
                  : "bg-surface-2 text-fg rounded-bl-md"
            }`}
          >
            {message.is_deleted ? "Message deleted" : <p className="whitespace-pre-wrap break-words">{message.content}</p>}
          </div>
          {isOwn && !message.is_deleted && (
            <button
              type="button"
              onClick={onDelete}
              disabled={isDeleting}
              aria-label="Delete message"
              className="grid size-7 shrink-0 place-items-center rounded-md text-fg-subtle opacity-0 transition-opacity hover:bg-danger-soft hover:text-danger focus:opacity-100 group-hover:opacity-100 disabled:opacity-50 [@media(hover:none)]:opacity-100"
            >
              {isDeleting ? <span className="size-3 rounded-full border-2 border-current border-t-transparent animate-spin" /> : <FontAwesomeIcon icon={faTrash} className="text-xs" />}
            </button>
          )}
        </div>
      </div>
    </li>
  )
}

function TypingIndicator({ users }) {
  if (users.length === 0) return null
  return (
    <div className="flex items-center gap-2 px-1 pt-3 text-xs text-fg-subtle" aria-live="polite">
      <span className="flex gap-0.5" aria-hidden>
        {[0, 150, 300].map((delay) => (
          <span key={delay} className="size-1.5 rounded-full bg-fg-subtle animate-bounce" style={{ animationDelay: `${delay}ms` }} />
        ))}
      </span>
      {users.length === 1 ? `${users[0].name} is typing…` : `${users.length} people are typing…`}
    </div>
  )
}

function Composer({ onSend, onTyping }) {
  const toast = useToast()
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const inputRef = useRef(null)

  // Grow with the text, up to a few lines
  useLayoutEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`
  }, [text])

  async function send() {
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
      inputRef.current?.focus()
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        send()
      }}
      className="flex items-end gap-2 border-t border-line p-3"
    >
      <label className="sr-only" htmlFor="chat-message">Message</label>
      <textarea
        id="chat-message"
        ref={inputRef}
        rows={1}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          onTyping()
        }}
        onKeyDown={(e) => {
          // Enter sends, Shift+Enter adds a new line
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault()
            send()
          }
        }}
        placeholder="Message the group…"
        maxLength={MAX_MESSAGE_LENGTH}
        className="max-h-36 min-h-11 flex-1 resize-none rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-[0.95rem] text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15"
      />
      <button
        type="submit"
        disabled={!text.trim() || sending}
        aria-label="Send message"
        className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-fg transition-[background-color,opacity] hover:bg-accent-hover disabled:opacity-40"
      >
        {sending ? <span className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin" /> : <FontAwesomeIcon icon={faPaperPlane} />}
      </button>
    </form>
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
    <Card as="section" padded={false} aria-label="Group chat" className="flex h-[min(75dvh,40rem)] min-h-[26rem] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <FontAwesomeIcon icon={faComments} className="text-fg-subtle" />
          <h2 className="font-semibold text-fg">Group chat</h2>
        </div>
        <ConnectionStatus timing={timing} connected={connected} />
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-3">
        {messages.length === 0 ? (
          <EmptyState
            icon={faComments}
            title="No messages yet"
            description={timing.isPast ? "Nobody wrote in this chat." : "Say hi and agree on what to cover in the session."}
            className="h-full justify-center"
          />
        ) : (
          <ol className="pb-1">
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
          </ol>
        )}
        <TypingIndicator users={typingUsers} />
      </div>

      {timing.isPast ? (
        <p className="flex items-center gap-2 border-t border-line px-5 py-4 text-sm text-fg-muted">
          <FontAwesomeIcon icon={faLock} className="text-fg-subtle" />
          This session has ended, so the chat is read-only.
        </p>
      ) : (
        <Composer onSend={sendMessage} onTyping={notifyTyping} />
      )}

      <ConfirmDialog
        open={confirmDeleteId != null}
        title="Delete this message?"
        description="It will be replaced with “Message deleted” for everyone."
        confirmLabel="Delete message"
        busy={deleteMessage.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </Card>
  )
}
