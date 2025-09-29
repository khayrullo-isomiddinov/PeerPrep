import { useEffect } from "react"

export default function ScrollReveal({ children, as: Tag = "div", className = "" }) {
  useEffect(() => {
    const els = document.querySelectorAll("[data-reveal]")
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("reveal-in")
        })
      },
      { threshold: 0.15 }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <Tag className={className} data-reveal="">
      {children}
    </Tag>
  )
}
