import { useEffect, useRef } from 'react'

/**
 * Buttery 3D tilt. Pointer sets a target, an rAF loop lerps toward it and
 * writes one transform plus a handful of CSS variables that the reflection
 * layers read:
 *
 *   --px / --py    cursor position over the card, in %
 *   --rx / --ry    same, normalised to -1..1
 *   --tilt-mag     0..1 distance from centre, for fading effects in
 *   --glare-angle  degrees, so a light streak faces the cursor
 *
 * The loop only runs while there's motion left, so an idle card costs nothing.
 */
export default function useTilt(enabled, strength = 12) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let raf = 0
    let tx = 0
    let ty = 0 // target deg
    let cx = 0
    let cy = 0 // current deg
    let tScale = 1
    let cScale = 1
    let hover = false

    const write = () => {
      el.style.transform =
        `perspective(900px) rotateX(${cy.toFixed(3)}deg) rotateY(${cx.toFixed(3)}deg) ` +
        `scale3d(${cScale.toFixed(4)}, ${cScale.toFixed(4)}, 1)`
      // normalised tilt, handy for the reflection layers
      const nx = strength ? cx / strength : 0
      const ny = strength ? -cy / strength : 0
      el.style.setProperty('--rx', nx.toFixed(4))
      el.style.setProperty('--ry', ny.toFixed(4))
      el.style.setProperty('--tilt-mag', Math.min(1, Math.hypot(nx, ny)).toFixed(4))
      el.style.setProperty('--glare-angle', (Math.atan2(ny, nx) * (180 / Math.PI) + 90).toFixed(2))
    }

    const loop = () => {
      cx += (tx - cx) * 0.12
      cy += (ty - cy) * 0.12
      cScale += (tScale - cScale) * 0.12
      write()
      if (
        !hover &&
        Math.abs(cx) < 0.01 &&
        Math.abs(cy) < 0.01 &&
        Math.abs(cScale - 1) < 0.0005
      ) {
        el.style.transform = ''
        el.style.setProperty('--tilt-mag', '0')
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
      tx = (px - 0.5) * 2 * strength
      ty = (0.5 - py) * 2 * strength
      tScale = 1.02
      el.style.setProperty('--px', `${(px * 100).toFixed(2)}%`)
      el.style.setProperty('--py', `${(py * 100).toFixed(2)}%`)
      start()
    }
    const leave = () => {
      hover = false
      tx = 0
      ty = 0
      tScale = 1
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
  }, [enabled, strength])

  return ref
}
