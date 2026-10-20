import { ImageResponse } from 'next/og'
import { IconArt, brandFonts } from '@/lib/brandImage'

export const contentType = 'image/png'

// Tres tamaños: favicon, y 192/512 para el manifest ("Agregar a inicio").
export function generateImageMetadata() {
  return [32, 192, 512].map((size) => ({
    id: String(size),
    size: { width: size, height: size },
    contentType,
  }))
}

export default async function Icon({ id }: { id: string }) {
  const size = Number(id)
  return new ImageResponse(<IconArt size={size} />, {
    width: size,
    height: size,
    fonts: await brandFonts(),
  })
}
