import { useEffect } from 'react'

/**
 * True barrel distortion for the page content — the "screen" bulges like a
 * tube, while the scanline/grille overlay stays perfectly straight on top.
 *
 * CSS can't warp geometry, so this builds an SVG <feDisplacementMap>. The
 * displacement map is generated once on a canvas: each pixel encodes how far
 * to push the source at that point (R = x offset, G = y offset, 128 = no
 * shift), with the push growing as the square of the distance from centre —
 * the standard barrel term.
 *
 * The map is regenerated only when the curve amount changes, never per frame.
 */
const SIZE = 128
const FILTER_ID = 'crt-barrel'

// The map's shape never changes — only how hard it's applied (feDisplacementMap
// `scale`). So build it once and reuse it, instead of re-running a 16k-pixel
// loop and a PNG encode on every tick of the curvature slider.
let cachedMap = null

function buildBarrelMap(k) {
  if (cachedMap) return cachedMap
  const c = document.createElement('canvas')
  c.width = c.height = SIZE
  const ctx = c.getContext('2d')
  const img = ctx.createImageData(SIZE, SIZE)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const u = (x / (SIZE - 1)) * 2 - 1
      const v = (y / (SIZE - 1)) * 2 - 1
      // negative so the centre pushes outward (bulge) rather than pinching in
      const f = -k * (u * u + v * v)
      const i = (y * SIZE + x) * 4
      img.data[i] = Math.max(0, Math.min(255, 128 + u * f * 127))
      img.data[i + 1] = Math.max(0, Math.min(255, 128 + v * f * 127))
      img.data[i + 2] = 128
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  cachedMap = c.toDataURL('image/png')
  return cachedMap
}

export default function CrtScreen({ curve = 0, enabled = false }) {
  useEffect(() => {
    const on = enabled && curve > 0
    // querySelectorAll, not getElementById — never leave a duplicate behind
    const dropAll = () =>
      document.querySelectorAll('#crt-barrel-svg').forEach((n) => n.remove())

    if (!on) {
      dropAll()
      document.body.classList.remove('crt-warped')
      return
    }
    let svg = document.getElementById('crt-barrel-svg')

    const href = buildBarrelMap(1)
    // displacement strength in px — scaled by the curve slider
    const scale = (curve * 90).toFixed(1)

    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.id = 'crt-barrel-svg'
      svg.setAttribute('aria-hidden', 'true')
      svg.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none'
      document.body.appendChild(svg)
    }
    svg.innerHTML = `
      <filter id="${FILTER_ID}" x="-10%" y="-10%" width="120%" height="120%"
              color-interpolation-filters="sRGB">
        <feImage href="${href}" preserveAspectRatio="none"
                 x="0" y="0" width="100%" height="100%" result="map"/>
        <feDisplacementMap in="SourceGraphic" in2="map" scale="${scale}"
                           xChannelSelector="R" yChannelSelector="G"/>
      </filter>`
    document.body.classList.add('crt-warped')

    return () => {
      dropAll()
      document.body.classList.remove('crt-warped')
    }
  }, [curve, enabled])

  return null
}
