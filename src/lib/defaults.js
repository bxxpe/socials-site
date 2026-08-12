export const DEFAULT_CONFIG = {
  display_name: 'bxxpe',
  bio: 'welcome to my corner of the internet',
  avatar_url: '',
  favicon_url: '',
  location: '',
  show_time: false,
  show_time_diff: true,
  timezone: '',
  time_24h: false,

  // appearance
  accent: '#a855f7',
  bg_color: '#060409',
  bg_image_url: '',
  bg_blur: 0,
  bg_brightness: 0.55,
  font: 'system',
  font_scale: 1, // multiplies every text size on the card
  letter_spacing: 0, // em, applied across the card
  card_opacity: 0.55,
  card_blur: 24,
  icon_style: 'mono', // 'mono' | 'brand'

  // behaviour
  enter_text: 'click to enter',
  audio_url: '',
  audio_volume: 0.35,
  show_views: true,

  effects: {
    particles: true,
    orbs: true,
    tilt: true,
    sheen: true,
    typewriter: true,
    trail: true,
    glare: true,
    holo: false,
    crt: false,
  },

  crt_intensity: 1,
  crt_grain: 0.5, // film-grain / static strength on top of the CRT layers
  crt_grain_size: 3, // magnification of the noise tile — higher = chunkier grain
  crt_grille_size: 2, // px per RGB phosphor stripe
  crt_scanline_size: 1, // px per scanline
  crt_curve: 0.35, // 0 = flat panel, 1 = heavily bowed tube

  // your own animated gradient on the display name
  name_gradient: false,
  name_gradient_colors: ['#a855f7', '#22d3ee'],
  name_gradient_speed: 6, // seconds per loop

  // weather chip (open-meteo — free, no key)
  show_weather: false,
  weather_place: '',
  weather_lat: '',
  weather_lon: '',
  weather_unit: 'f',

  // last.fm top artists
  show_top_artists: false,
  lastfm_user: '',
  top_artists_period: '1month',
  top_artists_count: 5,

  tilt_strength: 14, // max degrees of card rotation
  reflect_intensity: 1, // multiplier on the sheen/glare/holo layers
  card_border: 'none', // 'none' | 'glow' | 'gradient' | 'beam'
  entrance: 'rise', // 'rise' | 'fade' | 'zoom' | 'flip' | 'blur' | 'glitch'
  particle_style: 'dust', // 'dust' | 'snow' | 'rain' | 'matrix'
  cursor_theme: 'teto', // full cursor set (normal/link/help/wait), animated
  cursor_url: '', // single custom cursor image; only used when no theme is set

  trail_style: 'glow', // 'glow' | 'comet' | 'sparkle'
  trail_color: '', // empty = follow the accent colour

  discord: {
    user_id: '',
    username: '',
    avatar: '', // avatar hash captured at connect time (fallback if lanyard is down)
    decoration: '', // avatar decoration asset, captured at connect time
    nameplate: '', // nameplate collectible asset path, captured at connect time
    public_flags: 0, // badge bitfield, captured at connect time
    show_presence: true,
    use_discord_avatar: false,
    show_decoration: true,
    show_nameplate: true,
    show_activity: true,
    show_spotify: true,
    spotify_player: true,
    show_badges: true,
    manual_badges: [], // ids from MANUAL_BADGES — nitro/boosting aren't publicly readable
    custom_badges: [], // [{ id, url, name }] your own images
    // Nitro display-name styling (gradient + font) from display_name_styles
    use_name_styles: true,
    name_font_override: 0, // 0 = whatever discord reports
    styles_on_main_name: false, // also apply to the big name at the top
    show_guild_tag: true,
    presence_font: '', // '' = inherit the page font
  },

  socials: [
    { id: 's1', platform: 'discord', url: 'https://discord.com' },
    { id: 's2', platform: 'x', url: 'https://x.com' },
    { id: 's3', platform: 'instagram', url: 'https://instagram.com' },
    { id: 's4', platform: 'github', url: 'https://github.com/bxxpe' },
  ],
}

/** Merge a saved config over the defaults so old saves survive new options. */
export function mergeConfig(saved) {
  const cfg = { ...DEFAULT_CONFIG, ...(saved || {}) }
  cfg.effects = { ...DEFAULT_CONFIG.effects, ...((saved && saved.effects) || {}) }
  cfg.discord = { ...DEFAULT_CONFIG.discord, ...((saved && saved.discord) || {}) }
  if (!Array.isArray(cfg.name_gradient_colors) || cfg.name_gradient_colors.length < 2) {
    cfg.name_gradient_colors = [...DEFAULT_CONFIG.name_gradient_colors]
  }
  if (!Array.isArray(cfg.discord.manual_badges)) cfg.discord.manual_badges = []
  if (!Array.isArray(cfg.discord.custom_badges)) cfg.discord.custom_badges = []
  cfg.socials = Array.isArray(saved?.socials) ? saved.socials : DEFAULT_CONFIG.socials.map((s) => ({ ...s }))
  return cfg
}

/** Pick a readable text colour for on-accent surfaces. */
export function contrastFor(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return '#ffffff'
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return lum > 0.62 ? '#0d0b14' : '#ffffff'
}

export function newId() {
  try {
    return crypto.randomUUID().slice(0, 8)
  } catch {
    return Math.random().toString(36).slice(2, 10)
  }
}
