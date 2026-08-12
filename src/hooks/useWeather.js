import { useEffect, useState } from 'react'
import { fetchWeather } from '../lib/weather'

const TTL = 15 * 60 * 1000 // Open-Meteo updates every 15 min; don't hammer it
const KEY = 'socials.weather'

/** Current conditions for a fixed lat/lon, cached in sessionStorage. */
export default function useWeather(lat, lon, unit, enabled) {
  const [weather, setWeather] = useState(null)

  useEffect(() => {
    if (!enabled || lat == null || lon == null || lat === '' || lon === '') {
      setWeather(null)
      return
    }
    let alive = true
    const cacheKey = `${KEY}:${lat},${lon},${unit}`

    try {
      const raw = sessionStorage.getItem(cacheKey)
      if (raw) {
        const c = JSON.parse(raw)
        if (Date.now() - c.at < TTL) {
          setWeather(c.data)
          return
        }
      }
    } catch {
      /* bad cache entry — just refetch */
    }

    fetchWeather(lat, lon, unit)
      .then((data) => {
        if (!alive) return
        setWeather(data)
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), data }))
        } catch {
          /* storage full or blocked — the chip still works, just uncached */
        }
      })
      .catch(() => alive && setWeather(null))

    return () => {
      alive = false
    }
  }, [lat, lon, unit, enabled])

  return weather
}
