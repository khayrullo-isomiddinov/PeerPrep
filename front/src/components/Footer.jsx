export default function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-700 py-6 mt-12">
      <div className="max-w-6xl mx-auto px-4 text-center text-sm text-slate-600 dark:text-slate-400">
        © {new Date().getFullYear()} StudyHub. Built for learners, by learners.
      </div>
    </footer>
  )
}
