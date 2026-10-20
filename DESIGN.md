# DESIGN.md

Cuándo usar cada token (valores en `tailwind.config.ts` y `app/globals.css`).
`/tv` está fuera de alcance: no se migra ni se anima.

## Dirección: editorial cálida (paleta en modo claro)
- `bg` crema rosado · `surface` inputs y secundarios · `ink` bordó, texto
  (secundario `text-ink/70`, nunca gris) · `fuchsia` único acento: acciones y
  activo · `gold` solo filetes y detalles (festón, indicador), nunca texto.
- `rose` bordes y placeholders (`bg-rose/30`) · `danger` errores · `card-*` misiones.
- Hero de `/subir`: campo `bg-ink` a sangre; con `HERO_PHOTO` pasa a foto
  (`next/image`, priority, 42svh fijo, degradado solo en el 45% inferior).
  Visores de foto: `bg-ink text-white`, no negro puro.

## Forma y tipo
- Títulos: Fraunces (`font-display`, SOFT 50, -0.02em) + `text-balance`. H1
  `text-3xl`/`4xl`, H2 `text-2xl`; el "50" de la home es el único gigante.
- Texto: DM Sans, `text-base` mínimo; botones y etiquetas `font-semibold`.
- Botones píldora: principal `bg-fuchsia` `h-16`/`h-14`; secundario
  `border border-ink/20 bg-surface`. Bordes de 1px, nunca `border-2`.
- Íconos: `<Icon name>` (trazos Lucide inline, 1.5). Cero emojis, tampoco los
  `emoji` de misiones y momentos que vienen de la base.
- Radios `rounded-2xl` (miniaturas `xl`). Sombras: `soft` en la acción
  principal, `lift` en lo que flota.
- AA: `/70` mín. sobre crema (`/80` sobre `bg-rose/40`). Táctil: invitado
  `h-12`+, admin `h-11`. Vacíos y errores: `<EmptyState>`.
- Gesto de marca: `.scallop-edge` (festón dorado fino), una vez por pantalla.

## Movimiento
- Solo `transform` y `opacity`. UI en 150-400 ms (default 200 ms), curva
  `ease-out` = `cubic-bezier(0.23, 1, 0.32, 1)`.
- Press: botones `scale(0.97)` al tocar (global en `globals.css`); links con
  forma de botón llevan la clase `press`.
- Entradas: `animate-enter` (aparecer + subir 8px), `animate-page` (al
  montar una pantalla), `animate-pop` (corazón). Nada en loop salvo
  placeholders de carga (`animate-pulse`).
- Heros (home, `/subir`, `/entrar`): sin `animate-page`; título, texto, botón
  con `animate-enter` + `[animation-delay:60ms]`, `120ms`, `180ms`.
- Listas (`/galeria`, `/misiones`): `useInitialStagger(ids, ready)` de
  `lib/`. Escalona solo la primera tanda (máx. 12, 50 ms entre ítems); filtros,
  scroll infinito y refrescos aparecen sin animar.
- Fill `backwards`: no dejan transform aplicado (rompería los `position: fixed`).
- `prefers-reduced-motion: reduce` corta todo (duración y delay) de forma
  global en `globals.css`; no hace falta repetirlo por componente.
- Foco: `:focus-visible` con borde fucsia de 3px, global. No sacar `outline`.
