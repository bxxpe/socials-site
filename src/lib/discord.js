import { newId } from './defaults'

export const STATUS_COLORS = {
  online: '#23a55a',
  idle: '#f0b232',
  dnd: '#f23f43',
  offline: '#80848e',
}

export const STATUS_LABELS = {
  online: 'online',
  idle: 'idle',
  dnd: 'do not disturb',
  offline: 'offline',
}

export const ACTIVITY_VERBS = { 0: 'playing', 1: 'streaming', 2: 'listening to', 3: 'watching', 5: 'competing in' }

/**
 * Implicit-grant OAuth: the token comes back in the URL fragment, so no
 * client secret and no backend are needed. We use it once to read the user's
 * id/name/avatar, then throw it away.
 */
export function discordAuthorizeUrl(clientId) {
  const state = newId() + newId()
  sessionStorage.setItem('socials.discord-state', state)
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${window.location.origin}/discord/callback`,
    response_type: 'token',
    scope: 'identify',
    state,
  })
  return `https://discord.com/oauth2/authorize?${params}`
}

export async function fetchDiscordUser(token) {
  const res = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`discord api error (${res.status})`)
  return res.json()
}

export function discordAvatarUrl(userId, hash, size = 128) {
  if (!userId) return ''
  if (!hash) {
    let idx = 0
    try {
      idx = Number((BigInt(userId) >> 22n) % 6n)
    } catch {
      /* non-numeric id — just use the first default avatar */
    }
    return `https://cdn.discordapp.com/embed/avatars/${idx}.png`
  }
  const ext = hash.startsWith('a_') ? 'gif' : 'png'
  return `https://cdn.discordapp.com/avatars/${userId}/${hash}.${ext}?size=${size}`
}

/**
 * Avatar decorations (the animated frames around avatars). passthrough=true
 * serves the original APNG so animated ones actually animate in an <img>.
 */
export function decorationUrl(asset) {
  return asset ? `https://cdn.discordapp.com/avatar-decoration-presets/${asset}.png?passthrough=true` : ''
}

/**
 * Nameplate collectibles. The user object carries an asset path like
 * "nameplates/nameplates/cityscape/"; the CDN hosts an alpha webm plus a
 * static png fallback under it.
 */
export function nameplateUrls(asset) {
  if (!asset) return null
  const base = `https://cdn.discordapp.com/assets/collectibles/${asset.endsWith('/') ? asset : `${asset}/`}`
  return { webm: `${base}asset.webm`, png: `${base}static.png` }
}

/** Discord rich-presence images come in three flavours of asset id. */
export function activityAssetUrl(activity, key = 'large_image') {
  const img = activity?.assets?.[key]
  if (!img) return ''
  if (img.startsWith('mp:external/')) {
    return `https://media.discordapp.net/external/${img.slice('mp:external/'.length)}`
  }
  if (img.startsWith('spotify:')) return `https://i.scdn.co/image/${img.slice('spotify:'.length)}`
  return `https://cdn.discordapp.com/app-assets/${activity.application_id}/${img}.png`
}

/** One-shot presence lookup via Lanyard's REST API (used by the dashboard check). */
export async function restPresence(userId) {
  try {
    const res = await fetch(`https://api.lanyard.rest/v1/users/${userId}`)
    const json = await res.json()
    if (json.success) return { ok: true, data: json.data }
    return { ok: false, error: json.error?.message || 'unknown error' }
  } catch {
    return { ok: false, error: 'could not reach the lanyard api' }
  }
}

/** The main activity to feature: first non-custom, non-Spotify entry. */
export function pickActivity(presence) {
  return (presence?.activities || []).find((a) => a.type !== 4 && a.name !== 'Spotify') || null
}

/** The "custom status" text, if one is set. */
export function customStatus(presence) {
  const c = (presence?.activities || []).find((a) => a.type === 4)
  return c?.state || ''
}

export function formatClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}
