/**
 * Discord Nitro display-name styling (`display_name_styles` on the user
 * object, passed through by Lanyard) — the gradient + font Nitro users can
 * apply to their display name.
 *
 * The gradient is exact: `colors` are plain RGB integers.
 *
 * The font is best-effort. Discord does not publish its font_id table, so the
 * mapping below is assembled from the fonts Discord ships and verified to
 * exist on Google Fonts. Four of Discord's faces (Compagnon, Neo Castel,
 * Roads Rage, Sinistre) are licensed and not on Google Fonts, so those fall
 * back to a similar family. The dashboard exposes an override for when the
 * auto-detected font looks wrong.
 */

const G = (name, fallback = 'inherit') => ({ name, google: name.replace(/ /g, '+'), fallback })
const NO_G = (name, fallback) => ({ name, google: null, fallback })

export const DISPLAY_FONTS = {
  1: G('Bangers', 'cursive'),
  2: G('Bilbo Swash Caps', 'cursive'),
  3: G('Chicle', 'cursive'),
  4: NO_G('Compagnon', 'Georgia, serif'),
  5: G('Donegal One', 'serif'),
  6: G('Fontdiner Swanky', 'cursive'),
  7: G('Handjet', 'cursive'),
  8: G('Indie Flower', 'cursive'),
  9: G('Grenze Gotisch', 'cursive'),
  10: G('Lobster Two', 'cursive'),
  11: NO_G('Neo Castel', 'Georgia, serif'),
  12: G('Pixelify Sans', 'monospace'),
  13: G('Ribeye Marrow', 'cursive'),
  14: NO_G('Roads Rage', 'Impact, sans-serif'),
  15: NO_G('Sinistre', 'Georgia, serif'),
  16: G('Wallpoet', 'monospace'),
}

export const intToHex = (n) => `#${(Number(n) >>> 0).toString(16).padStart(6, '0').slice(-6)}`

/** Inject a Discord display font from Google Fonts, once per family. */
export function ensureDisplayFont(fontId) {
  const f = DISPLAY_FONTS[fontId]
  if (!f?.google || typeof document === 'undefined') return
  const id = `dcfont-${fontId}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${f.google}&display=swap`
  document.head.appendChild(link)
}

/**
 * Turn Discord's display_name_styles into ready-to-use CSS.
 * `fontOverride` (a font_id) wins over whatever Discord reported.
 */
export function displayNameStyle(styles, { useGradient = true, useFont = true, fontOverride = 0 } = {}) {
  if (!styles) return null
  const fontId = fontOverride || styles.font_id
  const font = DISPLAY_FONTS[fontId]
  const colors = Array.isArray(styles.colors) ? styles.colors.map(intToHex) : []

  const css = {}
  if (useFont && font) {
    ensureDisplayFont(fontId)
    css.fontFamily = font.google ? `"${font.name}", ${font.fallback}` : font.fallback
  }
  if (useGradient && colors.length) {
    // one colour = flat; two+ = gradient clipped to the glyphs
    if (colors.length === 1) {
      css.color = colors[0]
    } else {
      css.backgroundImage = `linear-gradient(90deg, ${colors.join(', ')})`
      css.WebkitBackgroundClip = 'text'
      css.backgroundClip = 'text'
      css.color = 'transparent'
    }
  }
  return { css, colors, fontId, fontName: font?.name || null }
}

/** The server tag ("primary guild") some accounts display next to their name. */
export function guildTag(primaryGuild) {
  if (!primaryGuild?.identity_enabled || !primaryGuild.tag) return null
  return {
    tag: primaryGuild.tag,
    badgeUrl: primaryGuild.badge
      ? `https://cdn.discordapp.com/guild-tag-badges/${primaryGuild.identity_guild_id}/${primaryGuild.badge}.png?size=32`
      : '',
  }
}
