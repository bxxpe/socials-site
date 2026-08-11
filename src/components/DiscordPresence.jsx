import { useEffect, useState } from 'react'
import {
  activityAssetUrl,
  ACTIVITY_VERBS,
  pickActivity,
  formatClock,
  discordAvatarUrl,
  decorationUrl,
  nameplateUrls,
  STATUS_COLORS,
  STATUS_LABELS,
} from '../lib/discord'

/** Alpha-webm nameplate with a static-png fallback; silently gone if neither loads. */
function Nameplate({ urls }) {
  const [mode, setMode] = useState('video')
  if (mode === 'off') return null
  return mode === 'video' ? (
    <video
      className="nameplate-media"
      src={urls.webm}
      autoPlay
      loop
      muted
      playsInline
      onError={() => setMode('img')}
    />
  ) : (
    <img className="nameplate-media" src={urls.png} alt="" draggable="false" onError={() => setMode('off')} />
  )
}

/**
 * The guns.lol-style Discord card inside the profile: a header with your
 * discord avatar (decoration + status dot) and name over your nameplate,
 * then "listening to spotify" / current-activity panels underneath.
 */
export default function DiscordPresence({ presence, cfg, style }) {
  const dc = cfg.discord
  const spotify = dc.show_spotify && presence?.listening_to_spotify ? presence.spotify : null
  const activity = dc.show_activity ? pickActivity(presence) : null
  const ticking = Boolean(spotify || activity?.timestamps?.start)

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!ticking) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [ticking])

  if (!presence) return null

  const du = presence.discord_user || {}
  const status = presence.discord_status || 'offline'
  const dName = du.display_name || du.global_name || du.username || dc.username || 'discord'
  const avatarHash = du.avatar ?? dc.avatar
  const deco = dc.show_decoration ? du.avatar_decoration_data?.asset || dc.decoration : ''
  const np = dc.show_nameplate
    ? nameplateUrls(du.collectibles?.nameplate?.asset || dc.nameplate)
    : null

  let bar = null
  if (spotify?.timestamps?.start && spotify?.timestamps?.end) {
    const dur = spotify.timestamps.end - spotify.timestamps.start
    const pos = Math.min(Math.max(now - spotify.timestamps.start, 0), dur)
    bar = { pct: dur ? (pos / dur) * 100 : 0, pos, dur }
  }

  const art = activity ? activityAssetUrl(activity) : ''

  return (
    <div className="presence" style={style}>
      <div className="dc-head">
        {np && <Nameplate urls={np} />}
        <span className="dc-mini-box">
          <img
            className="dc-mini-avatar"
            src={discordAvatarUrl(dc.user_id, avatarHash, 64)}
            alt=""
            draggable="false"
          />
          {deco && (
            <img
              className="deco"
              src={decorationUrl(deco)}
              alt=""
              draggable="false"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          )}
          <span className="dc-mini-dot" style={{ background: STATUS_COLORS[status] }} />
        </span>
        <div className="dc-head-names">
          <b>{dName}</b>
          <span>{STATUS_LABELS[status] || 'offline'}</span>
        </div>
      </div>

      {spotify && (
        <div className="presence-item">
          {spotify.album_art_url ? (
            <img className="presence-art" src={spotify.album_art_url} alt="" draggable="false" />
          ) : (
            <div className="presence-art presence-art-fallback">♪</div>
          )}
          <div className="presence-lines">
            <div className="presence-kind">listening to spotify</div>
            <div className="p-title">{spotify.song}</div>
            <div className="p-sub">{(spotify.artist || '').replace(/;/g, ',')}</div>
            {bar && (
              <>
                <div className="spotify-bar">
                  <i style={{ width: `${bar.pct}%` }} />
                </div>
                <div className="p-times">
                  <span>{formatClock(bar.pos)}</span>
                  <span>{formatClock(bar.dur)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {activity && (
        <div className="presence-item">
          {art ? (
            <img className="presence-art" src={art} alt="" draggable="false" />
          ) : (
            <div className="presence-art presence-art-fallback">{(activity.name || '?')[0]}</div>
          )}
          <div className="presence-lines">
            <div className="presence-kind">{ACTIVITY_VERBS[activity.type] || 'playing'}</div>
            <div className="p-title">{activity.name}</div>
            {activity.details && <div className="p-sub">{activity.details}</div>}
            {activity.state && <div className="p-sub">{activity.state}</div>}
            {activity.timestamps?.start && !activity.timestamps?.end && (
              <div className="p-elapsed">{formatClock(now - activity.timestamps.start)} elapsed</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
