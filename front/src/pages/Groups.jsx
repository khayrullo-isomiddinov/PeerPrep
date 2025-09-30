import { useEffect, useState } from "react"
import CreateGroupForm from "../features/groups/CreateGroupForm"
import GroupList from "../features/groups/GroupList"
import { api } from "../utils/api"

export default function Groups() {
  const [groups, setGroups] = useState([])

  useEffect(() => {
    api.get("groups")
      .then(r => setGroups(r.data))
      .catch(() => setGroups([]))
  }, [])

  async function addGroup(newGroup) {
    try {
      const { data } = await api.post("groups", newGroup)
      setGroups([data, ...groups])
    } catch (err) {
      console.error("Failed to create group:", err?.response?.data || err.message)
    }
  }

  return (
    <div className="space-y-20">
      <section
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 dark:from-purple-800 dark:via-indigo-900 dark:to-blue-900 animate-gradient py-16 px-6 text-center shadow-xl"
        style={{ animationDuration: "20s" }}
      >
        <div
          data-parallax="0.12"
          className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-purple-300/40 blur-3xl dark:bg-purple-500/20 animate-float"
          style={{ animationDuration: "8s" }}
        />
        <div
          data-parallax="0.22"
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-indigo-300/40 blur-3xl dark:bg-indigo-600/20 animate-float"
          style={{ animationDuration: "8s" }}
        />
        <div className="relative z-10 max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white drop-shadow-[0_6px_18px_rgba(0,0,0,0.6)]">
            Find or Create a <span className="text-yellow-200">Study Group</span>
          </h1>
          <p className="mt-4 text-lg text-white/90 leading-relaxed">
            Join forces with peers, prepare for exams, and learn faster together.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6">
        <h2 className="text-2xl font-semibold mb-6">Create a Group</h2>
        <CreateGroupForm addGroup={addGroup} />
      </section>

      <section className="max-w-7xl mx-auto px-6">
        <h2 className="text-2xl font-semibold mb-6">Available Groups</h2>
        <GroupList groups={groups} setGroups={setGroups} />
      </section>
    </div>
  )
}
