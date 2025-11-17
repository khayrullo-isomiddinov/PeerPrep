import { usePageLoader } from '../utils/usePageLoader'

/**
 * GitHub-style top loading progress bar
 * Shows a thin green progress bar under navbar during page transitions
 */
export default function PageLoader() {
  const { isLoading, progress } = usePageLoader()

  if (!isLoading && progress === 0) return null

  return (
    <div
      className="page-loader"
      style={{
        position: 'fixed',
        top: '64px', // Under navbar
        left: 0,
        right: 0,
        height: '2px',
        zIndex: 9999,
        pointerEvents: 'none',
        transition: progress === 100 ? 'opacity 0.2s ease-out' : 'none',
        opacity: isLoading || progress > 0 ? 1 : 0
      }}
    >
      <div
        className="page-loader-bar"
        style={{
          height: '100%',
          background: 'linear-gradient(90deg, #10b981, #34d399, #10b981)',
          backgroundSize: '200% 100%',
          width: `${progress}%`,
          transition: progress < 100 
            ? 'width 0.1s linear' 
            : 'width 0.2s ease-out, opacity 0.2s ease-out',
          boxShadow: '0 0 8px rgba(16, 185, 129, 0.4)',
          animation: progress > 0 && progress < 100 ? 'shimmer 1.5s infinite' : 'none'
        }}
      />
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  )
}
