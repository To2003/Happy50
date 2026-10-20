# DESIGN.md

Referencia corta de tokens y reglas visuales. Los valores viven en
`tailwind.config.ts` y `app/globals.css`; esto dice cuándo usar cada uno.
`/tv` está fuera de alcance: no se migra ni se anima.

## Paleta (modo claro)
- `bg` crema de fondo · `surface` tarjetas, inputs, botones secundarios.
- `ink` texto y tinte de sombras. Secundario: `text-ink/70` (nunca gris).
- `fuchsia` acción principal y selección · `gold` progreso · `rose` bordes,
  placeholders (`bg-rose/30`), hover/press de secundarios (`bg-rose/20`).
- `danger` errores y borrar · `card-*` pasteles de misiones.
- Visores de foto a pantalla completa: `bg-ink text-white`, no negro puro.

## Forma
- Botones: píldora (`rounded-full`). Principal `h-16` (CTA) o `h-14`;
  secundario `border-2 border-rose bg-surface`. Mínimo `h-12`.
- Tarjetas, inputs y miniaturas: `rounded-2xl`; misiones y diálogos `rounded-3xl`.
- Sombras: `shadow-soft` (reposo) y `shadow-lift` (diálogos, elevado).
- Títulos de invitado: `font-display` (Lilita) + `text-balance`. H1 `text-3xl`
  (`4xl` heros), H2 `text-2xl`; el resto Nunito, `text-base` mínimo.
- Contraste AA: texto secundario `text-ink/70` mínimo sobre crema/surface
  (`/80` sobre `bg-rose/40`); placeholders también `/70`. Nunca `/60` o menos.
- Táctil: invitado `h-12`+, admin `h-11` (44px) mínimo.
- Vacíos y errores de invitado: `<EmptyState>` (tarjeta con festón).
- Gesto de marca: `.scallop-edge`, una vez por pantalla entre hero y contenido.

## Movimiento
- Solo `transform` y `opacity`. UI en 150-400 ms (default 200 ms), curva
  `ease-out` = `cubic-bezier(0.23, 1, 0.32, 1)`.
- Press: botones `scale(0.97)` al tocar (global en `globals.css`); links con
  forma de botón llevan la clase `press`.
- Entradas: `animate-enter` (aparecer + subir 8px), `animate-page` (al
  montar una pantalla), `animate-pop` (corazón). Nada en loop salvo
  placeholders de carga (`animate-pulse`).
- Heros (home, `/subir`, `/entrar`): sin `animate-page`; título, texto y botón
  con `animate-enter` + `[animation-delay:60ms]`, `120ms`, `180ms`.
- Listas (`/galeria`, `/misiones`): `useInitialStagger(ids, ready)` de
  `lib/`. Escalona solo la primera tanda (máx. 12, 50 ms entre ítems); filtros,
  scroll infinito y refrescos aparecen sin animar.
- Las animaciones usan fill `backwards`: nunca dejan transform aplicado (si no,
  rompen los hijos `position: fixed`).
- `prefers-reduced-motion: reduce` corta todo (duración y delay) de forma
  global en `globals.css`; no hace falta repetirlo por componente.
- Foco: `:focus-visible` con borde fucsia de 3px, global. No sacar `outline`.
