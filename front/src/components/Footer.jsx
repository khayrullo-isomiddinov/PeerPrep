export default function Footer() {
  return (
    <footer className="footer">
      <div className="container-page text-center">
        <div className="text-muted text-sm premium-hover inline-flex items-center gap-2">
          © {new Date().getFullYear()} <span className="premium-text-primary font-semibold">PeerPrep</span> — Built for learners, by learners.
        </div>
      </div>
    </footer>
  )
}
