export function initParallax() {
  const nodes = Array.from(document.querySelectorAll("[data-parallax]"))

  function update() {
    const y = window.scrollY || 0
    nodes.forEach((el) => {
      const speed = parseFloat(el.dataset.parallax || "0.2")
      el.style.transform = `translateY(${y * speed}px)`
    })
  }

  window.addEventListener("scroll", update, { passive: true })
  update()
}
