import { flushSync } from 'react-dom'

type DocumentWithVT = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<void> }
}

// Mejora progresiva: si el navegador no tiene View Transitions o el sistema
// pide menos movimiento, el cambio de estado pasa directo, sin animación.
function canMorph(el: HTMLElement | null): el is HTMLElement {
  return (
    !!el &&
    el.isConnected &&
    typeof (document as DocumentWithVT).startViewTransition === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

// Espera a que la foto grande esté decodificada (con tope) para que la
// transición no termine en un recuadro vacío.
async function preload(src: string, maxWaitMs: number): Promise<void> {
  const img = new Image()
  img.src = src
  await Promise.race([img.decode().catch(() => undefined), new Promise((r) => setTimeout(r, maxWaitMs))])
}

// La miniatura `el` se transforma en la foto del visor (que lleva la clase
// `vt-foto`). Solo un elemento por vez puede tener el nombre de transición.
export async function morphOpen(el: HTMLElement | null, src: string, update: () => void) {
  if (!canMorph(el)) return update()
  await preload(src, 300)
  if (!el.isConnected) return update()
  el.style.setProperty('view-transition-name', 'foto')
  ;(document as DocumentWithVT).startViewTransition!(() => {
    el.style.removeProperty('view-transition-name')
    flushSync(update)
  })
}

// El visor vuelve a la miniatura de la que salió.
export function morphClose(el: HTMLElement | null, update: () => void) {
  if (!canMorph(el)) return update()
  const transition = (document as DocumentWithVT).startViewTransition!(() => {
    flushSync(update)
    el.style.setProperty('view-transition-name', 'foto')
  })
  void transition.finished.finally(() => el.style.removeProperty('view-transition-name'))
}
