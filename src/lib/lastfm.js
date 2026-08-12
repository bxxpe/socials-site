/**
 * Top artists via Last.fm.
 *
 * Spotify can't do this from the browser: its top-items endpoint needs a
 * user-scoped token that must be refreshed with a client secret, which means
 * a backend. Last.fm's read API is CORS-enabled and key-only, so it works
 * from a static site.
 *
 * The key goes in VITE_LASTFM_KEY. It ships in the bundle, which is fine —
 * a Last.fm API key is read-only and public by design (unlike a secret).
 */
const API = 'https://ws.audioscrobbler.com/2.0/'

export const LASTFM_KEY = import.meta.env.VITE_LASTFM_KEY || ''

export const PERIODS = [
  { id: '7day', name: 'last 7 days' },
  { id: '1month', name: 'last month' },
  { id: '3month', name: 'last 3 months' },
  { id: '6month', name: 'last 6 months' },
  { id: '12month', name: 'last year' },
  { id: 'overall', name: 'all time' },
]

// Last.fm serves this placeholder for artists with no artwork.
const PLACEHOLDER = '2a96cbd8b46e442fc41c2b86b821562f'

const pickImage = (images) => {
  const url = images?.find((i) => i.size === 'large')?.['#text'] || images?.at(-1)?.['#text'] || ''
  return url && !url.includes(PLACEHOLDER) ? url : ''
}

export async function fetchTopArtists(user, period = '1month', limit = 5) {
  if (!LASTFM_KEY) throw new Error('no last.fm api key configured')
  if (!user) throw new Error('no last.fm username')
  const url =
    `${API}?method=user.gettopartists&user=${encodeURIComponent(user)}` +
    `&period=${period}&limit=${limit}&api_key=${LASTFM_KEY}&format=json`
  const res = await fetch(url)
  const json = await res.json()
  if (json.error) throw new Error(json.message || `last.fm error ${json.error}`)
  return (json.topartists?.artist || []).map((a) => ({
    name: a.name,
    plays: Number(a.playcount) || 0,
    url: a.url,
    image: pickImage(a.image),
  }))
}
