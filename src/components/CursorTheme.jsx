import { useEffect } from 'react'
import { cursorThemeOf, cursorValue } from '../lib/cursors'

/**
 * Applies a cursor theme to the public page.
 *
 * CSS can't animate `cursor`, so one timer advances every animated role and
 * writes a custom property only when that role's frame actually changes —
 * the stylesheet reads the property, so no rules are rewritten per tick.
 * Frames are preloaded first, otherwise the first swap flashes the fallback.
 */
export default function CursorTheme({ theme }) {
  useEffect(() => {
    const t = cursorThemeOf(theme)
    if (!t?.roles) return

    const root = document.documentElement
    const roles = Object.entries(t.roles)

    // preload so swapping frames never shows a gap
    const preloaded = roles.flatMap(([, r]) =>
      r.frames.map((src) => {
        const img = new Image()
        img.src = src
        return img
      })
    )

    for (const [name, r] of roles) root.style.setProperty(`--cur-${name}`, cursorValue(r, 0))
    document.body.classList.add('has-cursor-theme')

    const animated = roles.filter(([, r]) => r.frames.length > 1 && r.rate > 0)
    let timer = 0
    if (animated.length) {
      const shown = new Map(animated.map(([n]) => [n, 0]))
      const start = performance.now()
      timer = setInterval(() => {
        const dt = performance.now() - start
        for (const [name, r] of animated) {
          const idx = Math.floor(dt / r.rate) % r.frames.length
          if (shown.get(name) !== idx) {
            shown.set(name, idx)
            root.style.setProperty(`--cur-${name}`, cursorValue(r, idx))
          }
        }
      }, 50)
    }

    return () => {
      clearInterval(timer)
      document.body.classList.remove('has-cursor-theme')
      for (const [name] of roles) root.style.removeProperty(`--cur-${name}`)
      preloaded.length = 0
    }
  }, [theme])

  return null
}
