import { useEffect, useRef } from 'react'

/**
 * Lightweight canvas particle field. One pre-rendered glow sprite gets
 * drawImage'd for every particle — no per-frame gradients, no shadowBlur —
 * so this stays at 60fps even on weak GPUs. rAF pauses automatically when
 * the tab is hidden.
 */
export default function Particles({ accent = '#a855f7', enabled = true }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!enabled) return
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let w = 0
    let h = 0
    let raf = 0
    let parts = []
    const mouse = { x: 0.5, y: 0.5 }

    const sprite = document.createElement('canvas')
    sprite.width = sprite.height = 64
    {
      const s = sprite.getContext('2d')
      const g = s.createRadialGradient(32, 32, 0, 32, 32, 32)
      g.addColorStop(0, '#ffffff')
      g.addColorStop(0.2, accent)
      g.addColorStop(1, `${accent}00`)
      s.fillStyle = g
      s.fillRect(0, 0, 64, 64)
    }

    const spawn = () => {
      const n = Math.round(Math.min(90, Math.max(24, (w * h) / 22000)))
      parts = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.7 + Math.random() * 1.9,
        s: 7 + Math.random() * 16,
        ph: Math.random() * Math.PI * 2,
        d: 0.3 + Math.random() * 0.7,
        a: 0.2 + Math.random() * 0.55,
      }))
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = Math.max(1, Math.round(w * dpr))
      canvas.height = Math.max(1, Math.round(h * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      spawn()
    }

    let last = performance.now()
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const t = now / 1000
      ctx.clearRect(0, 0, w, h)
      for (const p of parts) {
        p.y -= p.s * p.d * dt
        if (p.y < -10) {
          p.y = h + 10
          p.x = Math.random() * w
        }
        const px = p.x + Math.sin(t * 0.6 + p.ph) * 10 + (mouse.x - 0.5) * 28 * p.d
        const py = p.y + (mouse.y - 0.5) * 16 * p.d
        const size = p.r * 8
        ctx.globalAlpha = p.a
        ctx.drawImage(sprite, px - size / 2, py - size / 2, size, size)
      }
      ctx.globalAlpha = 1
      if (!reduced) raf = requestAnimationFrame(tick)
    }

    const onMove = (e) => {
      if (!w || !h) return
      mouse.x = e.clientX / w
      mouse.y = e.clientY / h
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onMove, { passive: true })
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
    }
  }, [accent, enabled])

  if (!enabled) return null
  return <canvas ref={ref} className="fx-particles" aria-hidden="true" />
}
