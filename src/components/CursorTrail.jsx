import { useEffect, useRef } from 'react'

const HEX = /^#?([0-9a-f]{6})$/i
const normalizeHex = (c) => {
  const m = HEX.exec(c || '')
  return m ? `#${m[1]}` : '#a855f7'
}

// How long a particle/point lives, per style (seconds).
const LIFE = { glow: 0.55, sparkle: 0.9 }
const COMET_MS = 240

/**
 * Cursor trail on a single canvas. Same discipline as Particles.jsx: one
 * pre-baked glow sprite blitted with drawImage (no per-frame gradients, no
 * shadowBlur, no DOM nodes), one rAF loop that *stops itself* the moment the
 * trail has faded, and nothing at all on touch devices or reduced-motion.
 */
export default function CursorTrail({ enabled = true, variant = 'glow', color }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!enabled) return
    const canvas = ref.current
    if (!canvas) return
    // No cursor to trail on touch, and honour reduced-motion.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (window.matchMedia('(pointer: coarse)').matches) return

    const hex = normalizeHex(color)
    const ctx = canvas.getContext('2d')

    let w = 0
    let h = 0
    let raf = 0
    let last = performance.now()

    const sprite = document.createElement('canvas')
    sprite.width = sprite.height = 64
    {
      const s = sprite.getContext('2d')
      const g = s.createRadialGradient(32, 32, 0, 32, 32, 32)
      g.addColorStop(0, '#ffffff')
      g.addColorStop(0.25, hex)
      g.addColorStop(1, `${hex}00`)
      s.fillStyle = g
      s.fillRect(0, 0, 64, 64)
    }

    const parts = [] // glow + sparkle
    const points = [] // comet
    const MAX_PARTS = 300
    const MAX_POINTS = 30

    let cx = 0
    let cy = 0
    let lx = 0
    let ly = 0
    let seeded = false

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const addGlow = (x, y) => {
      if (parts.length >= MAX_PARTS) return
      parts.push({ x, y, life: 1, r: 9 + Math.random() * 8 })
    }

    const addSparkle = (x, y) => {
      if (parts.length >= MAX_PARTS) return
      const a = Math.random() * Math.PI * 2
      const sp = 14 + Math.random() * 60
      parts.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 14,
        grav: 140 + Math.random() * 130,
        life: 1,
        r: 2.5 + Math.random() * 4,
      })
    }

    // Emit along the segment travelled since the last frame so fast flicks
    // draw a continuous trail instead of dotted gaps.
    const emit = (now) => {
      const dx = cx - lx
      const dy = cy - ly
      const dist = Math.hypot(dx, dy)

      if (variant === 'comet') {
        if (dist > 0.6) {
          points.push({ x: cx, y: cy, t: now })
          if (points.length > MAX_POINTS) points.shift()
          lx = cx
          ly = cy
        }
        return
      }

      const step = variant === 'sparkle' ? 10 : 5
      if (dist >= step) {
        const n = Math.min(Math.round(dist / step), 14)
        for (let i = 1; i <= n; i++) {
          const t = i / n
          const x = lx + dx * t
          const y = ly + dy * t
          if (variant === 'sparkle') addSparkle(x, y)
          else addGlow(x, y)
        }
        lx = cx
        ly = cy
      }
    }

    const drawComet = (now) => {
      while (points.length && now - points[0].t > COMET_MS) points.shift()
      if (points.length < 2) return
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = hex
      // two passes: a wide soft body, then a bright core
      for (const pass of [
        { mul: 2.6, alpha: 0.18 },
        { mul: 1, alpha: 0.9 },
      ]) {
        for (let i = 1; i < points.length; i++) {
          const p0 = points[i - 1]
          const p1 = points[i]
          const t = i / points.length
          ctx.globalAlpha = t * pass.alpha
          ctx.lineWidth = (1.2 + t * 6) * pass.mul
          ctx.beginPath()
          ctx.moveTo(p0.x, p0.y)
          ctx.lineTo(p1.x, p1.y)
          ctx.stroke()
        }
      }
      const head = points[points.length - 1]
      ctx.globalAlpha = 0.85
      ctx.drawImage(sprite, head.x - 16, head.y - 16, 32, 32)
    }

    const drawParticles = (dt) => {
      const life = LIFE[variant] || LIFE.glow
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]
        p.life -= dt / life
        if (p.life <= 0) {
          parts.splice(i, 1)
          continue
        }
        if (variant === 'sparkle') {
          p.vy += p.grav * dt
          p.x += p.vx * dt
          p.y += p.vy * dt
        }
        const size = variant === 'glow' ? p.r * p.life * 2.4 : p.r * 2.4
        ctx.globalAlpha = variant === 'sparkle' ? p.life : p.life * 0.6
        ctx.drawImage(sprite, p.x - size / 2, p.y - size / 2, size, size)
      }
    }

    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      emit(now)
      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'lighter'
      if (variant === 'comet') drawComet(now)
      else drawParticles(dt)
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'

      const alive = variant === 'comet' ? points.length > 0 : parts.length > 0
      if (alive) {
        raf = requestAnimationFrame(frame)
      } else {
        // Nothing left to draw — go fully idle until the pointer moves again.
        raf = 0
      }
    }

    const start = () => {
      if (raf) return
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }

    const onMove = (e) => {
      cx = e.clientX
      cy = e.clientY
      if (!seeded) {
        lx = cx
        ly = cy
        seeded = true
      }
      start()
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onMove, { passive: true })

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
    }
  }, [enabled, variant, color])

  if (!enabled) return null
  return <canvas ref={ref} className="fx-trail" aria-hidden="true" />
}
