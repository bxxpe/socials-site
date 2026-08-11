import { useEffect, useState } from 'react'

export default function useTypewriter(text, enabled) {
  const [out, setOut] = useState(enabled ? '' : text)

  useEffect(() => {
    if (!enabled) {
      setOut(text)
      return
    }
    let i = 0
    let timer
    setOut('')
    const step = () => {
      i += 1
      setOut(text.slice(0, i))
      if (i < text.length) timer = setTimeout(step, 24 + Math.random() * 46)
    }
    timer = setTimeout(step, 420)
    return () => clearTimeout(timer)
  }, [text, enabled])

  return out
}
