/**
 * Génère le logo transparent et toutes les icônes PWA à partir du SVG source.
 *
 * Usage : node scripts/generate-icons.mjs [chemin/vers/logo.svg]
 *
 * Le SVG source est une vectorisation sur fond blanc : on rasterise puis on
 * retire le fond par remplissage depuis les bords (les blancs internes du
 * logo sont préservés), on recadre, et on exporte les PNG dans public/.
 */
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC = process.argv[2] ?? path.join(__dirname, '..', '..', 'prototype', 'logo.svg')
const OUT = path.join(__dirname, '..', 'public')
const ICONS = path.join(OUT, 'icons')
fs.mkdirSync(ICONS, { recursive: true })

const ORANGE = '#F87306'
const WHITE_THRESHOLD = 235 // au-delà : considéré comme fond blanc

async function removeBackground(inputPath, size = 1024) {
  const { data, info } = await sharp(inputPath, { density: 96 })
    .resize(size, size, { fit: 'inside', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height, channels } = info
  const isWhite = (i) =>
    data[i] > WHITE_THRESHOLD && data[i + 1] > WHITE_THRESHOLD && data[i + 2] > WHITE_THRESHOLD

  // Remplissage BFS depuis les 4 bords : seuls les blancs connectés au bord deviennent transparents
  const visited = new Uint8Array(width * height)
  const queue = []
  const push = (x, y) => {
    const p = y * width + x
    if (visited[p]) return
    const i = p * channels
    if (!isWhite(i)) return
    visited[p] = 1
    queue.push(p)
  }
  for (let x = 0; x < width; x++) { push(x, 0); push(x, height - 1) }
  for (let y = 0; y < height; y++) { push(0, y); push(width - 1, y) }
  while (queue.length) {
    const p = queue.pop()
    const x = p % width, y = (p / width) | 0
    data[p * channels + 3] = 0
    if (x > 0) push(x - 1, y)
    if (x < width - 1) push(x + 1, y)
    if (y > 0) push(x, y - 1)
    if (y < height - 1) push(x, y + 1)
  }

  // Adoucir la frontière : les pixels presque blancs adjacents au fond deviennent semi-transparents
  return sharp(data, { raw: { width, height, channels } }).png().trim()
}

async function main() {
  console.log('Source :', SRC)
  const logo = await removeBackground(SRC)
  const logoBuf = await logo.toBuffer()
  const meta = await sharp(logoBuf).metadata()
  console.log(`Logo détouré : ${meta.width}x${meta.height}`)

  // Logo transparent principal (max 512, pour écrans auth / hero)
  await sharp(logoBuf).resize(512, 512, { fit: 'inside' }).png({ compressionLevel: 9 }).toFile(path.join(OUT, 'logo.png'))
  // Logo header (petit, léger)
  await sharp(logoBuf).resize(96, 96, { fit: 'inside' }).png({ compressionLevel: 9 }).toFile(path.join(OUT, 'logo-header.png'))

  // Icône carrée avec padding, fond transparent
  const square = (size, scale = 0.86) =>
    sharp(logoBuf)
      .resize(Math.round(size * scale), Math.round(size * scale), { fit: 'inside' })
      .toBuffer()
      .then((buf) =>
        sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
          .composite([{ input: buf, gravity: 'center' }])
          .png({ compressionLevel: 9 }),
      )

  await (await square(192)).toFile(path.join(ICONS, 'icon-192.png'))
  await (await square(512)).toFile(path.join(ICONS, 'icon-512.png'))

  // Maskable : fond orange, logo dans la zone sûre (65 %)
  const maskable = async (size) => {
    const buf = await sharp(logoBuf).resize(Math.round(size * 0.62), Math.round(size * 0.62), { fit: 'inside' }).toBuffer()
    return sharp({ create: { width: size, height: size, channels: 4, background: ORANGE } })
      .composite([{ input: buf, gravity: 'center' }])
      .png({ compressionLevel: 9 })
  }
  await (await maskable(512)).toFile(path.join(ICONS, 'icon-maskable-512.png'))
  await (await maskable(192)).toFile(path.join(ICONS, 'icon-maskable-192.png'))

  // Apple touch (fond blanc, iOS n'aime pas la transparence)
  const apple = await sharp(logoBuf).resize(150, 150, { fit: 'inside' }).toBuffer()
  await sharp({ create: { width: 180, height: 180, channels: 4, background: '#FFFFFF' } })
    .composite([{ input: apple, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(ICONS, 'apple-touch-icon.png'))

  // Favicon
  await (await square(64, 0.95)).toFile(path.join(OUT, 'favicon.png'))

  // Vérification visuelle : logo sur fond magenta (le fond doit être magenta, pas blanc)
  const check = await sharp(logoBuf).resize(300, 300, { fit: 'inside' }).toBuffer()
  await sharp({ create: { width: 340, height: 340, channels: 4, background: '#FF00FF' } })
    .composite([{ input: check, gravity: 'center' }])
    .png()
    .toFile(path.join(__dirname, 'check-transparency.png'))

  for (const f of ['logo.png', 'logo-header.png', 'favicon.png']) {
    console.log(f, Math.round(fs.statSync(path.join(OUT, f)).size / 1024) + ' Ko')
  }
  for (const f of fs.readdirSync(ICONS)) {
    console.log('icons/' + f, Math.round(fs.statSync(path.join(ICONS, f)).size / 1024) + ' Ko')
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
