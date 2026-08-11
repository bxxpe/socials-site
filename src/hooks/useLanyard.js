import { useEffect, useState } from 'react'

/**
 * Live Discord presence over Lanyard's WebSocket (wss://api.lanyard.rest).
 * Subscribes to one user, heartbeats on the server's interval, reconnects
 * with exponential backoff, and tears everything down on unmount.
 */
export default function useLanyard(userId, enabled) {
  const [presence, setPresence] = useState(null)

  useEffect(() => {
    if (!enabled || !userId) {
      setPresence(null)
      return
    }
    let ws
    let heartbeat
    let retryTimer
    let retries = 0
    let closed = false

    const connect = () => {
      ws = new WebSocket('wss://api.lanyard.rest/socket')
      ws.onmessage = (ev) => {
        let msg
        try {
          msg = JSON.parse(ev.data)
        } catch {
          return
        }
        if (msg.op === 1) {
          clearInterval(heartbeat)
          heartbeat = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ op: 3 }))
          }, msg.d.heartbeat_interval)
          ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: userId } }))
        } else if (msg.op === 0 && msg.d && msg.d.discord_status) {
          retries = 0
          setPresence(msg.d)
        }
      }
      ws.onclose = () => {
        clearInterval(heartbeat)
        if (!closed) {
          retryTimer = setTimeout(connect, Math.min(30000, 1000 * 2 ** retries++))
        }
      }
      ws.onerror = () => ws.close()
    }

    connect()
    return () => {
      closed = true
      clearInterval(heartbeat)
      clearTimeout(retryTimer)
      try {
        ws?.close()
      } catch {
        /* already closed */
      }
    }
  }, [userId, enabled])

  return presence
}
