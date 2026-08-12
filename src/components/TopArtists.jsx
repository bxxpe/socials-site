import { useEffect, useState } from 'react'
import { fetchTopArtists } from '../lib/lastfm'

/**
 * Last.fm top artists. Artwork is frequently missing from Last.fm's API these
 * days, so anything without a real image falls back to an initial tile.
 */
export default function TopArtists({ user, period, limit, enabled, style }) {
  const [artists, setArtists] = useState(null)

  useEffect(() => {
    if (!enabled || !user) {
      setArtists(null)
      return
    }
    let alive = true
    fetchTopArtists(user, period, limit)
      .then((a) => alive && setArtists(a))
      .catch(() => alive && setArtists([]))
    return () => {
      alive = false
    }
  }, [user, period, limit, enabled])

  if (!artists?.length) return null

  return (
    <div className="top-artists" style={style}>
      <div className="presence-kind">top artists</div>
      <div className="artist-row">
        {artists.map((a) => (
          <a
            key={a.name}
            className="artist"
            href={a.url}
            target="_blank"
            rel="noreferrer noopener"
            title={`${a.name} — ${Intl.NumberFormat().format(a.plays)} plays`}
          >
            {a.image ? (
              <img src={a.image} alt="" draggable="false" />
            ) : (
              <span className="artist-fallback">{a.name[0]}</span>
            )}
            <span className="artist-name">{a.name}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
