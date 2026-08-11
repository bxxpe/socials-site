import { useEffect, useState } from 'react'

/**
 * Looping typewriter: types the text out, holds it, deletes it, and starts
 * over. Timing is per-character setTimeout with a little jitter so it feels
 * human rather than metronomic.
 */
export default function useTypewriter(text, enabled) {
  const [out, setOut] = useState(enabled ? '' : text)

  useEffect(() => {
    if (!enabled) {
      setOut(text)
      return
    }
    let i = 0
    let dir = 1 // 1 = typing, -1 = deleting
    let timer
    setOut('')
    const step = () => {
      i += dir
      setOut(text.slice(0, i))
      if (dir > 0) {
        if (i < text.length) {
          timer = setTimeout(step, 24 + Math.random() * 46)
        } else {
          dir = -1
          timer = setTimeout(step, 2400) // hold the finished line before deleting
        }
      } else if (i > 0) {
        timer = setTimeout(step, 14 + Math.random() * 16)
      } else {
        dir = 1
        timer = setTimeout(step, 650) // brief empty pause before retyping
      }
    }
    timer = setTimeout(step, 420)
    return () => clearTimeout(timer)
  }, [text, enabled])

  return out
}
