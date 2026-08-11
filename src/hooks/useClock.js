import { useEffect, useMemo, useState } from 'react'

/** The visitor's own zone, used when the owner hasn't picked one. */
export function localZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** Every IANA zone the browser knows, with a small fallback for old engines. */
export function allZones() {
  try {
    const list = Intl.supportedValuesOf('timeZone')
    if (list?.length) return list
  } catch {
    /* older browser — fall through */
  }
  return [
    'UTC',
    'America/Los_Angeles',
    'America/Denver',
    'America/Chicago',
    'America/New_York',
    'America/Sao_Paulo',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Moscow',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Shanghai',
    'Asia/Tokyo',
    'Australia/Sydney',
  ]
}

// Building a DateTimeFormat is the expensive part, so keep one per zone.
const offsetFormatters = new Map()
function offsetFormatter(timeZone) {
  let f = offsetFormatters.get(timeZone)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    offsetFormatters.set(timeZone, f)
  }
  return f
}

/**
 * A zone's UTC offset in minutes at a given instant — read the wall clock in
 * that zone, reinterpret it as UTC, and diff. Handles DST because it asks
 * about a specific moment rather than assuming a fixed offset.
 */
export function zoneOffsetMinutes(date, timeZone) {
  try {
    const m = {}
    for (const p of offsetFormatter(timeZone).formatToParts(date)) {
      if (p.type !== 'literal') m[p.type] = p.value
    }
    const asUTC = Date.UTC(
      Number(m.year),
      Number(m.month) - 1,
      Number(m.day),
      Number(m.hour) % 24, // some engines report midnight as 24
      Number(m.minute),
      Number(m.second)
    )
    return Math.round((asUTC - date.getTime()) / 60000)
  } catch {
    return null
  }
}

/** "you're 3h ahead" / "you're 5h 30m behind" / "same time as you". */
export function zoneDiffLabel(ownerZone, at = new Date()) {
  const owner = zoneOffsetMinutes(at, ownerZone || localZone())
  const visitor = zoneOffsetMinutes(at, localZone())
  if (owner == null || visitor == null) return ''
  const diff = visitor - owner // positive => the visitor is ahead of the owner
  if (diff === 0) return 'same time as you'
  const abs = Math.abs(diff)
  const h = Math.floor(abs / 60)
  const min = abs % 60
  // half-hour and 45-minute zones are real (India, Nepal, Chatham)
  const amount = min ? (h ? `${h}h ${min}m` : `${min}m`) : `${h}h`
  return `you're ${amount} ${diff > 0 ? 'ahead' : 'behind'}`
}

/** How far the visitor's own clock sits from the owner's. */
export function useZoneDiff(ownerZone, enabled) {
  const [label, setLabel] = useState('')

  useEffect(() => {
    if (!enabled) {
      setLabel('')
      return
    }
    const update = () => setLabel(zoneDiffLabel(ownerZone))
    update()
    // Recheck each minute so a DST flip on either side is picked up.
    const id = setInterval(update, 60000)
    return () => clearInterval(id)
  }, [ownerZone, enabled])

  return label
}

/**
 * A ticking clock in the given IANA timezone. The interval only runs while
 * the clock is actually on screen, and it self-corrects to the top of each
 * second instead of drifting.
 */
export default function useClock(timeZone, enabled, use24h = false) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!enabled) return
    let timer
    const tick = () => {
      setNow(Date.now())
      timer = setTimeout(tick, 1000 - (Date.now() % 1000))
    }
    timer = setTimeout(tick, 1000 - (Date.now() % 1000))
    return () => clearTimeout(timer)
  }, [enabled])

  const formatter = useMemo(() => {
    const opts = {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: !use24h,
    }
    // An invalid/unknown zone throws — fall back rather than crash the page.
    try {
      return new Intl.DateTimeFormat(undefined, { ...opts, timeZone: timeZone || localZone() })
    } catch {
      try {
        return new Intl.DateTimeFormat(undefined, opts)
      } catch {
        return null
      }
    }
  }, [timeZone, use24h])

  if (!enabled || !formatter) return ''
  return formatter.format(now)
}
