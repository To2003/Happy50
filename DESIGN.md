# DESIGN.md

Cuándo usar cada token (valores en `tailwind.config.ts` y `app/globals.css`).
`/tv` está fuera de alcance: no se migra ni se anima.

## Dirección: editorial cálida (modo claro)
- `bg` crema rosado · `surface` inputs y tarjetas · `ink` bordó, texto (secundario
  `text-ink/70`, nunca gris) · `fuchsia` único acento: acciones y activo ·
  `gold` solo filetes (festón, indicador, progreso), nunca texto · `rose` bordes
  y placeholders · `danger` errores · `card-*` tintes de misiones.
- Hero de `/subir`: campo `bg-ink`; con `HERO_PHOTO` pasa a foto (`next/image`,
  priority, 42svh fijo, degradado solo abajo). Visores: `bg-ink text-white`.
- Fuentes: Fraunces (`font-display`, SOFT 50) solo títulos con `text-balance`;
  DM Sans el resto, `text-base` mínimo, botones `font-semibold`.

## Componentes (`components/`): usar antes de escribir clases
- `Button` (`primary|secondary|danger|ghost`, `lg|md|sm` = 64/56/44 px, `icon`,
  `loading`) y `buttonClasses()` para links. `Chip` (opción con check).
- `Input`/`Select` (`Field.tsx`, `invalid` + mensaje al lado), `Card`, `Dialog`
  (confirmaciones; `useDialogBehavior` en visores), `useToast()` local por pantalla.
- `PageHeader` (H1 + festón, una vez por pantalla), `EmptyState` (vacío/error con
  ícono), `Skeleton` (brillo), `Icon` (trazos Lucide 1.5, cero emojis en UI).
- Admin: `AdminTable` (encabezado fijo; en el celu filas en bloque), `AdminSkeleton`.
- Radios: botones `rounded-full`, tarjetas `rounded-2xl`, miniaturas `rounded-xl`.
- Sombras: `shadow-soft` solo en la acción principal; `shadow-lift` en lo que flota.
- Ancho: invitado `max-w-xl` (formularios) o `max-w-5xl` (grillas de 3/4/5 col).
- AA: `/70` mín. sobre crema (`/80` sobre `bg-rose/40`). Táctil: 44 px mínimo.

## Movimiento
- Solo `transform` y `opacity`, 150-400 ms, `ease-out` = `cubic-bezier(0.23, 1,
  0.32, 1)`. Fill `backwards`: nunca queda transform aplicado (rompe los `fixed`).
- Press `scale(0.97)` global en botones y `.press`; hover solo con puntero fino.
- `animate-enter` (aparecer + 8 px), `animate-page`, `animate-pop` (corazón),
  `animate-grow` (indicador del nav). Loops solo en carga (`Skeleton`, spinner).
- Heros: `animate-enter` + `[animation-delay:60ms|120ms|180ms]`, sin `animate-page`.
- Listas: `useInitialStagger(ids, ready)` (`lib/`), solo la primera tanda, máx.
  12, 50 ms entre ítems.
- Book: capítulos con reveal (IntersectionObserver, `.reveal-hidden` lo pone el JS).
- Grilla -> visor: `morphOpen`/`morphClose` (`lib/viewTransition.ts`), clase
  `vt-foto` en la foto del visor. Mejora progresiva.
- Confetti fucsia/dorado solo al terminar una subida; toast acompaña.
- `prefers-reduced-motion` corta todo de forma global (duración, delay y View
  Transitions). Foco: `:focus-visible` fucsia de 3 px, global; no sacar `outline`.
