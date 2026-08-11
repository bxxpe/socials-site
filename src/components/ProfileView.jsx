import { useEffect } from 'react'
import Particles from './Particles'
import DiscordPresence from './DiscordPresence'
import useTilt from '../hooks/useTilt'
import useTypewriter from '../hooks/useTypewriter'
import useLanyard from '../hooks/useLanyard'
import useClock, { useZoneDiff } from '../hooks/useClock'
import { SocialIcon, platformOf, EyeIcon, PinIcon, ClockIcon } from '../lib/icons'
import { contrastFor } from '../lib/defaults'
import { resolveFont } from '../lib/fonts'
import { displayNameStyle } from '../lib/discordStyles'
import { STATUS_COLORS, STATUS_LABELS, discordAvatarUrl, decorationUrl, customStatus } from '../lib/discord'

/**
 * The actual guns.lol-style page. Used full-screen on "/" and embedded as the
 * live preview inside the dashboard (preview mode skips the heavy effects).
 */
export default function ProfileView({ profile, preview = false, entered = true, views = null }) {
  const cfg = profile.config
  const fx = cfg.effects
  const dc = cfg.discord
  const reduced =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const tiltRef = useTilt(fx.tilt && !preview, cfg.tilt_strength)
  const typing = fx.typewriter && !preview && !reduced && entered
  const bio = useTypewriter(cfg.bio || '', typing)

  // The tab title runs its own loop on the handle, independent of the bio.
  // The "@" stays put so the tab is never momentarily blank.
  const typedHandle = useTypewriter(profile.username || '', typing)
  useEffect(() => {
    if (!typing) return
    document.title = `@${typedHandle}`
  }, [typing, typedHandle])

  // Live Discord presence (Lanyard) — also live inside the dashboard preview.
  const presence = useLanyard(dc.user_id, Boolean(dc.show_presence && dc.user_id))
  const status = presence?.discord_status || 'offline'
  const dcAvatarHash = presence?.discord_user?.avatar ?? dc.avatar
  const avatarSrc =
    dc.use_discord_avatar && dc.user_id ? discordAvatarUrl(dc.user_id, dcAvatarHash, 256) : cfg.avatar_url
  const cStatus = dc.show_presence ? customStatus(presence) : ''
  // Optionally carry the Nitro name styling onto the big name at the top.
  const mainNameStyle =
    dc.show_presence && dc.styles_on_main_name && dc.use_name_styles
      ? displayNameStyle(presence?.discord_user?.display_name_styles, {
          fontOverride: dc.name_font_override,
        })
      : null

  const clock = useClock(cfg.timezone, cfg.show_time, cfg.time_24h)
  const zoneDiff = useZoneDiff(cfg.timezone, cfg.show_time && cfg.show_time_diff)
  const mainDeco = dc.show_decoration
    ? presence?.discord_user?.avatar_decoration_data?.asset || dc.decoration
    : ''

  // "match my discord name font" resolves against the live font_id
  const discordFontId = presence?.discord_user?.display_name_styles?.font_id
  const fontStack = resolveFont(cfg.font, discordFontId)

  const vars = {
    '--accent': cfg.accent,
    '--accent-contrast': contrastFor(cfg.accent),
    '--bg': cfg.bg_color,
    '--card-alpha': cfg.card_opacity,
    '--card-blur': `${cfg.card_blur}px`,
    '--bg-blur': `${cfg.bg_blur}px`,
    '--bg-bright': cfg.bg_brightness,
    // more blur needs more overscan to keep feathered edges off-screen
    '--bg-blur-scale': cfg.bg_blur / 200,
    '--font': fontStack,
    '--presence-font': dc.presence_font ? resolveFont(dc.presence_font, discordFontId) : fontStack,
    '--reflect': cfg.reflect_intensity,
  }

  const name = cfg.display_name || profile.username || 'unnamed'

  return (
    <div className={`profile-root${preview ? ' is-preview' : ''}`} style={vars}>
      {cfg.bg_image_url ? (
        /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(cfg.bg_image_url) ? (
          <div className="bg-media" aria-hidden="true">
            <video className="bg-video" src={cfg.bg_image_url} autoPlay loop muted playsInline />
          </div>
        ) : (
          <div className="bg-image" style={{ backgroundImage: `url(${cfg.bg_image_url})` }} />
        )
      ) : (
        fx.orbs && (
          <div className="orbs" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        )
      )}
      {!preview && <Particles enabled={fx.particles && !reduced} accent={cfg.accent} />}

      <main className={`profile-center${entered ? ' entered' : ''}`}>
        <section
          className={`card${fx.sheen && !preview ? ' has-sheen' : ''}${
            fx.glare && !preview ? ' has-glare' : ''
          }`}
          ref={tiltRef}
        >
          {/* reflection layers — excluded from the card's entrance animation */}
          {fx.holo && !preview && <i className="fx-layer fx-holo" aria-hidden="true" />}
          {fx.glare && !preview && <i className="fx-layer fx-edge" aria-hidden="true" />}
          <div className="avatar-wrap" style={{ '--i': 0 }}>
            <span className="avatar-box">
              {avatarSrc ? (
                <img className="avatar" src={avatarSrc} alt="" draggable="false" />
              ) : (
                <div className="avatar avatar-fallback">{name[0]}</div>
              )}
              {mainDeco && (
                <img
                  className="deco"
                  src={decorationUrl(mainDeco)}
                  alt=""
                  draggable="false"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              )}
              {dc.show_presence && presence && (
                <span
                  className="status-dot"
                  style={{ background: STATUS_COLORS[status] }}
                  title={STATUS_LABELS[status]}
                />
              )}
            </span>
          </div>

          <h1 className="name" style={{ '--i': 1, ...(mainNameStyle?.css || {}) }}>
            {name}
          </h1>
          <p className="handle" style={{ '--i': 2 }}>@{profile.username}</p>

          {cStatus && (
            <p className="custom-status" style={{ '--i': 3 }}>
              {cStatus}
            </p>
          )}

          {cfg.bio && (
            <p className="bio" style={{ '--i': 4 }}>
              {bio}
              {typing && <span className="caret" />}
            </p>
          )}

          {(cfg.location || clock) && (
            <div className="meta-row" style={{ '--i': 5 }}>
              {cfg.location && (
                <span className="meta-chip">
                  <span className="meta-icon">{PinIcon}</span>
                  {cfg.location}
                </span>
              )}
              {clock && (
                <span className="meta-chip" title={cfg.timezone || 'my local time'}>
                  <span className="meta-icon">{ClockIcon}</span>
                  <span className="clock-time">{clock}</span>
                  {zoneDiff && <span className="clock-diff">{zoneDiff}</span>}
                </span>
              )}
            </div>
          )}

          {cfg.socials.length > 0 && (
            <div className="socials" style={{ '--i': 6 }}>
              {cfg.socials.map((s) => (
                <a
                  key={s.id}
                  className="social"
                  href={s.url || '#'}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={platformOf(s.platform).name}
                  title={platformOf(s.platform).name}
                  onClick={preview ? (e) => e.preventDefault() : undefined}
                >
                  <SocialIcon platform={s.platform} mode={cfg.icon_style} />
                </a>
              ))}
            </div>
          )}

          {dc.show_presence && (
            <DiscordPresence presence={presence} cfg={cfg} preview={preview} style={{ '--i': 7 }} />
          )}

          {cfg.show_views && views != null && (
            <div className="views" style={{ '--i': 8 }} title="profile views">
              <span className="views-icon">{EyeIcon}</span>
              <span>{Intl.NumberFormat().format(views)}</span>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
