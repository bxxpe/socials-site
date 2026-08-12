/**
 * Weather via Open-Meteo — free, no API key, no signup, CORS-enabled.
 * Geocoding and forecast are separate endpoints from the same service.
 */

// WMO weather interpretation codes -> label + day/night glyph
const WMO = [
  [[0], 'clear', '☀️', '🌙'],
  [[1], 'mostly clear', '🌤️', '🌙'],
  [[2], 'partly cloudy', '⛅', '☁️'],
  [[3], 'overcast', '☁️', '☁️'],
  [[45, 48], 'foggy', '🌫️', '🌫️'],
  [[51, 53, 55, 56, 57], 'drizzle', '🌦️', '🌦️'],
  [[61, 63, 65, 66, 67], 'rain', '🌧️', '🌧️'],
  [[71, 73, 75, 77], 'snow', '🌨️', '🌨️'],
  [[80, 81, 82], 'showers', '🌦️', '🌧️'],
  [[85, 86], 'snow showers', '🌨️', '🌨️'],
  [[95, 96, 99], 'thunderstorm', '⛈️', '⛈️'],
]

export function describeWeather(code, isDay = 1) {
  const hit = WMO.find(([codes]) => codes.includes(Number(code)))
  if (!hit) return { label: 'unknown', glyph: '🌡️' }
  return { label: hit[1], glyph: isDay ? hit[2] : hit[3] }
}

/** City name -> coordinates. Returns up to `count` matches for a picker. */
export async function geocode(query, count = 5) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    query
  )}&count=${count}&language=en&format=json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`geocoding failed (${res.status})`)
  const json = await res.json()
  return (json.results || []).map((r) => ({
    place: [r.name, r.admin1, r.country_code].filter(Boolean).join(', '),
    lat: r.latitude,
    lon: r.longitude,
    timezone: r.timezone,
  }))
}

export async function fetchWeather(lat, lon, unit = 'f') {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weather_code,is_day&temperature_unit=${
      unit === 'c' ? 'celsius' : 'fahrenheit'
    }`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`weather failed (${res.status})`)
  const json = await res.json()
  const c = json.current
  if (!c) throw new Error('no current weather')
  return {
    temp: Math.round(c.temperature_2m),
    unit: unit === 'c' ? '°C' : '°F',
    ...describeWeather(c.weather_code, c.is_day),
  }
}
