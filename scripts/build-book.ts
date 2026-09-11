// Arma el PDF y el ZIP del book a partir del manifiesto que descarga el
// admin desde /admin/export. Corre en la máquina del admin, no en Vercel
// (SPEC.md sección 9) — sin límite de tiempo ni de memoria de función
// serverless que respetar.
//
// Uso:
//   npm run build-book -- ./manifiesto.json [./carpeta-salida]
//
// Necesita Node 22.6+ (usa la ejecución nativa de TypeScript de Node, sin
// ts-node ni tsx — evitamos un bug de resolución de módulos de tsx con una
// dependencia de @react-pdf/renderer).

import { createElement as h } from 'react'
import { readFileSync, mkdirSync, createWriteStream } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import archiver from 'archiver'
import { Document, Page, View, Text, Image, StyleSheet, renderToFile } from '@react-pdf/renderer'

const __dirname = dirname(fileURLToPath(import.meta.url))

interface ManifestMilestone {
  id: string
  name: string
  emoji: string | null
  sortOrder: number
  isPrologue: boolean
  startedAt: string | null
}

interface ManifestPhoto {
  id: string
  storagePath: string
  thumbPath: string
  caption: string | null
  takenAt: string
  author: string | null
  milestoneId: string | null
  isFeatured: boolean
}

interface Manifest {
  generatedAt: string
  milestones: ManifestMilestone[]
  photos: ManifestPhoto[]
  uploaders: string[]
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CM = 28.3465 // puntos por centímetro
const PAGE_SIZE: [number, number] = [20 * CM, 20 * CM] // cuadrado 20x20, SPEC.md sección 9
const GRID_PATTERN = [1, 2, 4, 2] // "variando el ritmo"
const MAX_DOWNLOAD_ATTEMPTS = 3

function loadEnvLocal(path: string): Record<string, string> {
  const env: Record<string, string> = {}
  let content: string
  try {
    content = readFileSync(path, 'utf8')
  } catch {
    return env
  }
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1)
  }
  return env
}

const env = { ...loadEnvLocal(join(__dirname, '..', '.env.local')), ...process.env }
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL

if (!SUPABASE_URL) {
  console.error('Falta NEXT_PUBLIC_SUPABASE_URL (¿corriste esto desde la carpeta del proyecto?).')
  process.exit(1)
}

function publicUrl(storagePath: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/photos/${storagePath}`
}

function sanitizeFolderName(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '-').trim()
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function downloadWithRetries(url: string): Promise<Buffer | null> {
  for (let attempt = 1; attempt <= MAX_DOWNLOAD_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (err) {
      if (attempt === MAX_DOWNLOAD_ATTEMPTS) {
        console.warn(`  No se pudo bajar ${url}: ${err instanceof Error ? err.message : err}`)
        return null
      }
      await delay(1000 * attempt)
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// ZIP
// ---------------------------------------------------------------------------

async function buildZip(
  manifest: Manifest,
  buffers: Map<string, Buffer>,
  outDir: string,
): Promise<void> {
  const zipPath = join(outDir, 'fotos.zip')
  const output = createWriteStream(zipPath)
  const archive = archiver('zip', { zlib: { level: 9 } })

  const done = new Promise<void>((resolve, reject) => {
    output.on('close', () => resolve())
    archive.on('error', reject)
  })

  archive.pipe(output)

  const milestoneById = new Map(manifest.milestones.map((m) => [m.id, m]))

  for (const photo of manifest.photos) {
    const buffer = buffers.get(photo.id)
    if (!buffer) continue

    const milestone = photo.milestoneId ? milestoneById.get(photo.milestoneId) : undefined
    const folder = milestone
      ? `${String(milestone.sortOrder).padStart(2, '0')}-${sanitizeFolderName(milestone.name)}`
      : 'sin-momento'

    archive.append(buffer, { name: `${folder}/${photo.id}.jpg` })
  }

  await archive.finalize()
  await done
  console.log('ZIP listo:', zipPath)
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  page: { backgroundColor: '#ffffff' },
  coverPage: {
    padding: 40,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coverTitle: { fontSize: 32, fontWeight: 700, textAlign: 'center', marginTop: 40 },
  coverSubtitle: { fontSize: 14, color: '#555555', marginTop: 8, textAlign: 'center' },
  coverImage: { width: '100%', height: 360, objectFit: 'cover', borderRadius: 4 },
  separatorPage: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111111',
  },
  separatorTitle: { fontSize: 28, color: '#ffffff', fontWeight: 700 },
  separatorTime: { fontSize: 14, color: '#aaaaaa', marginTop: 8 },
  gridPage: { padding: 16, display: 'flex', flexDirection: 'row', flexWrap: 'wrap' },
  gridCellFull: { width: '100%', height: '100%' },
  gridCellHalf: { width: '50%', height: '100%', padding: 4 },
  gridCellQuarter: { width: '50%', height: '50%', padding: 4 },
  photoWrap: { width: '100%', height: '100%', position: 'relative' },
  photoImage: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: 2 },
  photoCaption: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    fontSize: 8,
    color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 3,
    borderRadius: 2,
  },
  backCoverPage: { padding: 40, display: 'flex', flexDirection: 'column' },
  backCoverTitle: { fontSize: 20, fontWeight: 700, marginBottom: 16 },
  backCoverName: { fontSize: 12, marginBottom: 4 },
})

function cellStyleFor(count: number) {
  if (count === 1) return styles.gridCellFull
  if (count === 2) return styles.gridCellHalf
  return styles.gridCellQuarter
}

function PhotoCell({ photo, buffer }: { photo: ManifestPhoto; buffer: Buffer | undefined }) {
  const footer = [photo.caption, photo.author ? `— ${photo.author}` : null].filter(Boolean).join(' ')

  return h(
    View,
    { style: styles.photoWrap },
    buffer ? h(Image, { style: styles.photoImage, src: buffer }) : null,
    footer ? h(Text, { style: styles.photoCaption }, footer) : null,
  )
}

function chunkByPattern<T>(items: T[], pattern: number[]): T[][] {
  const chunks: T[][] = []
  let i = 0
  let patternIndex = 0
  while (i < items.length) {
    const size = pattern[patternIndex % pattern.length] ?? 1
    chunks.push(items.slice(i, i + size))
    i += size
    patternIndex++
  }
  return chunks
}

function formatChapterTime(milestone: ManifestMilestone): string | null {
  if (milestone.isPrologue || !milestone.startedAt) return null
  return new Date(milestone.startedAt).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function buildDocument(manifest: Manifest, buffers: Map<string, Buffer>) {
  const milestoneById = new Map(manifest.milestones.map((m) => [m.id, m]))
  const photosByMilestone = new Map<string, ManifestPhoto[]>()
  for (const photo of manifest.photos) {
    if (!photo.milestoneId) continue
    const list = photosByMilestone.get(photo.milestoneId) ?? []
    list.push(photo)
    photosByMilestone.set(photo.milestoneId, list)
  }

  const chapters = manifest.milestones.filter((m) => (photosByMilestone.get(m.id)?.length ?? 0) > 0)

  const featured = manifest.photos.find((p) => p.isFeatured) ?? manifest.photos[0]
  const eventDate = manifest.photos[0]
    ? new Date(manifest.photos[0].takenAt).toLocaleDateString('es-AR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''

  const pages = [
    // Portada
    h(
      Page,
      { key: 'cover', size: PAGE_SIZE, style: [styles.page, styles.coverPage] },
      featured && buffers.get(featured.id)
        ? h(Image, { style: styles.coverImage, src: buffers.get(featured.id) })
        : h(View, { style: styles.coverImage }),
      h(View, {}, [
        h(Text, { key: 't', style: styles.coverTitle }, '50 años'),
        h(Text, { key: 's', style: styles.coverSubtitle }, eventDate),
      ]),
    ),
  ]

  for (const milestone of chapters) {
    const photos = photosByMilestone.get(milestone.id) ?? []
    const time = formatChapterTime(milestone)

    pages.push(
      h(
        Page,
        { key: `sep-${milestone.id}`, size: PAGE_SIZE, style: [styles.page, styles.separatorPage] },
        h(Text, { style: styles.separatorTitle }, milestone.name),
        time ? h(Text, { style: styles.separatorTime }, time) : null,
      ),
    )

    const groups = chunkByPattern(photos, GRID_PATTERN)
    groups.forEach((group, groupIndex) => {
      pages.push(
        h(
          Page,
          { key: `grid-${milestone.id}-${groupIndex}`, size: PAGE_SIZE, style: [styles.page, styles.gridPage] },
          ...group.map((photo) =>
            h(
              View,
              { key: photo.id, style: cellStyleFor(group.length) },
              h(PhotoCell, { photo, buffer: buffers.get(photo.id) }),
            ),
          ),
        ),
      )
    })
  }

  // Contratapa
  pages.push(
    h(
      Page,
      { key: 'back', size: PAGE_SIZE, style: [styles.page, styles.backCoverPage] },
      h(Text, { style: styles.backCoverTitle }, 'Gracias por subir tus fotos'),
      ...manifest.uploaders.map((name) => h(Text, { key: name, style: styles.backCoverName }, name)),
    ),
  )

  return h(Document, {}, ...pages)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const manifestPath = process.argv[2]
  if (!manifestPath) {
    console.error('Uso: npm run build-book -- <manifiesto.json> [carpeta-salida]')
    process.exit(1)
  }
  const outDir = process.argv[3] ?? './book-output'
  mkdirSync(outDir, { recursive: true })

  const manifest: Manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  console.log(`Manifiesto: ${manifest.photos.length} fotos, ${manifest.milestones.length} momentos.`)

  const buffers = new Map<string, Buffer>()
  let done = 0
  for (const photo of manifest.photos) {
    const buffer = await downloadWithRetries(publicUrl(photo.storagePath))
    if (buffer) buffers.set(photo.id, buffer)
    done++
    if (done % 25 === 0 || done === manifest.photos.length) {
      console.log(`Descargadas ${done}/${manifest.photos.length}...`)
    }
  }

  await buildZip(manifest, buffers, outDir)

  console.log('Armando el PDF...')
  const pdfPath = join(outDir, 'book.pdf')
  await renderToFile(buildDocument(manifest, buffers), pdfPath)
  console.log('PDF listo:', pdfPath)

  console.log('\nListo. Revisá la carpeta:', outDir)
}

main().catch((err) => {
  console.error('Algo salió mal:', err)
  process.exit(1)
})
