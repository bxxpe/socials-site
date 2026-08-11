import { DISPLAY_FONTS, ensureDisplayFont } from './discordStyles'

const SYSTEM = 'ui-sans-serif, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

/** Special id: follow whatever font Discord reports for your display name. */
export const DISCORD_MATCH = 'discord'

const base = [
  { id: 'system', name: 'System', stack: SYSTEM },
  { id: 'inter', name: 'Inter', google: 'Inter:wght@400;600;800', stack: `"Inter", ${SYSTEM}` },
  { id: 'outfit', name: 'Outfit', google: 'Outfit:wght@400;600;800', stack: `"Outfit", ${SYSTEM}` },
  { id: 'poppins', name: 'Poppins', google: 'Poppins:wght@400;600;800', stack: `"Poppins", ${SYSTEM}` },
  {
    id: 'spacegrotesk',
    name: 'Space Grotesk',
    google: 'Space+Grotesk:wght@400;600;700',
    stack: `"Space Grotesk", ${SYSTEM}`,
  },
  {
    id: 'jetbrains',
    name: 'JetBrains Mono',
    google: 'JetBrains+Mono:wght@400;700',
    stack: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  },
  {
    id: 'playfair',
    name: 'Playfair Display',
    google: 'Playfair+Display:wght@400;700;900',
    stack: '"Playfair Display", Georgia, serif',
  },
  { id: 'bebas', name: 'Bebas Neue', google: 'Bebas+Neue', stack: '"Bebas Neue", Impact, sans-serif' },
]

/**
 * Every Discord display font that's actually on Google Fonts, exposed as a
 * normal pickable font so you can use Discord's look anywhere on the page.
 */
const discordFaces = Object.entries(DISPLAY_FONTS)
  .filter(([, f]) => f.google)
  .map(([id, f]) => ({
    id: `dc${id}`,
    name: `${f.name} (Discord)`,
    google: f.google,
    stack: `"${f.name}", ${f.fallback}`,
  }))

export const FONTS = [
  ...base,
  { id: DISCORD_MATCH, name: '★ Match my Discord name font', dynamic: true, stack: SYSTEM },
  ...discordFaces,
]

export const fontOf = (id) => FONTS.find((f) => f.id === id) || FONTS[0]

/**
 * Resolve a font id to a CSS stack, loading it if needed.
 * `discordFontId` is the live font_id from display_name_styles, used when the
 * selection is DISCORD_MATCH so the page follows whatever you set in Discord.
 */
export function resolveFont(id, discordFontId) {
  if (id === DISCORD_MATCH) {
    const f = DISPLAY_FONTS[discordFontId]
    if (!f) return SYSTEM
    ensureDisplayFont(discordFontId)
    return f.google ? `"${f.name}", ${f.fallback}` : f.fallback
  }
  const f = fontOf(id)
  ensureFont(f.id)
  return f.stack
}

/**
 * Inject a Google Fonts stylesheet once per family. `display=swap` means text
 * paints immediately in the fallback and swaps when the webfont lands, so a
 * slow font never blocks the page.
 */
export function ensureFont(id) {
  const font = fontOf(id)
  if (!font.google || typeof document === 'undefined') return
  const tag = `font-${font.id}`
  if (document.getElementById(tag)) return
  const link = document.createElement('link')
  link.id = tag
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`
  document.head.appendChild(link)
}
