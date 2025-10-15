import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import Card from "../components/Card"
import Button from "../components/Button"
import { useAuth } from "../features/auth/AuthContext"

export default function Profile() {
  const { user, isAuthenticated, setUser } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: "",
    email: "",
    bio: "",
    joinedGroups: [],
    upcomingEvents: []
  })

  useEffect(() => {
    if (!isAuthenticated) navigate("/login", { replace: true })
  }, [isAuthenticated, navigate])

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || (user.email ? user.email.split("@")[0] : ""),
        email: user.email || "",
        bio: user.bio || "",
        joinedGroups: user.joinedGroups || [],
        upcomingEvents: user.upcomingEvents || []
      })
    }
  }, [user])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  function handleSave() {
    setUser(prev => ({ ...prev, ...form }))
    setEditing(false)
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-[80vh]">
      <div className="nav-spacer" />
      <section className="container-page section">
        <div className="hero-accent premium-scale-in">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full overflow-hidden outline outline-1 outline-white/15 shadow-2">
                <img
                  className="h-full w-full object-cover"
                  src={`https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(form.email || "user")}`}
                  alt="avatar"
                />
              </div>
              <div>
                <h1 className="premium-heading">{form.name || "New User"}</h1>
                <p className="text-muted">{form.email}</p>
              </div>
            </div>
            <div className="inline-flex items-center gap-2">
              {!editing ? (
                <Button variant="secondary" onClick={() => setEditing(true)}>Edit Profile</Button>
              ) : (
                <div className="inline-flex items-center gap-2">
                  <Button onClick={handleSave}>Save</Button>
                  <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <main className="container-page section space-y-10">
        <Card>
          {!editing ? (
            <div className="space-y-3">
              <div className="text-sm text-muted">About</div>
              <p className="min-h-6">{form.bio || "Add a short bio to let others know you."}</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="field-row">
                <label className="label">Full name</label>
                <input
                  className="input"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Full name"
                />
              </div>
              <div className="field-row">
                <label className="label">Email</label>
                <input
                  className="input"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Email"
                  type="email"
                />
              </div>
              <div className="field-row">
                <label className="label">Bio</label>
                <textarea
                  className="textarea"
                  name="bio"
                  value={form.bio}
                  onChange={handleChange}
                  placeholder="Short bio"
                  rows={4}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button onClick={handleSave}>Save</Button>
                <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </Card>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="surface inset-pad">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-extrabold">Joined Groups</h2>
              <span className="badge">{form.joinedGroups.length}</span>
            </div>
            {form.joinedGroups.length === 0 ? (
              <p className="text-muted">No groups yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {form.joinedGroups.map((g, i) => (
                  <span key={i} className="badge">{g}</span>
                ))}
              </div>
            )}
          </div>

          <div className="surface inset-pad">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-extrabold">Upcoming Events</h2>
              <span className="badge">{form.upcomingEvents.length}</span>
            </div>
            {form.upcomingEvents.length === 0 ? (
              <p className="text-muted">No events yet.</p>
            ) : (
              <ul className="space-y-2">
                {form.upcomingEvents.map((e, i) => (
                  <li key={i} className="premium-card">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{e}</span>
                      <span className="badge">Soon</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
