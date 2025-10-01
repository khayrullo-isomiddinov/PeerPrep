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
    setForm(prev => ({ ...prev, [name]: value }))
  }
  function handleSave() {
    setUser(form)
    setEditing(false)
  }

  return (
    <div className="space-y-20">
      <section
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-pink-400 via-rose-400 to-red-400 dark:from-pink-800 dark:via-rose-900 dark:to-red-900 py-16 px-6 text-center shadow-xl"
        style={{ animationDuration: "20s" }}
      >
        <div
          data-parallax="0.10"
          className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-pink-300/40 blur-3xl dark:bg-pink-500/20"
          style={{ animationDuration: "8s" }}
        />
        <div
          data-parallax="0.22"
          className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-rose-300/40 blur-3xl dark:bg-rose-600/20"
          style={{ animationDuration: "8s" }}
        />

        <div className="relative z-10 max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white drop-shadow-[0_6px_18px_rgba(0,0,0,0.6)]">
            My <span className="text-yellow-200">Profile</span>
          </h1>
          <p className="mt-4 text-lg text-white/90 leading-relaxed">
            Manage your personal info, groups, and events all in one place.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6">
        <Card>
          {!editing ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-semibold">{user.name}</h2>
                <p className="text-[--color-text-light]/80 dark:text-[--color-text-dark]/80">{user.email}</p>
              </div>
              <p>{user.bio}</p>
              <Button variant="secondary" onClick={() => setEditing(true)}>Edit Profile</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <input
                className="w-full block rounded-xl border border-slate-300/60 dark:border-white/10 bg-white/90 dark:bg-white/5 px-4 py-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/60"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Full name"
              />
              <input
                className="w-full block rounded-xl border border-slate-300/60 dark:border-white/10 bg-white/90 dark:bg-white/5 px-4 py-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/60"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Email"
                type="email"
              />
              <textarea
                className="w-full block rounded-xl border border-slate-300/60 dark:border-white/10 bg-white/90 dark:bg-white/5 px-4 py-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/60 min-h-[120px]"
                name="bio"
                value={form.bio}
                onChange={handleChange}
                placeholder="Short bio"
              />
              <div className="flex gap-2">
                <Button onClick={handleSave}>Save</Button>
                <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </Card>
      </section>

      <section className="max-w-7xl mx-auto px-6">
        <h2 className="text-2xl font-semibold mb-6">Joined Groups</h2>
        <div className="card bg-base-200/40 shadow-xl border border-white/10">
          <div className="card-body">
            {user.joinedGroups.length === 0 ? (
              <p className="text-muted">No groups yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {user.joinedGroups.map((g, i) => (
                  <span key={i} className="badge badge-outline badge-lg">
                    {g}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6">
        <h2 className="text-2xl font-semibold mb-6">Upcoming Events</h2>
        <div className="card bg-base-200/40 shadow-xl border border-white/10">
          <div className="card-body">
            {user.upcomingEvents.length === 0 ? (
              <p className="text-muted">No events yet.</p>
            ) : (
              <ul className="menu bg-transparent gap-1 p-0">
                {user.upcomingEvents.map((e, i) => (
                  <li key={i} className="rounded-lg">
                    <a className="justify-between rounded-lg hover:bg-base-300/60">
                      <span>{e}</span>
                      <span className="badge">Soon</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
