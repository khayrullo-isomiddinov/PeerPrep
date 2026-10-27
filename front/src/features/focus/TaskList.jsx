import { useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPlus, faXmark, faCheck, faBullseye } from "@fortawesome/free-solid-svg-icons"
import Card from "../../components/ui/Card"
import Button from "../../components/ui/Button"
import { controlClasses } from "../../components/ui/fieldStyles"
import { MAX_TASKS, MAX_TASK_LENGTH } from "./focusStore"
import { useFocus } from "./useFocus"

// Today's plan: a short checklist. One task can be "current"; the timer shows it.
export default function TaskList() {
  const { tasks, currentTaskId, actions } = useFocus()
  const [text, setText] = useState("")
  const done = tasks.filter((t) => t.done).length
  const full = tasks.length >= MAX_TASKS

  function add(e) {
    e.preventDefault()
    if (!text.trim() || full) return
    actions.addTask(text)
    setText("")
  }

  return (
    <Card padded={false}>
      <div className="flex items-baseline justify-between gap-3 px-5 pt-5 sm:px-6">
        <div>
          <h2 className="text-lg font-semibold text-fg">Today&apos;s plan</h2>
          <p className="mt-0.5 text-sm text-fg-muted">
            {tasks.length === 0 ? "Break the work into small steps you can finish." : `${done} of ${tasks.length} done`}
          </p>
        </div>
        {done > 0 && (
          <button type="button" onClick={actions.clearDone} className="shrink-0 text-xs font-semibold text-accent-text hover:underline">
            Clear done
          </button>
        )}
      </div>

      <form onSubmit={add} className="flex gap-2 px-5 pt-4 sm:px-6">
        <label htmlFor="new-task" className="sr-only">New task</label>
        <input
          id="new-task"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_TASK_LENGTH}
          disabled={full}
          placeholder={full ? `Up to ${MAX_TASKS} tasks` : "e.g. Past paper 2023, questions 1–5"}
          className={`${controlClasses} h-10 min-w-0 flex-1 pointer-coarse:h-11`}
          autoComplete="off"
        />
        <Button type="submit" variant="secondary" disabled={!text.trim() || full}>
          <FontAwesomeIcon icon={faPlus} />
          <span className="hidden sm:inline">Add</span>
          <span className="sr-only sm:hidden">Add task</span>
        </Button>
      </form>

      {tasks.length > 0 ? (
        <ul className="mt-3 px-2 pb-3 sm:px-3">
          {tasks.map((task) => {
            const current = task.id === currentTaskId
            return (
              <li key={task.id} className={`group flex items-center gap-1 rounded-lg ${current ? "bg-surface-2" : ""}`}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={task.done}
                  aria-label={task.text}
                  onClick={() => actions.toggleTask(task.id)}
                  className="grid size-10 shrink-0 place-items-center rounded-md"
                >
                  <span className={`grid size-5 place-items-center rounded border text-[0.6rem] transition-colors ${
                    task.done ? "border-fg bg-fg text-canvas" : "border-line-strong group-hover:border-fg-subtle"
                  }`}>
                    {task.done && <FontAwesomeIcon icon={faCheck} />}
                  </span>
                </button>
                <span className={`min-w-0 flex-1 break-words py-2 text-sm ${task.done ? "text-fg-subtle line-through decoration-fg-subtle/60" : "text-fg"}`}>
                  {task.text}
                  {current && <span className="label ml-2 text-fg-subtle">Now</span>}
                </span>
                {!task.done && (
                  <button
                    type="button"
                    onClick={() => actions.setCurrentTask(task.id)}
                    aria-pressed={current}
                    aria-label={`Work on “${task.text}” now`}
                    title={current ? "Current task" : "Work on this now"}
                    className={`grid size-10 shrink-0 place-items-center rounded-md text-sm transition-colors ${
                      current ? "text-fg" : "text-fg-subtle hover:text-fg"
                    }`}
                  >
                    <FontAwesomeIcon icon={faBullseye} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => actions.removeTask(task.id)}
                  aria-label={`Remove “${task.text}”`}
                  className="grid size-10 shrink-0 place-items-center rounded-md text-fg-subtle hover:text-danger"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="h-5" />
      )}
      <p className="border-t border-line px-5 py-3 text-xs text-fg-subtle sm:px-6">Saved in this browser only. Nothing here is sent to PeerPrep.</p>
    </Card>
  )
}
