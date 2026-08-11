const SYSTEM = 'ui-sans-serif, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

export const FONTS = [
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

export const fontOf = (id) => FONTS.find((f) => f.id === id) || FONTS[0]

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
