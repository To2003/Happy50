import type { MetadataRoute } from 'next'

// Evento privado con fotos de gente: que ningún buscador lo indexe.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', disallow: '/' } }
}
