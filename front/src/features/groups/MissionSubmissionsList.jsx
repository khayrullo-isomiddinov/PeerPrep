import { useState, useEffect } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCheck, faTimes, faTrash, faStar, faUser } from "@fortawesome/free-solid-svg-icons"
import { getGroupMissions, getMyMissions, reviewMission, deleteMission } from "../../utils/api"
import { useAuth } from "../auth/AuthContext"
import MissionSubmissionForm from "./MissionSubmissionForm"

export default function MissionSubmissionsList({ groupId, isLeader = false }) {
  const [submissions, setSubmissions] = useState([])
  const [mySubmissions, setMySubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [reviewing, setReviewing] = useState(null)
  const [reviewData, setReviewData] = useState({ score: "", feedback: "" })
  const { user } = useAuth()

  useEffect(() => {
    loadSubmissions()
  }, [groupId, user?.id])

  async function loadSubmissions() {
    try {
      setLoading(true)
      setError("")
      const [all, my] = await Promise.all([
        getGroupMissions(groupId).catch(err => {
          console.error("Failed to load group missions:", err)
          return []
        }),
        user ? getMyMissions(groupId).catch(err => {
          console.error("Failed to load my missions:", err)
          return []
        }) : Promise.resolve([])
      ])
      setSubmissions(all || [])
      setMySubmissions(my || [])
      console.log("Loaded submissions:", { all: all?.length || 0, my: my?.length || 0 })
    } catch (err) {
      console.error("Failed to load submissions:", err)
      setError("Failed to load submissions. Please refresh the page.")
    } finally {
      setLoading(false)
    }
  }

  async function handleReview(submissionId, approve) {
    try {
      const payload = {
        is_approved: approve,
        score: reviewData.score ? parseInt(reviewData.score) : null,
        feedback: reviewData.feedback.trim() || null
      }
      await reviewMission(groupId, submissionId, payload)
      setReviewing(null)
      setReviewData({ score: "", feedback: "" })
      setTimeout(() => {
        loadSubmissions()
      }, 300)
    } catch (err) {
      const message = err?.response?.data?.detail || "Failed to review submission"
      alert(message)
    }
  }

  async function handleDelete(submissionId) {
    if (!confirm("Are you sure you want to delete this submission?")) return
    try {
      await deleteMission(groupId, submissionId)
      loadSubmissions()
    } catch (err) {
      const message = err?.response?.data?.detail || "Failed to delete submission"
      alert(message)
    }
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const pendingSubmissions = isLeader ? submissions.filter(s => !s.is_approved) : []
  const hasPendingSubmission = mySubmissions.some(s => !s.is_approved)

  if (loading) {
    return (
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-center py-8">
          <div className="mx-auto mb-4 rounded-full h-12 w-12 border-2 border-pink-200 border-t-pink-500 animate-spin" />
          <p className="text-gray-600">Loading submissions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-200 space-y-6">
      <div className="flex items-center justify-between">
        <h5 className="font-semibold text-gray-800 flex items-center gap-2">
          <FontAwesomeIcon icon={faStar} className="text-yellow-500" />
          Mission Submissions
        </h5>
        {!hasPendingSubmission && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-pink text-sm px-4 py-2"
          >
            Submit Mission
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <MissionSubmissionForm
            groupId={groupId}
            onSuccess={() => {
              setShowForm(false)
              loadSubmissions()
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLeader && pendingSubmissions.length > 0 && (
        <div>
          <h6 className="text-sm font-semibold text-gray-700 mb-3">Pending Reviews ({pendingSubmissions.length})</h6>
          <div className="space-y-3">
            {pendingSubmissions.map(submission => (
              <div key={submission.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FontAwesomeIcon icon={faUser} className="text-gray-500" />
                      <span className="font-medium text-gray-800">User ID: {submission.user_id}</span>
                      <span className="text-xs text-gray-500">• {formatDate(submission.submitted_at)}</span>
                    </div>
                    <a
                      href={submission.submission_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-600 hover:text-pink-700 text-sm font-medium"
                    >
                      View Submission →
                    </a>
                    {submission.submission_text && (
                      <p className="text-sm text-gray-700 mt-2">{submission.submission_text}</p>
                    )}
                  </div>
                </div>

                {reviewing === submission.id ? (
                  <div className="space-y-3 bg-white rounded-lg p-3 border border-gray-200">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Score (0-100)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={reviewData.score}
                        onChange={e => setReviewData({ ...reviewData, score: e.target.value })}
                        className="input text-sm"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Feedback</label>
                      <textarea
                        value={reviewData.feedback}
                        onChange={e => setReviewData({ ...reviewData, feedback: e.target.value })}
                        className="textarea text-sm"
                        rows={2}
                        placeholder="Optional feedback..."
                        maxLength={500}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReview(submission.id, true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                      >
                        <FontAwesomeIcon icon={faCheck} />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReview(submission.id, false)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
                      >
                        <FontAwesomeIcon icon={faTimes} />
                        Reject
                      </button>
                      <button
                        onClick={() => {
                          setReviewing(null)
                          setReviewData({ score: "", feedback: "" })
                        }}
                        className="px-3 py-1.5 text-gray-600 text-sm hover:text-gray-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setReviewing(submission.id)}
                    className="btn-pink text-sm px-4 py-2"
                  >
                    Review Submission
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {user && (
        <div>
          <h6 className="text-sm font-semibold text-gray-700 mb-3">
            My Submissions {mySubmissions.length > 0 && `(${mySubmissions.length})`}
          </h6>
          {mySubmissions.length > 0 ? (
            <div className="space-y-3">
              {mySubmissions.map(submission => (
              <div
                key={submission.id}
                className={`border rounded-lg p-4 ${
                  submission.is_approved
                    ? "bg-green-50 border-green-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {submission.is_approved ? (
                        <FontAwesomeIcon icon={faCheck} className="text-green-500" />
                      ) : (
                        <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                      )}
                      <span className="font-medium text-gray-800">
                        {submission.is_approved ? "Approved" : "Pending Review"}
                      </span>
                      {submission.score !== null && (
                        <span className="text-sm text-gray-600">• Score: {submission.score}/100</span>
                      )}
                      <span className="text-xs text-gray-500 ml-auto">• {formatDate(submission.submitted_at)}</span>
                    </div>
                    <a
                      href={submission.submission_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-600 hover:text-pink-700 text-sm font-medium"
                    >
                      View Submission →
                    </a>
                    {submission.submission_text && (
                      <p className="text-sm text-gray-700 mt-2">{submission.submission_text}</p>
                    )}
                    {submission.feedback && (
                      <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                        <p className="text-xs font-medium text-gray-700 mb-1">Feedback:</p>
                        <p className="text-sm text-gray-600">{submission.feedback}</p>
                      </div>
                    )}
                  </div>
                  {!submission.is_approved && (
                    <button
                      onClick={() => handleDelete(submission.id)}
                      className="ml-4 text-red-500 hover:text-red-700"
                      title="Delete submission"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  )}
                </div>
              </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
              <p className="text-sm text-gray-500">You haven't submitted any missions yet.</p>
            </div>
          )}
        </div>
      )}

      {!isLeader && submissions.length > 0 && (
        <div>
          <h6 className="text-sm font-semibold text-gray-700 mb-3">Approved Submissions ({submissions.length})</h6>
          <div className="space-y-2">
            {submissions.map(submission => (
              <div key={submission.id} className="bg-white border border-gray-200 rounded-lg p-3 text-sm">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheck} className="text-green-500" />
                  <span className="text-gray-600">User ID: {submission.user_id}</span>
                  {submission.score !== null && (
                    <span className="text-gray-500">• Score: {submission.score}/100</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!showForm && mySubmissions.length === 0 && (!isLeader || pendingSubmissions.length === 0) && (
        <div className="bg-gray-50 rounded-lg p-6 text-center">
          <FontAwesomeIcon icon={faStar} className="text-gray-300 text-3xl mb-2" />
          <p className="text-sm text-gray-500">No submissions yet. Be the first to submit a mission!</p>
        </div>
      )}
    </div>
  )
}

