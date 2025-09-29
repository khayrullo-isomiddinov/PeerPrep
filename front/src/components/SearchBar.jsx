import { useState } from "react"

export default function SearchBar({ onSearch }) {
  const [q, setQ] = useState("")
  const [city, setCity] = useState("")

  function submit(e) {
    e.preventDefault()
    onSearch?.({ q: q.trim(), city: city.trim() })
  }

  return (
    <form
      onSubmit={submit}
      className="hidden lg:flex items-center gap-2"
      role="search"
      aria-label="Search events"
    >
      <div
        className="flex items-center w-[360px] max-w-[50vw]
                   rounded-full border border-slate-200/70 dark:border-slate-700/70
                   bg-slate-50/90 dark:bg-slate-800/80 backdrop-blur
                   shadow-sm hover:shadow-md transition-all duration-200"
      >
        {/* query */}
        <div className="flex items-center flex-1 px-2 py-1">
          <svg width="14" height="14" viewBox="0 0 24 24" className="text-slate-500 dark:text-slate-400">
            <path fill="currentColor" d="m21.53 20.47l-3.66-3.66A8.46 8.46 0 1 0 18.8 19l3.66 3.66zM4 10.5A6.5 6.5 0 1 1 10.5 17A6.51 6.51 0 0 1 4 10.5"/>
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search..."
            className="ml-2 w-full bg-transparent outline-none text-xs
                       placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>

        {/* divider */}
        <div className="h-3.5 w-px bg-slate-300/50 dark:bg-slate-600/50" />

        {/* location */}
        <div className="flex items-center px-2 py-1">
          <svg width="14" height="14" viewBox="0 0 24 24" className="text-slate-500 dark:text-slate-400">
            <path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7m0 9.5A2.5 2.5 0 1 1 14.5 9A2.5 2.5 0 0 1 12 11.5"/>
          </svg>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            className="ml-2 w-[100px] bg-transparent outline-none text-xs
                       placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>

        {/* submit */}
        <button
          type="submit"
          aria-label="Search"
          className="m-1 mr-2 inline-flex items-center justify-center
                     h-7 w-7 rounded-full shrink-0
                     bg-indigo-600 hover:bg-indigo-700 text-white
                     shadow-sm active:scale-95 transition"
        >
          <svg width="12" height="12" viewBox="0 0 24 24">
            <path fill="currentColor" d="m21.53 20.47l-3.66-3.66A8.46 8.46 0 1 0 18.8 19l3.66 3.66zM4 10.5A6.5 6.5 0 1 1 10.5 17A6.51 6.51 0 0 1 4 10.5"/>
          </svg>
        </button>
      </div>
    </form>
  )
}
