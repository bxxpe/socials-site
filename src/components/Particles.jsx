import { useEffect, useRef } from 'react'

const GLYPHS = 'ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ0123456789'
const CELL = 18

/**
 * Animated background field: dust, snow, rain, or matrix rain.
 *
 * Everything is blitted from pre-rendered offscreen canvases — one radial
 * glow sprite for dust/snow, one streak sprite for rain, one glyph atlas for
 * matrix — so no gradients, text layout, or shadowBlur happen per frame. That
 * keeps all four at 60fps on weak GPUs. rAF pauses itself when the tab hides.
 */
export default function Particles({ accent = '#a855f7', enabled = true, variant = 'dust' }) {
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
    let columns = []
    const mouse = { x: 0.5, y: 0.5 }

    // --- pre-rendered sprites -------------------------------------------
    const glow = document.createElement('canvas')
    glow.width = glow.height = 64
    {
      const s = glow.getContext('2d')
      const g = s.createRadialGradient(32, 32, 0, 32, 32, 32)
      g.addColorStop(0, '#ffffff')
      g.addColorStop(0.2, variant === 'snow' ? '#dbeafe' : accent)
      g.addColorStop(1, `${variant === 'snow' ? '#dbeafe' : accent}00`)
      s.fillStyle = g
      s.fillRect(0, 0, 64, 64)
    }

    const streak = document.createElement('canvas')
    streak.width = 4
    streak.height = 48
    {
      const s = streak.getContext('2d')
      const g = s.createLinearGradient(0, 0, 0, 48)
      g.addColorStop(0, `${accent}00`)
      g.addColorStop(1, accent)
      s.fillStyle = g
      s.fillRect(1, 0, 2, 48)
    }

    // glyph atlas: every character rendered once, then blitted as an image
    const atlas = document.createElement('canvas')
    const chars = [...GLYPHS]
    atlas.width = CELL * chars.length
    atlas.height = CELL
    {
      const s = atlas.getContext('2d')
      s.font = `${CELL - 4}px ui-monospace, Menlo, monospace`
      s.textBaseline = 'middle'
      s.textAlign = 'center'
      s.fillStyle = accent
      chars.forEach((c, i) => s.fillText(c, i * CELL + CELL / 2, CELL / 2))
    }

    // --- population ------------------------------------------------------
    const spawn = () => {
      if (variant === 'matrix') {
        const cols = Math.ceil(w / CELL)
        const rows = Math.ceil(h / CELL)
        columns = Array.from({ length: cols }, () => ({
          // seed heads across the whole screen (and a little above it) so the
          // field is already alive on the first frame instead of raining in
          head: Math.random() * (rows + 30) - 25,
          speed: 6 + Math.random() * 14, // rows per second
          len: 6 + Math.floor(Math.random() * 14),
          glyphs: Array.from({ length: 24 }, () => Math.floor(Math.random() * chars.length)),
        }))
        return
      }
      const density = variant === 'rain' ? 14000 : variant === 'snow' ? 20000 : 22000
      const cap = variant === 'rain' ? 160 : 110
      const n = Math.round(Math.min(cap, Math.max(24, (w * h) / density)))
      parts = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: variant === 'snow' ? 1.2 + Math.random() * 2.6 : 0.7 + Math.random() * 1.9,
        s:
          variant === 'rain'
            ? 420 + Math.random() * 420
            : variant === 'snow'
              ? 14 + Math.random() * 26
              : 7 + Math.random() * 16,
        ph: Math.random() * Math.PI * 2,
        d: 0.3 + Math.random() * 0.7,
        a: variant === 'rain' ? 0.25 + Math.random() * 0.4 : 0.2 + Math.random() * 0.55,
        len: 20 + Math.random() * 34,
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

    // --- frame -----------------------------------------------------------
    let last = performance.now()
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const t = now / 1000
      ctx.clearRect(0, 0, w, h)

      if (variant === 'matrix') {
        for (let c = 0; c < columns.length; c++) {
          const col = columns[c]
          const prev = Math.floor(col.head)
          col.head += col.speed * dt
          if (Math.floor(col.head) !== prev) {
            col.glyphs.pop()
            col.glyphs.unshift(Math.floor(Math.random() * chars.length))
          }
          const headRow = Math.floor(col.head)
          for (let i = 0; i < col.len; i++) {
            const row = headRow - i
            if (row < 0) continue
            const y = row * CELL
            if (y > h) continue
            ctx.globalAlpha = (1 - i / col.len) * 0.75
            const gi = col.glyphs[i % col.glyphs.length]
            ctx.drawImage(atlas, gi * CELL, 0, CELL, CELL, c * CELL, y, CELL, CELL)
          }
          // once the tail clears the bottom, recycle the column above the top
          if ((headRow - col.len) * CELL > h) {
            col.head = -Math.random() * 25
            col.speed = 6 + Math.random() * 14
            col.len = 6 + Math.floor(Math.random() * 14)
          }
        }
      } else if (variant === 'rain') {
        for (const p of parts) {
          p.y += p.s * dt
          if (p.y > h + p.len) {
            p.y = -p.len
            p.x = Math.random() * w
          }
          ctx.globalAlpha = p.a
          ctx.drawImage(streak, p.x + (mouse.x - 0.5) * 14 * p.d, p.y, 2, p.len)
        }
      } else {
        const sway = variant === 'snow' ? 26 : 10
        for (const p of parts) {
          p.y += (variant === 'snow' ? p.s : -p.s) * p.d * dt
          if (variant === 'snow' && p.y > h + 10) {
            p.y = -10
            p.x = Math.random() * w
          }
          if (variant !== 'snow' && p.y < -10) {
            p.y = h + 10
            p.x = Math.random() * w
          }
          const px = p.x + Math.sin(t * 0.6 + p.ph) * sway + (mouse.x - 0.5) * 28 * p.d
          const py = p.y + (mouse.y - 0.5) * 16 * p.d
          const size = p.r * 8
          ctx.globalAlpha = p.a
          ctx.drawImage(glow, px - size / 2, py - size / 2, size, size)
        }
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
  }, [accent, enabled, variant])

  if (!enabled) return null
  return <canvas ref={ref} className="fx-particles" aria-hidden="true" />
}
