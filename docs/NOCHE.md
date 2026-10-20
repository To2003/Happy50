# Noche: registro de trabajo autónomo

Rama `claude/funny-ride-gbt756`, PR #2 en borrador. Nada mergeado, nada en main.
Si se corta la sesión: releer este archivo y `DESIGN.md` para retomar.

## Hecho

### P0: cierre de pantallas
- `/misiones`: tarjetas con tintes de la paleta (`card-*` nuevos), la misión
  completa muestra su foto con scrim bordó y un check; progreso dorado fino.
- `/book`: capítulos sin emoji, barra de capítulos sólida (`bg-bg`, sin blur) y
  `scroll-mt-20` para que el título no quede tapado; primera foto de cada
  capítulo en grande (2x2), como apertura de página.
- Admin: títulos en Fraunces (paleta y fuentes ya venían por tokens).
- Chequeo de invitado intacto. `git diff origin/main -- lib/guest.ts` da 0
  líneas, y en `app/{subir,misiones,galeria,entrar}/page.tsx` y `app/page.tsx`
  no hay ninguna línea +/- que toque `findExistingGuest`, `router.replace`,
  `createGuest` o `if (!guest)`.

### P1: sistema de diseño (pantallas de invitado)
- Componentes nuevos en `components/`: `Button` (+ `buttonClasses` para links),
  `Chip`, `Field` (`Input`, `Select`), `Card`, `PageHeader`, `Skeleton`,
  `Dialog` (+ `useDialogBehavior`), `Toast` (`useToast`), `EmptyState` con
  ícono, `Icon` con 16 trazos.
- Estados: hover (opacidad, solo puntero fino), focus (anillo global), active
  (press 0.97), disabled (40%), loading (spinner + `aria-busy`).
- `/subir`, `/entrar`, home, `/galeria`, `/misiones` y `/book` migradas.
  Skeletons en lugar de pantallas en blanco, errores con reintento, diálogo
  propio para borrar, toasts de éxito/error.
- `fix:` el confetti ya no se repite por cada foto vieja al volver a `/subir`.

### P2: movimiento
- Grilla -> visor con View Transitions (`lib/viewTransition.ts`) en galería y
  book. Mejora progresiva: sin soporte o con reduced-motion abre directo. Se
  espera hasta 300 ms a que la foto grande decodifique para no terminar en un
  recuadro vacío.
- Reveal de capítulos del book con IntersectionObserver: el estado oculto lo
  pone el JS, así que sin JS nunca queda nada escondido; al mostrarse queda
  `transform: none`.
- Confetti más corto (0,9-1,3 s), fino, fucsia/dorado/rosa. Toasts al subir
  ("¡Misión cumplida!" si la foto era de una misión). Contador de la noche
  re-entra cuando cambia el número. Skeleton con brillo (solo transform).

### P3: detalles de producto
- `loading.tsx`, `error.tsx` y `layout.tsx` (título) por ruta de invitado; no en
  `/tv` ni en el admin, para no tocarlos.
- 404 con el número grande de la home. Aviso de sin conexión bajo el nav con
  el copy del SPEC ("Se te cayó la conexión, lo reintentamos solos").
- Favicon, apple-icon, manifest (sin service worker) e imagen Open Graph con
  `next/og`. Usan subsets OFL de Fraunces y DM Sans (32 KB) en `app/_fonts`,
  sacados de los woff2 que ya baja `next/font` (no hay servicio nuevo).
- `robots.txt` que bloquea todo + `robots: noindex, nofollow` en el layout.
  `metadataBase` usa `NEXT_PUBLIC_SITE_URL` (variable que ya existía).
- Web Share en los visores: comparte el archivo (la foto se baja al abrir el
  visor para no perder el gesto en iOS); si no se puede, comparte la URL.
- Skip link "Saltar al contenido", `main#contenido`, `nav` con `aria-label`.
- En escritorio: contenedores con ancho máximo y grillas de 4-5 columnas.

### P4: crédito
- `components/CreditFooter.tsx` en home y al final de galería (cuando ya no hay
  más páginas) y de book. `CREDIT_URL` en `lib/credit.ts`, hoy `null`: se
  muestra el texto sin link hasta que la definas.

### P5: admin
- Sidebar en escritorio, tabs que scrollean en el celu, título por sección.
- Tablas con encabezado fijo (`AdminTable`); en el celu cada fila es un bloque.
- Diálogos propios para borrar misión, borrar mesa, arrancar momento y
  reasignar por rango (antes borraba sin confirmar). Toasts de éxito y error.
- Validación visible: título de misión vacío o repetido, código de mesa vacío
  o repetido, rango con "desde" posterior a "hasta".
- Carga por acción (spinner solo en el botón tocado), skeletons y estados vacíos.
- Stats: tres tarjetas (fotos en total, hora pico, la más votada) calculadas
  con lo que ya trae `getStatsAction`; barras simples, una sola serie.
- `refactor:` las 10 Server Actions de mutación devuelven `{ ok, error }`. En
  producción Next oculta el mensaje de los errores tirados en Server Actions,
  así que "¿código repetido?" o "¿todavía tiene invitados?" nunca llegaban.

## Decisiones
- Toasts sin estado global: `useToast()` es local a cada pantalla
  (CLAUDE.md pide no meter estado global sin preguntar).
- Admin conserva el emoji de misiones y momentos: ahí se administra ese dato.
- `PageHeader` lleva el festón; `EmptyState` ya no, para que no haya dos.
- Hero de `/subir` sigue tipográfico (no hay foto aprobada); `HERO_PHOTO` listo.
- Textos nuevos solo donde no existía copy (toasts): "¡Listo! Tu foto ya está
  en el álbum", "Listo, la foto se borró", "No se pudo borrar la foto. Probá de
  nuevo.", "No se pudo guardar el corazón. Probá de nuevo."

- Contenedores por ruta (`loading/error/layout`) en vez de uno raíz: el raíz
  también afectaría `/tv`.
- QA visual con un Supabase falso en HTTP local (mismo shape de datos) y
  Playwright, solo en el scratchpad: nada de eso entra al repo.

## Pendiente / Bloqueos
- (en curso) P5b lógica, P6 pulido.

## Probar a mano
- Admin, Mesas: crear una mesa con un código que ya existe en la base pero no
  en la lista (por ejemplo, otra pestaña): tiene que aparecer el toast "No se
  pudo crear la mesa (¿código repetido?)." en vez de un texto en inglés.
- Admin, Mesas: borrar una mesa con invitados: diálogo y toast "¿todavía tiene
  invitados asignados?".
- Galería y book en un celu real: tocar "Compartir" en el visor y mandar la
  foto por WhatsApp (tiene que ir la foto, no un link).
- "Agregar a inicio" en iOS y Android: ícono "50" fucsia y nombre "50 años".
- Pegar el link del deploy en WhatsApp: tiene que salir la tarjeta con el "50".
  Requiere `NEXT_PUBLIC_SITE_URL` cargada en Vercel.
- Volver a `/subir` después de subir fotos: no tiene que haber confetti ni
  toast por las que ya estaban listas. Subir una nueva: confetti + toast una vez.
