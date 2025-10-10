export default function PillTabs({ tabs, value, onChange }) {
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white/10 ring-1 ring-white/10 backdrop-blur">
      {tabs.map(t => (
        <button
          key={t.value}
          onClick={() => onChange?.(t.value)}
          className={`px-3 py-1.5 text-sm font-medium rounded-full transition ${
            value === t.value
              ? "bg-white text-black shadow"
              : "text-white/80 hover:text-white"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}


