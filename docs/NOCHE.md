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
Hoy cualquier sesión (incluida la anónima) puede subir cualquier archivo de
cualquier tamaño al bucket, y un invitado puede cambiar cualquier columna de
sus propias fotos (`is_featured`, `hearts`, `caption`, `milestone_override_id`)
desde la consola del navegador. Migración sugerida `0007_hardening.sql`:

```sql
-- 1) Bucket: solo JPEG, hasta 2 MB (display ~300 KB; alta resolución ~900 KB).
update storage.buckets
  set allowed_mime_types = array['image/jpeg'], file_size_limit = 2097152
  where id = 'photos';

-- 2) Solo las carpetas que usa la app.
drop policy photos_bucket_insert_authenticated on storage.objects;
create policy photos_bucket_insert_authenticated on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] in ('display', 'thumb')
  );

-- 3) El invitado solo puede borrar (status = 'deleted') sus fotos.
revoke update on photos from anon, authenticated;
grant update (status) on photos to authenticated;
drop policy photos_update_own_guest on photos;
create policy photos_update_own_guest on photos
  for update
  using (exists (select 1 from guests g where g.id = photos.guest_id and g.user_id = auth.uid()))
  with check (
    status = 'deleted'
    and exists (select 1 from guests g where g.id = photos.guest_id and g.user_id = auth.uid())
  );
```
Antes de aplicar: probar en un proyecto de staging que subir, borrar la propia
foto y dar corazón sigan andando (el corazón actualiza `hearts` por trigger
`security definer`; verificar que el trigger no dependa del grant).

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
