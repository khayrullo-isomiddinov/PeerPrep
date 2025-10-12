import { useEffect, useState } from "react"
import CreateGroupForm from "../features/groups/CreateGroupForm"
import GroupList from "../features/groups/GroupList"
import { listGroups, createGroup } from "../utils/api"

export default function Groups() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    loadGroups()
  }, [])

  async function loadGroups() {
    try {
      setLoading(true)
      const data = await listGroups()
      setGroups(data)
      setError("")
    } catch (err) {
      console.error("Failed to load groups:", err)
      setError("Failed to load groups")
      setGroups([])
    } finally {
      setLoading(false)
    }
  }

  async function addGroup(newGroup) {
    try {
      const data = await createGroup(newGroup)
      setGroups([data, ...groups])
      return data
    } catch (err) {
      console.error("Failed to create group:", err)
      throw err // Re-throw so the form can handle the error
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Study Groups</h1>
              <p className="text-gray-600">
                Join existing groups or create your own to study together
              </p>
            </div>
            <button
              onClick={loadGroups}
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{loading ? "Loading..." : "Refresh"}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Loading groups...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Create Group Section */}
            <section>
              <CreateGroupForm addGroup={addGroup} />
            </section>

            {/* Groups List Section */}
            <section>
              <GroupList groups={groups} setGroups={setGroups} />
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
