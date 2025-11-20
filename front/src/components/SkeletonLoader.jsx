
export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50/30">
      <div className="nav-spacer" />
      <div className="container-page py-8">
        <div className="animate-pulse space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div className="h-8 bg-gray-200 rounded-lg w-48" />
            <div className="h-10 bg-gray-200 rounded-lg w-32" />
          </div>
          
          {/* Search bar skeleton */}
          <div className="h-12 bg-gray-200 rounded-xl w-full" />
          
          {/* Cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-xl border border-gray-200/60 overflow-hidden">
                <div className="h-52 bg-gray-200" />
                <div className="p-6 space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-5/6" />
                  <div className="flex items-center gap-4 mt-4">
                    <div className="h-4 bg-gray-200 rounded w-20" />
                    <div className="h-4 bg-gray-200 rounded w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function DetailPageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50/30">
      <div className="nav-spacer" />
      <div className="container-page py-8">
        <div className="space-y-6">
          {/* Back button skeleton */}
          <div className="h-10 skeleton-shimmer rounded-lg w-24" />
          
          {/* Header skeleton */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200/60 p-6 lg:p-8">
            <div className="h-10 skeleton-shimmer rounded-lg w-3/4 mb-4" />
            <div className="h-6 skeleton-shimmer rounded w-1/2 mb-6" />
            <div className="flex gap-4">
              <div className="h-10 skeleton-shimmer rounded-lg w-32" />
              <div className="h-10 skeleton-shimmer rounded-lg w-32" />
            </div>
          </div>
          
          {/* Content skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200/60 p-6">
                <div className="h-6 skeleton-shimmer rounded w-1/4 mb-4" />
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-4 skeleton-shimmer rounded w-full" />
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200/60 p-6">
                <div className="h-6 skeleton-shimmer rounded w-1/3 mb-4" />
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 skeleton-shimmer rounded-lg" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

