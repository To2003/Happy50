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

## Decisiones
- Toasts sin estado global: `useToast()` es local a cada pantalla
  (CLAUDE.md pide no meter estado global sin preguntar).
- Admin conserva el emoji de misiones y momentos: ahí se administra ese dato.
- `PageHeader` lleva el festón; `EmptyState` ya no, para que no haya dos.
- Hero de `/subir` sigue tipográfico (no hay foto aprobada); `HERO_PHOTO` listo.
- Textos nuevos solo donde no existía copy (toasts): "¡Listo! Tu foto ya está
  en el álbum", "Listo, la foto se borró", "No se pudo borrar la foto. Probá de
  nuevo.", "No se pudo guardar el corazón. Probá de nuevo."

## Pendiente / Bloqueos
- (en curso) P2 movimiento, P3 detalles de producto, P4 crédito, P5 admin,
  P5b lógica, P6 pulido.

## Probar a mano
- Volver a `/subir` después de subir fotos: no tiene que haber confetti ni
  toast por las que ya estaban listas. Subir una nueva: confetti + toast una vez.
