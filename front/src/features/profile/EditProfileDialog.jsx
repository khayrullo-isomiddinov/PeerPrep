import { useState } from "react"
import Dialog from "../../components/ui/Dialog"
import Button from "../../components/ui/Button"
import Field, { Input, Textarea } from "../../components/ui/Field"

const MAX_NAME = 100
const MAX_BIO = 1000

// Name and bio editor. Mounted only while open, so it always starts from the saved profile.
export default function EditProfileDialog({ user, saving, onSave, onClose }) {
  const [name, setName] = useState(user.name || "")
  const [bio, setBio] = useState(user.bio || "")
  const nameError = name.trim().length > MAX_NAME ? `Keep it under ${MAX_NAME} characters.` : ""
  const bioError = bio.length > MAX_BIO ? `Keep it under ${MAX_BIO} characters.` : ""

  function submit(e) {
    e.preventDefault()
    if (nameError || bioError) return
    onSave({ name: name.trim(), bio: bio.trim() })
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Edit profile"
      description="This is what other students see on your profile and in chats."
      dismissible={!saving}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="edit-profile" loading={saving}>Save changes</Button>
        </>
      }
    >
      <form id="edit-profile" onSubmit={submit} className="space-y-5">
        <Field label="Display name" error={nameError} hint="Your real name helps study partners recognize you.">
          <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="e.g. Alex Kim" />
        </Field>
        <Field
          label="Bio"
          optional
          error={bioError}
          counter={<span className={`text-xs tabular-nums ${bioError ? "text-danger" : "text-fg-subtle"}`}>{bio.length}/{MAX_BIO}</span>}
        >
          <Textarea rows={5} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What you're studying, exams coming up, how you like to learn…" />
        </Field>
      </form>
    </Dialog>
  )
}
