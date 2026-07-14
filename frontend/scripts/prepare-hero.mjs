/**
 * Prépare l'image d'arrière-plan du héro (basketteur) en WebP optimisé.
 * Usage : node scripts/prepare-hero.mjs <chemin/vers/photo.jpg>
 * Sortie : public/hero.webp (1600w) et public/hero-sm.webp (800w)
 * Photo par défaut : dunk — Unsplash (licence libre) photo-1608245449230-4ac19066d2d0
 */
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC = process.argv[2]
if (!SRC) {
  console.error('Usage : node scripts/prepare-hero.mjs <photo.jpg>')
  process.exit(1)
}
const OUT = path.join(__dirname, '..', 'public')

await sharp(SRC).resize(1600, null, { withoutEnlargement: true }).webp({ quality: 72 }).toFile(path.join(OUT, 'hero.webp'))
await sharp(SRC).resize(800, null, { withoutEnlargement: true }).webp({ quality: 68 }).toFile(path.join(OUT, 'hero-sm.webp'))

for (const f of ['hero.webp', 'hero-sm.webp']) {
  console.log(f, Math.round(fs.statSync(path.join(OUT, f)).size / 1024) + ' Ko')
}
