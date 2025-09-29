import { useState } from "react"
import Button from "../../components/Button"
import Card from "../../components/Card"

export default function GroupCard({ group, onDelete }) {
  const [joined, setJoined] = useState(false)

  return (
    <Card>
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="text-lg font-semibold">{group.name}</h3>
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            {group.field} {group.exam && `· ${group.exam}`}
          </p>
          {group.description && (
            <p className="mt-2 text-slate-700 dark:text-slate-200">
              {group.description}
            </p>
          )}
        </div>

        <div className="flex justify-between items-center">
          {/* Left side: fake member count */}
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {group.members || Math.floor(Math.random() * 50) + 5} members
          </p>

          {/* Right side: buttons */}
          <div className="flex gap-2">
            <Button
              variant={joined ? "secondary" : "primary"}
              onClick={() => setJoined(!joined)}
            >
              {joined ? "Leave Group" : "Join Group"}
            </Button>
            <Button variant="secondary" onClick={onDelete}>
              Delete
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
