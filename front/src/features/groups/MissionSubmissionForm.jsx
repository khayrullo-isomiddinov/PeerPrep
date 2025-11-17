import { useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPaperPlane, faLink, faFileText } from "@fortawesome/free-solid-svg-icons"
import { submitMission } from "../../utils/api"

export default function MissionSubmissionForm({ groupId, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    submission_url: "",
    submission_text: ""
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    
    if (!formData.submission_url.trim()) {
      setError("Submission URL is required")
      return
    }

    setLoading(true)
    try {
      await submitMission(groupId, {
        submission_url: formData.submission_url.trim(),
        submission_text: formData.submission_text.trim() || null
      })
      setFormData({ submission_url: "", submission_text: "" })
      if (onSuccess) onSuccess()
    } catch (err) {
      const message = err?.response?.data?.detail || err?.response?.data?.message || "Failed to submit mission"
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          <FontAwesomeIcon icon={faLink} className="mr-2 text-pink-500" />
          Submission URL *
        </label>
        <input
          type="url"
          value={formData.submission_url}
          onChange={e => setFormData({ ...formData, submission_url: e.target.value })}
          placeholder="https://example.com/video or https://drive.google.com/..."
          className="input w-full"
          required
          disabled={loading}
        />
        <p className="text-xs text-gray-500 mt-1">Link to your video, document, or proof of completion</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          <FontAwesomeIcon icon={faFileText} className="mr-2 text-pink-500" />
          Description (Optional)
        </label>
        <textarea
          value={formData.submission_text}
          onChange={e => setFormData({ ...formData, submission_text: e.target.value })}
          placeholder="Add any additional context or notes about your submission..."
          className="textarea w-full"
          rows={4}
          maxLength={1000}
          disabled={loading}
        />
        <p className="text-xs text-gray-500 mt-1">{formData.submission_text.length}/1000 characters</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="btn-pink flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FontAwesomeIcon icon={faPaperPlane} />
          <span>{loading ? "Submitting..." : "Submit Mission"}</span>
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}















