/**
 * Cursor themes.
 *
 * Windows ships cursors as .cur / .ani, and browsers can't use either
 * reliably — .ani isn't supported anywhere modern, and .cur only works on
 * some Windows browsers. So the source files were decoded frame-by-frame and
 * re-encoded as PNGs, which every browser accepts.
 *
 * CSS also can't animate a cursor, so multi-frame roles are driven by
 * CursorTheme.jsx swapping a custom property on a timer. `rate` is the
 * original .ani display rate converted from jiffies (1/60s) to milliseconds.
 */
export const CURSOR_THEMES = [
  { id: 'none', name: 'Default (system)' },
  {
    id: 'teto',
    name: 'Teto',
    preview: '/cursors/normal-select-0.png',
    roles: {
      normal: {
        frames: ['/cursors/normal-select-0.png', '/cursors/normal-select-1.png'],
        rate: 400,
        hotspot: [0, 0],
        fallback: 'auto',
      },
      link: {
        frames: ['/cursors/link-select-1-0.png', '/cursors/link-select-1-1.png'],
        rate: 350,
        hotspot: [0, 0],
        fallback: 'pointer',
      },
      help: {
        frames: ['/cursors/help-select.png'],
        rate: 0,
        hotspot: [0, 0],
        fallback: 'help',
      },
      wait: {
        frames: ['/cursors/waiting-0.png', '/cursors/waiting-1.png'],
        rate: 700,
        hotspot: [0, 0],
        fallback: 'progress',
      },
    },
  },
]

export const cursorThemeOf = (id) => CURSOR_THEMES.find((t) => t.id === id)

/** `url("…") x y, fallback` — the value a `cursor:` property expects. */
export const cursorValue = (role, frameIndex) => {
  const src = role.frames[frameIndex % role.frames.length]
  return `url("${src}") ${role.hotspot[0]} ${role.hotspot[1]}, ${role.fallback}`
}
