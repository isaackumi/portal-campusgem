/**
 * App icons for the home screen / install prompt, drawn from the brand mark
 * (components/brand-mark.tsx): a white lucide Gem on the indigo→violet gradient.
 *
 *   node scripts/generate-icons.js
 *
 * Writes to public/:
 *   icon.svg                    favicon (rounded square)
 *   icon-192x192.png / 512      manifest purpose "any" (rounded square, transparent corners)
 *   icon-maskable-192x192.png / 512
 *                               manifest purpose "maskable" (full bleed, gem inside the
 *                               central 80% safe zone so any launcher mask keeps it whole)
 *   apple-touch-icon.png        180x180, full bleed and opaque (iOS rounds the corners itself)
 */
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const PUBLIC = path.join(__dirname, '..', 'public')

// Tailwind brand-500 → brand-600 → violet-700, top-left to bottom-right.
const GRADIENT = `
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#6366f1"/>
    <stop offset="0.5" stop-color="#4f46e5"/>
    <stop offset="1" stop-color="#6d28d9"/>
  </linearGradient>
  <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffffff" stop-opacity="0.14"/>
    <stop offset="0.5" stop-color="#ffffff" stop-opacity="0"/>
  </linearGradient>`

// lucide-react "Gem" (24x24 grid). Its visual centre is (12, 12.5).
const GEM_PATHS = ['M6 3h12l4 6-10 13L2 9Z', 'M11 3 8 9l4 13 4-13-3-6', 'M2 9h20']

/**
 * @param {object} o
 * @param {number} o.radius  corner radius as a fraction of the size (0 = full bleed square)
 * @param {number} o.gem     gem width as a fraction of the size
 */
function iconSvg({ radius, gem }) {
  const size = 512
  const scale = (size * gem) / 20 // the gem is 20 units wide
  const tx = size / 2 - 12 * scale
  const ty = size / 2 - 12.5 * scale
  const r = size * radius
  const paths = GEM_PATHS.map((d) => `<path d="${d}"/>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>${GRADIENT}</defs>
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#bg)"/>
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#sheen)"/>
  <g transform="translate(${tx} ${ty}) scale(${scale})" fill="none" stroke="#ffffff" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">${paths}</g>
</svg>
`
}

const ANY = iconSvg({ radius: 0.22, gem: 0.56 })
const FULL_BLEED = iconSvg({ radius: 0, gem: 0.46 })

async function png(svg, size, file) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path.join(PUBLIC, file))
  console.log(`  ${file} (${size}x${size})`)
}

async function main() {
  fs.writeFileSync(path.join(PUBLIC, 'icon.svg'), ANY)
  console.log('  icon.svg')
  await png(ANY, 192, 'icon-192x192.png')
  await png(ANY, 512, 'icon-512x512.png')
  await png(FULL_BLEED, 192, 'icon-maskable-192x192.png')
  await png(FULL_BLEED, 512, 'icon-maskable-512x512.png')
  await png(FULL_BLEED, 180, 'apple-touch-icon.png')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
