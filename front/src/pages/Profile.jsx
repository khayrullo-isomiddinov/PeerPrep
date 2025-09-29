import { useState } from "react"
import Card from "../components/Card"
import Button from "../components/Button"

export default function Profile() {
  const [user, setUser] = useState({
    name: "Jane Doe",
    email: "jane@example.com",
    bio: "CS student passionate about AI & algorithms. Always looking for peers to study with.",
    joinedGroups: ["Algorithms Study Group", "React Learners"],
    upcomingEvents: ["DP Workshop", "Midterm Review Session"],
  })
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(user)

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }
  function handleSave() {
    setUser(form)
    setEditing(false)
  }

  return (
    <div className="space-y-20">
      {/* HEAVY Hero */}
      <section
        className="relative overflow-hidden rounded-3xl
                   bg-gradient-to-r from-pink-400 via-rose-400 to-red-400
                   dark:from-pink-800 dark:via-rose-900 dark:to-red-900
                   animate-gradient py-16 px-6 text-center shadow-xl"
        style={{ animationDuration: "20s" }}
      >
        <div
          data-parallax="0.10"
          className="absolute -top-24 -right-24 w-80 h-80 rounded-full
                     bg-pink-300/40 blur-3xl dark:bg-pink-500/20 animate-float"
          style={{ animationDuration: "8s" }}
        />
        <div
          data-parallax="0.22"
          className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full
                     bg-rose-300/40 blur-3xl dark:bg-rose-600/20 animate-float"
          style={{ animationDuration: "8s" }}
        />

        <div className="relative z-10 max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white
                         drop-shadow-[0_6px_18px_rgba(0,0,0,0.6)]">
            My <span className="text-yellow-200">Profile</span>
          </h1>
          <p className="mt-4 text-lg text-white/90 leading-relaxed">
            Manage your personal info, groups, and events all in one place.
          </p>
        </div>
      </section>

      {/* Profile info */}
      <section className="max-w-4xl mx-auto px-6">
        <Card>
          {!editing ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-semibold">{user.name}</h2>
                <p className="text-[--color-text-light]/80 dark:text-[--color-text-dark]/80">
                  {user.email}
                </p>
              </div>
              <p>{user.bio}</p>
              <Button variant="secondary" onClick={() => setEditing(true)}>Edit Profile</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <input className="input" name="name" value={form.name} onChange={handleChange} />
              <input className="input" name="email" value={form.email} onChange={handleChange} />
              <textarea className="textarea" name="bio" value={form.bio} onChange={handleChange} />
              <div className="flex gap-2">
                <Button onClick={handleSave}>Save</Button>
                <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </Card>
      </section>

      {/* Joined & Events */}
      <section className="max-w-7xl mx-auto px-6">
        <h2 className="text-2xl font-semibold mb-6">Joined Groups</h2>
        <Card>
          {user.joinedGroups.length === 0 ? (
            <p className="text-[--color-text-light]/80 dark:text-[--color-text-dark]/80">No groups yet.</p>
          ) : (
            <ul className="list-disc pl-5 space-y-2">
              {user.joinedGroups.map((g, i) => <li key={i}>{g}</li>)}
            </ul>
          )}
        </Card>
      </section>

      <section className="max-w-7xl mx-auto px-6">
        <h2 className="text-2xl font-semibold mb-6">Upcoming Events</h2>
        <Card>
          {user.upcomingEvents.length === 0 ? (
            <p className="text-[--color-text-light]/80 dark:text-[--color-text-dark]/80">No events yet.</p>
          ) : (
            <ul className="list-disc pl-5 space-y-2">
              {user.upcomingEvents.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </Card>
      </section>
    </div>
  )
}
