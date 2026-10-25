// The white, rounded, shadowed panel used across the app. `padded={false}` for cards with their own header bands.
export default function Card({ as = "section", padded = true, className = "", children, ...props }) {
  const Component = as
  return (
    <Component
      className={`bg-white rounded-2xl shadow-xl border border-gray-200/60 ${padded ? "p-6 lg:p-8" : "overflow-hidden"} ${className}`}
      {...props}
    >
      {children}
    </Component>
  )
}
