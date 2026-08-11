import {
  siDiscord,
  siX,
  siInstagram,
  siTiktok,
  siYoutube,
  siTwitch,
  siKick,
  siSpotify,
  siSoundcloud,
  siLastdotfm,
  siGithub,
  siSteam,
  siValorant,
  siEpicgames,
  siLeagueoflegends,
  siRoblox,
  siNamemc,
  siTelegram,
  siSnapchat,
  siReddit,
  siPinterest,
  siPaypal,
  siCashapp,
  siOnlyfans,
} from 'simple-icons'

const stroke = (children) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

const WEBSITE_ICON = stroke(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.7 2.7 2.7 15.3 0 18M12 3c-2.7 2.7-2.7 15.3 0 18" />
  </>
)

const EMAIL_ICON = stroke(
  <>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="m3.8 7.2 7 5.3a2 2 0 0 0 2.4 0l7-5.3" />
  </>
)

// LinkedIn isn't in simple-icons anymore, so ship our own glyph.
const LINKEDIN = {
  path: 'M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z',
  hex: '0A66C2',
}

export const PLATFORMS = [
  { id: 'discord', name: 'Discord', si: siDiscord, placeholder: 'https://discord.gg/yourserver' },
  { id: 'x', name: 'X (Twitter)', si: siX, placeholder: 'https://x.com/you' },
  { id: 'instagram', name: 'Instagram', si: siInstagram, placeholder: 'https://instagram.com/you' },
  { id: 'tiktok', name: 'TikTok', si: siTiktok, placeholder: 'https://tiktok.com/@you' },
  { id: 'youtube', name: 'YouTube', si: siYoutube, placeholder: 'https://youtube.com/@you' },
  { id: 'twitch', name: 'Twitch', si: siTwitch, placeholder: 'https://twitch.tv/you' },
  { id: 'kick', name: 'Kick', si: siKick, placeholder: 'https://kick.com/you' },
  { id: 'spotify', name: 'Spotify', si: siSpotify, placeholder: 'https://open.spotify.com/user/you' },
  { id: 'soundcloud', name: 'SoundCloud', si: siSoundcloud, placeholder: 'https://soundcloud.com/you' },
  { id: 'lastfm', name: 'Last.fm', si: siLastdotfm, placeholder: 'https://last.fm/user/you' },
  { id: 'github', name: 'GitHub', si: siGithub, placeholder: 'https://github.com/you' },
  { id: 'steam', name: 'Steam', si: siSteam, placeholder: 'https://steamcommunity.com/id/you' },
  { id: 'valorant', name: 'Valorant', si: siValorant, placeholder: 'https://tracker.gg/valorant/profile/…' },
  { id: 'epicgames', name: 'Epic Games', si: siEpicgames, placeholder: 'https://store.epicgames.com/…' },
  { id: 'league', name: 'League of Legends', si: siLeagueoflegends, placeholder: 'https://op.gg/summoners/…' },
  { id: 'roblox', name: 'Roblox', si: siRoblox, placeholder: 'https://roblox.com/users/…' },
  { id: 'namemc', name: 'NameMC', si: siNamemc, placeholder: 'https://namemc.com/profile/you' },
  { id: 'telegram', name: 'Telegram', si: siTelegram, placeholder: 'https://t.me/you' },
  { id: 'snapchat', name: 'Snapchat', si: siSnapchat, placeholder: 'https://snapchat.com/add/you' },
  { id: 'reddit', name: 'Reddit', si: siReddit, placeholder: 'https://reddit.com/u/you' },
  { id: 'pinterest', name: 'Pinterest', si: siPinterest, placeholder: 'https://pinterest.com/you' },
  { id: 'linkedin', name: 'LinkedIn', si: LINKEDIN, placeholder: 'https://linkedin.com/in/you' },
  { id: 'paypal', name: 'PayPal', si: siPaypal, placeholder: 'https://paypal.me/you' },
  { id: 'cashapp', name: 'Cash App', si: siCashapp, placeholder: 'https://cash.app/$you' },
  { id: 'onlyfans', name: 'OnlyFans', si: siOnlyfans, placeholder: 'https://onlyfans.com/you' },
  { id: 'email', name: 'Email', node: EMAIL_ICON, placeholder: 'mailto:you@example.com' },
  { id: 'website', name: 'Website', node: WEBSITE_ICON, placeholder: 'https://yoursite.com' },
]

export function platformOf(id) {
  return PLATFORMS.find((p) => p.id === id) || PLATFORMS[PLATFORMS.length - 1]
}

/** Brand hexes that vanish on a dark page get swapped for white. */
function brandColor(hex) {
  const n = parseInt(hex, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return lum < 0.22 ? '#ffffff' : `#${hex}`
}

export function SocialIcon({ platform, mode = 'mono' }) {
  const p = platformOf(platform)
  if (p.node) return p.node
  const style = mode === 'brand' ? { color: brandColor(p.si.hex) } : undefined
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" style={style}>
      <path d={p.si.path} />
    </svg>
  )
}

export const EyeIcon = stroke(
  <>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </>
)

export const PinIcon = stroke(
  <>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </>
)
