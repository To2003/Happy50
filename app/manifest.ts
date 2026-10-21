import type { MetadataRoute } from 'next'

// Para "Agregar a inicio". Sin service worker: no hay modo offline de la app,
// la cola de subida ya persiste en IndexedDB por su cuenta.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '50 años',
    short_name: '50 años',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFF0F7',
    theme_color: '#FFF0F7',
    icons: [
      { src: '/icon/192', sizes: '192x192', type: 'image/png' },
      { src: '/icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  }
}
