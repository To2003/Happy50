# Noche: registro de trabajo autónomo

Rama `claude/funny-ride-gbt756`. Los PR #2, #3 y #4 ya están mergeados en
main; el cambio de diseño (estilo de la invitación) sale de una rama
reiniciada desde main.
Si se corta la sesión: releer este archivo y `DESIGN.md` para retomar.

## Cambio de diseño: estilo de la invitación

Rama `claude/funny-ride-gbt756` reiniciada desde `origin/main` (el PR #4 ya
estaba mergeado). Paso 1 (tokens, `/subir`, home) aprobado; paso 2 hecho.

Paso 2:
- "Ine" con contorno de 1 px del mismo color (`-webkit-text-stroke`): más
  cerca del pincel, sin que se peguen las letras (comparado de nuevo).
- Privacidad: sin "Compartir" ni Web Share; sin imagen Open Graph,
  descripción, `og:*` ni `twitter:*`; título "Álbum" (por pantalla, "Galería ·
  Álbum"). Siguen `noindex, nofollow` y `robots.txt` bloqueando todo.
  Verificado en el HTML servido. Ojo: algunas apps igual pueden mostrar el
  favicon o el título "Álbum" junto al link; foto o tarjeta, no.
- Títulos de pantalla en Anton, mayúsculas, rojo `#C8302B`: galería,
  misiones, book (y capítulos), entrar, 404 y error. A 360 px ninguno se corta
  (el más largo, "EL BOOK DE LA NOCHE", entra en una línea; los demás pueden
  pasar a dos con `text-balance`). Anton tiene un solo peso: se sacó
  `font-semibold` de todo lo que usa `font-display` (si no, el navegador
  inventa una negrita deforme).
- Chips y vacíos con borde rosa, íconos rojos; misiones con tintes rosas,
  ícono rojo y progreso rojo sobre rosa; nav con activo e indicador rojos;
  visor con corazón rosa y "Borrar" en blanco; aviso sin conexión en rojo;
  inputs y selects con borde rojo; diálogos con título en DM Sans (las
  preguntas largas en Anton cansan).
- Admin: solo colores y tipografías (títulos en Anton rojo).
- Íconos: "50" en Anton rosa sobre rojo (subset de Anton de 4 KB; se sacaron
  los de Fraunces y DM Sans). Manifest y `theme-color` en `#FFF0F7`.

- Paleta medida de la invitación: fondo `#FFF0F7`, superficies `#FFF8FB`,
  rojo de la invitación `#E64741` (superficies grandes, texto blanco >= 24 px),
  rojo accesible `#C8302B` (botones, texto rojo, links, activo), rosa
  `#FEA3E0` (solo decorativo), texto `#4A1626` y `#7A4D5A`. Sin dorado.
- Manuscrita: Nothing You Could Do. Comparada lado a lado con el "Ine" de la
  invitación contra Mansalva, Reenie Beanie y Caveat Brush: es la única con
  trazo fino, mayúscula alta inclinada y la "ne" ligada; las otras son
  gruesas o de trazo parejo.
- Tarjeta (`components/InviteCard.tsx`): HELLO, 50, Ine y la copa en SVG,
  aria-hidden, medidas en `cqw` calculadas con las métricas de Anton. Variante
  `banner` (3:2, alto <= 38svh) en `/subir`; `poster` (4:5) en la home. Sin
  fecha, lugar, hora ni "¡Te espero!".
- `/subir`: se retira `HERO_PHOTO`; el hero ahora es la tarjeta.
- Home: el H1 "50 años" queda solo para lectores de pantalla (`sr-only`): la
  tarjeta lo muestra y es decorativa; el contexto visible es la bajada y el
  botón "Sumate".

### Contraste de todos los pares texto/fondo y de componentes

Recalculado con los cambios del 22/10: fondo `#FFE0F1`, superficies
`#FFF0F7`, texto rojo `#B92A27` y tintes de misión más claros que el fondo.

**Texto** (AA: 4,5 normal, 3 grande)

| Texto | Fondo | Uso | Contraste | Normal | Grande |
|---|---|---|---|---|---|
| `#4A1626` | `#FFE0F1` | Texto principal | 11.98 | sí | sí |
| `#4A1626` | `#FFF0F7` | Texto en tarjetas, inputs, chips y píldora inactiva | 13.29 | sí | sí |
| `#7A4D5A` | `#FFE0F1` | Texto secundario | 5.66 | sí | sí |
| `#7A4D5A` | `#FFF0F7` | Texto secundario en tarjetas | 6.28 | sí | sí |
| `#4A1626` al 70% | `#FFE0F1` | Secundario text-ink/70 | 5.15 | sí | sí |
| `#4A1626` al 70% | `#FFF0F7` | text-ink/70 en tarjetas y vacíos | 5.49 | sí | sí |
| `#B92A27` | `#FFE0F1` | Todo texto rojo: títulos, links, botón secundario | 5.02 | sí | sí |
| `#B92A27` | `#FFF0F7` | Texto rojo en tarjetas, selects y nav inactiva | 5.57 | sí | sí |
| `#FFFFFF` | `#C8302B` | Botón principal, nav activa, chip activo, aviso sin conexión | 5.37 | sí | sí |
| `#FFFFFF` | `#9B2C2C` | Botón "Sí, borrar" | 7.53 | sí | sí |
| `#FFFFFF` | `#E64741` | Blanco sobre rojo invitación (solo >= 24 px) | 3.93 | no | sí |
| `#9B2C2C` | `#FFE0F1` | Errores | 6.16 | sí | sí |
| `#9B2C2C` | `#FFF0F7` | Errores en tarjetas | 6.83 | sí | sí |
| `#4A1626` | `#FFF0F7` | Misión card-rose | 13.29 | sí | sí |
| `#4A1626` | `#FFEEEA` | Misión card-gold | 13.02 | sí | sí |
| `#4A1626` | `#FFF6FB` | Misión card-mauve | 13.83 | sí | sí |
| `#4A1626` | `#FFF4EE` | Misión card-peach | 13.55 | sí | sí |
| `#FFFFFF` | `#4A1626` | Visor, "Borrar", toast | 14.65 | sí | sí |
| `#C8302B` | `#FFE0F1` | NO usar en texto chico: por eso existe accent-text (control) | 4.39 | no | sí |
| `#E64741` | `#FFE0F1` | NO usar en texto chico (control) | 3.22 | no | sí |
| `#FEA3E0` | `#FFE0F1` | NO usar en texto (control) | 1.49 | no | no |

**Componentes e íconos** (AA 1.4.11: 3 para bordes de controles e íconos con significado)

| Elemento | Fondo | Uso | Contraste | 3:1 |
|---|---|---|---|---|
| `#C8302B` | `#FFE0F1` | Borde de botón secundario, píldoras de nav, inputs (sobre la página) | 4.39 | sí |
| `#C8302B` | `#FFF0F7` | Borde de inputs y selects sobre tarjeta | 4.87 | sí |
| `#B92A27` | `#FFF0F7` | Ícono de misión pendiente (card-rose) | 5.57 | sí |
| `#C8302B` | `#FEA3E0` al 70% sobre bg | Barra de progreso: relleno sobre la pista | 3.31 | sí |
| `#B92A27` | `#FFEEEA` | Ícono de misión pendiente (card-gold, el más oscuro) | 5.45 | sí |
| `#FEA3E0` | `#4A1626` | Corazón e ícono del toast sobre bordó | 8.04 | sí |
| `#FEA3E0` | `#E64741` | HELLO / 50 (decorativo, aria-hidden) | 2.16 | no (decorativo) |

`#C8302B`, `#E64741` y `#FEA3E0` nunca van en texto chico: los controles lo
confirman (4,39, 3,22 y 1,49 sobre el fondo #FFE0F1); el texto rojo usa
`#B92A27`. Los únicos "no" son decorativos (aria-hidden) o
texto blanco grande sobre el rojo de la invitación, que pasa como texto grande.

## Privacidad: cómo se controla hoy el acceso (solo informe, sin cambios)

**Respuesta corta: sí, cualquiera con la URL puede entrar y ver las fotos.**
No hay contraseña, código de invitación ni lista de invitados.

- **Para subir fotos** (`/subir`, `/misiones`) hace falta ser "invitado": en
  `/entrar` se escribe un nombre y se elige una mesa (o viene del QR). Eso crea
  una sesión anónima de Supabase y una fila en `guests`. Cualquiera que abra la
  URL puede hacerlo; no se valida quién es.
- **Para ver fotos no hace falta ni eso:** `/galeria`, `/book` y
  `/book/mesa/<código>` no piden invitado (no redirigen). Muestran todas las
  fotos visibles a cualquiera que abra el link.
- **La base es legible con la clave pública:** la clave anon viaja en el
  JavaScript (es pública por diseño). Con ella, las políticas RLS dejan leer
  fotos visibles (`photos_select_visible`), nombres de invitados
  (`guests_select_public`), mesas, misiones, momentos y corazones. Alguien
  técnico puede listar todo con la API, sin pasar por la app.
- **Los archivos son públicos:** el bucket `photos` es público; cada foto
  tiene una URL directa (ruta UUID, no adivinable) que abre sin sesión, también
  después de un borrado lógico.
- **`/tv`:** pide `?key=` igual a `NEXT_PUBLIC_TV_KEY`, pero la comparación es
  en el navegador y la clave está en el bundle: evita entradas por accidente,
  no es seguridad.
- **Admin:** sí está protegido (contraseña en el servidor, cookie HMAC
  httpOnly).
- **Lo que sí frena la difusión:** `noindex`/`nofollow` y `robots.txt` (no
  aparece en buscadores) y, desde este cambio, sin tarjeta al pegar el link.
  Nada de eso impide entrar a quien tenga la URL.

Si quisieras cerrarlo, las opciones van de liviana a fuerte: un código de la
fiesta en `/entrar` (frena el reenvío casual, no a quien lo tenga); exigir
invitado también en `/galeria` y `/book` (cambio de app); y RLS que solo deje
leer a sesiones con fila en `guests` (cambio de base). Ninguna aplicada.

## Bug en producción: "Borrar" en /galeria (iPhone Safari)

**Causa más probable (no es regresión de anoche):** el borrado era un
`UPDATE photos SET status = 'deleted'` directo desde el navegador. Con RLS,
Postgres exige que la fila nueva de un UPDATE con WHERE siga visible por las
políticas de SELECT; la única es `photos_select_visible` (`status =
'visible'`), así que el UPDATE falla con 42501 "new row violates row-level
security policy". El código del borrado es idéntico en e2a3725 y en main; en
e2a3725 el `catch` se tragaba el error (el diálogo se cerraba y la foto seguía
ahí) y desde anoche se muestra como toast. No es propio de iPhone: pasa en
cualquier navegador.

Hipótesis, de más a menos probable, y cómo confirmarlas:
1. **Fila nueva invisible por la política de SELECT (42501).** Confirmar con
   el bloque 0 de `sql/propuesta-seguridad.sql`, o en Safari > Desarrollo >
   inspector web del iPhone: el `PATCH /rest/v1/photos?id=eq...` responde 403
   con `"code":"42501"`.
2. **"Foto propia" que no coincide** (la sesión anónima cambió: Safari borra
   el almacenamiento de sitios no visitados en 7 días y crea otro usuario).
   Poco probable: el botón Borrar solo aparece si `guest.id === photo.guest_id`
   para la sesión actual. Confirmar: en Supabase, `select user_id from guests
   where id = '<guest_id de la foto>'` contra el `sub` del JWT de la sesión.
3. **0 filas afectadas tratadas como error.** Descartada para el síntoma: con
   el código viejo 0 filas no daba error (la foto desaparecía de la grilla y
   volvía al recargar). El nuevo endpoint lo trata como `not_found`, no como éxito.
4. **Falta una política DELETE.** No aplica: el borrado es lógico (UPDATE), no
   hay DELETE en la tabla ni en `storage.objects`.
5. **Variable de entorno ausente en Vercel.** No aplicaba al código viejo (usaba
   la clave anon). Con el arreglo SÍ aplica: la ruta usa
   `SUPABASE_SERVICE_ROLE_KEY`; si falta, responde 503 `misconfigured` y lo
   loguea.
6. **Orden fila/archivo.** No aplica: el archivo de Storage no se borra nunca
   (SPEC §6); el borrado es un único UPDATE de una fila, no puede quedar a medias.

**Arreglo (sin tocar RLS ni esquema):** `DELETE /api/photos/[id]`. Verifica el
JWT del invitado contra Supabase Auth, busca su `guest`, comprueba que la foto
sea suya y marca `status = 'deleted'` con la clave de servicio en un único
`UPDATE ... WHERE id = ? AND guest_id = ?`. Responde `401 no_session`,
`403 not_owner`, `404 not_found`, `503 misconfigured` o `500 server_error`;
el detalle técnico va a `console.error` (logs de Vercel), al invitado le llega
un mensaje humano que distingue "no es tuya" de "probá de nuevo". 11 tests
nuevos (`tests/deletePhoto.test.mts`), más una prueba de la ruta real contra
un Supabase falso (401, 401, 404, 403, 200 y 503 sin la clave de servicio).
Es una excepción a "las escrituras de invitado van directo a Supabase"
(CLAUDE.md): si se aplica el bloque A del SQL se podría volver al borrado
directo, pero la ruta ya funciona sin cambiar la base.

**Qué verificar vos:**
- Vercel > Settings > Environment Variables: `SUPABASE_SERVICE_ROLE_KEY` cargada
  en Production (la usa también el admin; si el admin anda, está).
- Después del deploy: borrar una foto propia desde el iPhone. Tiene que
  desaparecer y no volver al recargar. En Supabase:
  `select status from photos where id = '<id>'` debe dar `deleted`.
- Vercel > Logs, filtrar por `[borrar foto]`: no debería haber errores.
- Corazones (hallazgo aparte, ver bloque B del SQL): comparar `photos.hearts`
  con `count(*)` de `hearts` en una foto ajena con votos.

### La clave de servicio no llega al cliente (verificado)
- `SUPABASE_SERVICE_ROLE_KEY` aparece solo en `lib/supabase/server.ts` (más
  `.env.local.example` y este archivo). Nunca con prefijo `NEXT_PUBLIC_`.
- `lib/supabase/server.ts` arranca con `import 'server-only'`: si un Client
  Component lo importara, el build falla. Lo importan solo
  `app/admin/actions.ts` (`'use server'`), `app/admin/export/route.ts` y
  `app/api/photos/[id]/route.ts` (route handlers, siempre servidor).
- Build con la clave en un valor centinela: 0 apariciones del valor y 0 del
  nombre de la variable en `.next/static` (lo que se manda al navegador). Como
  control, la clave anon sí aparece (6 archivos), así que la búsqueda funciona.
  Los dos archivos de `static/chunks/app/api` son stubs de 225 bytes, iguales
  al de `/api/health`, sin lógica.

### Qué pasa con el archivo después de un borrado lógico (propuesta, NO implementada)
**Hoy:** el borrado solo pone `status = 'deleted'`; los archivos
`display/<id>.jpg` y `thumb/<id>.jpg` quedan en Storage. El bucket `photos` es
público (`0003_storage.sql`), así que la URL de una foto "borrada" sigue
abierta para cualquiera que la tenga, sin sesión. La ruta es un UUID (no se
adivina), pero la tienen quienes la vieron: caché del navegador, `/tv`, el link
compartido (Web Share manda el archivo y, solo si no puede, la URL) o quien la
copió. Además las subidas no fijan `cacheControl`, así que el CDN de Supabase
usa el default de 3600 s: aun borrando el archivo, una copia en caché puede
servirse hasta una hora más. La app ya no la muestra en ningún lado (galería,
book, misiones, admin y el manifiesto del book filtran `deleted`).

**Choca con el SPEC:** SPEC §6 dice "nunca se borra el archivo del storage ni
la fila". Borrar de verdad es una decisión de producto tuya; si va, hay que
actualizar SPEC §6 y CLAUDE.md.

**Cómo borrarla de verdad (si lo decidís):** en la misma ruta
`DELETE /api/photos/[id]`, después de verificar la autoría:
1. Primero el UPDATE a `status = 'deleted'` (fuente de verdad: con eso deja de
   verse en toda la app).
2. Después `storage.from('photos').remove([storage_path, thumb_path])` con la
   clave de servicio (los paths salen de la fila, nunca del cliente).
3. Si el remove falla, igual responder 200 (para el invitado la foto ya no
   está) y loguear `[borrar foto] archivo huérfano`. Nunca al revés: borrar el
   archivo primero deja una fila visible con la imagen rota.
4. Para los huérfanos, un botón de admin "Limpiar archivos de fotos borradas"
   (Server Action con clave de servicio) que recorra `status = 'deleted'` y
   reintente el remove. Sirve también para las fotos ya borradas antes.
5. Opcional: subir con `cacheControl` corto (por ejemplo 300 s) para que el
   CDN olvide antes; cuesta más egress.

**Convivencia con un "Deshacer":** hoy la app no tiene "Deshacer" (no lo
encontré en el código ni en este registro; si lo pediste en otro lado,
avisame). Si se suma:
- Restaurar también necesita una ruta de servidor (`POST
  /api/photos/[id]/restore`) con las mismas verificaciones: token válido,
  invitado de la sesión, `photo.guest_id` igual al invitado, y además que la
  foto esté en `deleted`. Desde el cliente no se puede: la fila borrada no es
  visible por `photos_select_visible`, así que el UPDATE no la encuentra.
- El borrado del archivo no puede ser inmediato: si el remove corre en el
  mismo momento, no hay nada que restaurar. Opciones: (a) "Deshacer" solo
  durante el toast (unos 5 s) y el remove recién al vencer; con wifi malo o si
  cierran la pestaña, queda huérfano hasta la limpieza del admin; (b) agregar
  `deleted_at` a `photos` (cambio de esquema) y que la limpieza del admin
  borre los archivos de las fotos con más de N minutos en `deleted`; el
  restore solo vale dentro de esa ventana. La (b) es la consistente; la (a)
  no toca el esquema.
- Mientras no se borre el archivo, "Deshacer" es trivial: vuelve
  `status = 'visible'`. Las moderadas por el admin (`hidden`) no se pueden
  restaurar desde el invitado.

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

### P5b: lógica (commits `fix:` / `refactor:`, cada uno revertible)
- `fix:` subida idempotente. `storage.upload` usa `upsert: false`: si la foto
  grande subía y después fallaba la miniatura o el insert, cada reintento
  chocaba con "ya existe" y la foto quedaba en Falló para siempre (incluso con
  Reintentar). Ahora 409 en Storage y 23505 en el insert cuentan como éxito.
- `fix:` sin conexión la cola espera al evento `online` y no gasta intentos;
  al terminar suelta la foto grande de IndexedDB (queda la miniatura).
- `fix:` "Preparando…" visible mientras se procesa; antes la selección se
  vaciaba al instante y el error de procesamiento no se veía nunca.
- `fix:` "Descartar" en fotos que fallaron (`removeItem`).
- `fix:` home y `/subir` sin red ya no quedan en blanco (faltaba `catch`).
  Solo cambia el camino de error; sin invitado redirige igual que antes.
- `fix:` `/galeria` muestra error con reintento en vez de "no hay fotos".
- `fix:` una foto que falló ya no dice "lo reintentamos solos".
- `fix:` contraseña de admin comparada a tiempo constante.
- `refactor:` mutaciones del admin devuelven `{ ok, error }` (ver P5).
- `refactor:` `lib/book.ts` (agrupado del timeline), `lib/retry.ts` (bucle de
  reintentos con entorno inyectado), `lib/uploadErrors.ts`. 13 tests con
  `node:test` (`npm test`), sin dependencias nuevas.
- `refactor:` Momentos del admin usa miniaturas (60 x 300 KB -> 60 x 40 KB).
- `refactor:` bandera `ENABLE_HIGH_RES_DISPLAY` (apagada), ver abajo.
- Tope de subidas simultáneas: ya era 1 (el processor sube de a una). Se deja.
- Orientación EXIF: ya correcta (`createImageBitmap(..., { imageOrientation:
  'from-image' })`, también en el fallback HEIC). Sin cambios.
- Paginación: galería ya pagina; el book trae todas las filas de una (JSON
  liviano) y las imágenes cargan con `loading="lazy"` + reveal. Se deja.

### P6: pulido y rendimiento
- `next/image` solo en el hero (`HERO_PHOTO`, `sizes="100vw"`, priority). Las
  fotos de invitados siguen en `<img loading="lazy" decoding="async">` a
  propósito: pasarlas por la optimización de imágenes de Vercel gastaría la
  cuota del plan con cientos de fotos y pediría configurar el dominio de
  Supabase. Las grillas ya reservan el lugar (`aspect-square`): sin saltos.
- Fuentes: Fraunces solo con ejes `wght` + `SOFT`, DM Sans solo `wght`, subset
  latin y `display: swap` (verificado en los woff2 que genera `next/font`).
- Primera carga: 103 KB de JS compartido; las rutas de invitado 170-185 KB.
- Se borró `public/ines.jpg` (silueta placeholder sin uso).
- Sin `rounded-lg`, `neutral-*`, `pink-*` ni emojis en el JSX de invitado.
- 404 sin scroll horizontal; estado vacío en `/misiones` sin misiones.
- QA visual a 360x640, 390x844, 768x1024 y 1280x800 de home, `/entrar`,
  `/subir`, `/galeria` (+ visor), `/misiones`, `/book`, 404 y admin (todas las
  tabs), con datos y vacíos: sin scroll horizontal en ninguna.

### Redimensionado en el cliente: ya existía
El pipeline (`lib/pipeline/compress.ts`) siempre redimensionó: la versión
"display" es de 1600 px de lado largo y ~300 KB, y el original nunca se sube.
Por eso no agregué `ENABLE_CLIENT_RESIZE` (sería un no-op confuso): agregué
`ENABLE_HIGH_RES_DISPLAY = false`, que con `true` sube la display a 2400 px y
calidad 0,85 (~900 KB).
- Impacto en el book impreso: 1600 px a 300 dpi = 13,5 cm de lado largo (bien
  para fotos chicas; justo para media página). 2400 px = 20 cm a 300 dpi o
  30 cm a 200 dpi (alcanza para una A4 a sangre). Página completa A4 a 300 dpi
  pediría ~3500 px.
- Costo: ~3 veces más Storage y egress, y subidas más lentas con wifi malo.
- Solo afecta fotos nuevas. Decidir antes de la fiesta, no durante.

## Decisiones
- Toasts sin estado global: `useToast()` es local a cada pantalla
  (CLAUDE.md pide no meter estado global sin preguntar).
- Admin conserva el emoji de misiones y momentos: ahí se administra ese dato.
- `PageHeader` lleva el festón; `EmptyState` ya no, para que no haya dos.
- Hero de `/subir` sigue tipográfico (no hay foto aprobada); `HERO_PHOTO` listo.
- Textos nuevos solo donde no existía copy (ningún texto existente cambió de
  redacción; solo "..." pasó a "…"): toasts ("¡Listo! Tu foto ya está en el
  álbum", "¡Misión cumplida! Tu foto ya está en el álbum", "Listo, la foto se
  borró", "No se pudo borrar la foto. Probá de nuevo.", "No se pudo guardar el
  corazón. Probá de nuevo."), "Compartir", "Descartar", "Saltar al contenido",
  error de ruta ("Algo no salió bien", "Puede ser la conexión. Probá de nuevo;
  tus fotos en cola no se pierden.", "Ir al inicio"), 404 ("No encontramos esta
  página", "Puede que el link esté mal escrito. Volvé al inicio y seguí desde
  ahí."), "Todavía no hay misiones. Volvé en un rato.", error de carga de
  galería, y en el admin: validaciones, títulos de diálogos y toasts de éxito.
- Contenedores por ruta (`loading/error/layout`) en vez de uno raíz: el raíz
  también afectaría `/tv`.
- QA visual con un Supabase falso en HTTP local (mismo shape de datos) y
  Playwright, solo en el scratchpad: nada de eso entra al repo.

- `ENABLE_HIGH_RES_DISPLAY` en vez de `ENABLE_CLIENT_RESIZE` (ver arriba).
- Tests con `node:test` + `--experimental-strip-types` (Node 22) en vez de
  sumar Vitest: cero dependencias. Los módulos testeados no importan alias `@/`.

## Pendiente / Bloqueos

### Propuestas de seguridad (NO aplicadas: tocan RLS/Storage)
Todo el SQL, con explicación y cómo deshacer cada bloque, está en
`sql/propuesta-seguridad.sql` (reemplaza la migración 0007 que estaba acá).
- Límite de uso: no hay tope de fotos por invitado. Si preocupa, un trigger
  `before insert` que rechace más de N fotos por `guest_id` por hora.
- Login del admin: sin límite de intentos. Mitigación sin código: que
  `ADMIN_PASSWORD` sea larga y aleatoria (16+ caracteres). Si hace falta más,
  una regla de rate limit del firewall de Vercel sobre `POST /admin`.

### Otros pendientes
- `CREDIT_URL` en `lib/credit.ts` (hoy `null`).
- `HERO_PHOTO` en `app/subir/page.tsx` cuando haya foto aprobada (< 150 KB).
- Decidir `ENABLE_HIGH_RES_DISPLAY` antes de la fiesta.
- `NEXT_PUBLIC_SITE_URL` en Vercel para que la imagen Open Graph salga con URL
  absoluta (si no está, Next usa una URL relativa y WhatsApp no la muestra).
- Las filas de la cola de `/subir` con fotos de verdad (progreso, Reintentar,
  Descartar) no salieron en las capturas: la cola vive en IndexedDB y no la
  sembré en la QA. Probar a mano (lista abajo).

## Probar a mano
Cambios de lógica que no pude verificar contra el backend real (solo con
tests y un Supabase falso):
- Subida con wifi malo: en `/subir`, subir 3 fotos y activar modo avión a
  mitad de la subida. Tiene que quedar en "Subiendo" sin gastar intentos;
  al volver la red, termina sola. Ninguna debería quedar en "Falló".
- Subida idempotente: con las DevTools en "Slow 3G", subir una foto y cortar
  la red justo después de que suba la grande (antes de la miniatura). Al
  volver, tiene que terminar en "Lista" (antes quedaba en "Falló").
- Reintentar / Descartar: forzar un fallo (por ejemplo, borrando la sesión
  en localStorage) y probar los dos botones.
- Volver a abrir `/subir` después de subir: no tiene que haber confetti.
- Abrir `/subir` sin red con una sesión ya creada: tiene que verse la
  pantalla (antes quedaba en blanco) y poder elegir fotos, que esperan en cola.
- Admin: entrar con la contraseña correcta y con una incorrecta.
- Admin, Momentos: "Arrancar ahora" pide confirmación; reasignar por rango
  con "desde" posterior a "hasta" muestra el error y no llama al servidor.
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
