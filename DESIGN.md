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
- Títulos: `font-display` (Lilita). H1 `text-3xl`/`4xl`, H2 `text-2xl`.
  Cuerpo `text-base` mínimo.
- Gesto de marca: `.scallop-edge`, una vez por pantalla entre hero y contenido.

## Movimiento
- Solo `transform` y `opacity`. UI en 150-400 ms (`duration-150`, `200`,
  `250`, `400`), curva `ease-out` = `cubic-bezier(0.23, 1, 0.32, 1)`.
- Duración por defecto de `transition`: 200 ms.
- Press: botones `scale(0.97)` al tocar (global en `globals.css`); links con
  forma de botón llevan la clase `press`.
- Entradas: `animate-enter` (aparecer + subir 8px), `animate-page` (al
  montar una pantalla), `animate-pop` (corazón). Nada en loop salvo
  placeholders de carga (`animate-pulse`).
- `prefers-reduced-motion: reduce` corta todo de forma global en `globals.css`;
  no hace falta repetirlo por componente.
- Foco: `:focus-visible` con borde fucsia de 3px, global. No sacar `outline`.
