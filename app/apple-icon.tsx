import { ImageResponse } from 'next/og'
import { IconArt, brandFonts } from '@/lib/brandImage'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default async function AppleIcon() {
  return new ImageResponse(<IconArt size={180} />, { ...size, fonts: await brandFonts() })
}
