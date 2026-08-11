import { useEffect, useRef } from 'react'

/**
 * Buttery 3D tilt: pointer sets a target, an rAF loop lerps toward it and
 * writes a single transform. The loop only runs while there is motion left,
 * so an idle card costs nothing.
 */
export default function useTilt(enabled) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let raf = 0
    let tx = 0, ty = 0 // target deg
    let cx = 0, cy = 0 // current deg
    let hover = false

    const loop = () => {
      cx += (tx - cx) * 0.12
      cy += (ty - cy) * 0.12
      el.style.transform = `perspective(900px) rotateX(${cy.toFixed(3)}deg) rotateY(${cx.toFixed(3)}deg)`
      if (!hover && Math.abs(cx) < 0.01 && Math.abs(cy) < 0.01) {
        el.style.transform = ''
        raf = 0
        return
      }
      raf = requestAnimationFrame(loop)
    }
    const start = () => {
      if (!raf) raf = requestAnimationFrame(loop)
    }

    const move = (e) => {
      if (e.pointerType === 'touch') return
      const r = el.getBoundingClientRect()
      const px = (e.clientX - r.left) / r.width
      const py = (e.clientY - r.top) / r.height
      hover = true
      tx = (px - 0.5) * 12
      ty = (0.5 - py) * 12
      el.style.setProperty('--px', `${(px * 100).toFixed(2)}%`)
      el.style.setProperty('--py', `${(py * 100).toFixed(2)}%`)
      start()
    }
    const leave = () => {
      hover = false
      tx = 0
      ty = 0
      start()
    }

    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
      cancelAnimationFrame(raf)
      el.style.transform = ''
    }
  }, [enabled])

  return ref
}
