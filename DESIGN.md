# DESIGN.md

Cuándo usar cada token (valores en `tailwind.config.ts` y `app/globals.css`).
`/tv` está fuera de alcance: no se migra ni se anima. Contrastes: docs/NOCHE.md.

## Dirección: la invitación del cumple
- `bg` #FFE0F1 (más claro que `blush`) · `surface` #FFF0F7 tarjetas, inputs,
  píldoras; `card-*` también más claros que `bg` · `ink` · `muted`/`ink/70`.
- `accent` #C8302B: rellenos (botones con texto blanco), bordes, festón; nunca
  texto (4,39 sobre `bg`). `accent-text` #B92A27: todo texto rojo.
- `invite` #E64741: superficies grandes (tarjeta); blanco solo >= 24 px.
- `blush` #FEA3E0: solo decorativo (HELLO, 50, corazón, pista del progreso al
  70%, placeholders). Nunca texto. `rose` bordes suaves · `danger` errores ·
  visores de foto `bg-ink text-white`. Sin dorado.
- Tarjeta `InviteCard` (decorativa, aria-hidden): `banner` en `/subir` (alto
  <= 38svh), `poster` en la home. Medidas en `cqw` con métricas de Anton.

## Tipografía
- Anton (`font-display`, peso único: nunca `font-semibold`): títulos de
  pantalla en mayúsculas y `text-accent-text`, con `text-balance`.
- Nothing You Could Do (`font-script`): solo "Ine", con contorno de 1 px.
- DM Sans para el resto, `text-base` mínimo; títulos de diálogo en DM Sans.

## Componentes (`components/`): usar antes de escribir clases
- `Button` (`primary|secondary|danger|ghost`, `xl|lg|md|sm` = 72/64/56/44 px,
  sin partir líneas; `xl` solo en /subir), `buttonClasses()` para links,
  `Chip` (borde rosa; activo rojo). `TopNav`: tres píldoras de 48 px (barra
  de 4rem); activa `bg-accent`, inactiva `bg-surface` con borde de 1,5 px.
- `Input`/`Select` (borde rojo, `invalid` + mensaje), `Card`, `Dialog`,
  `useToast()` local, `PageHeader` (H1 + festón, una vez por pantalla),
  `EmptyState` (ícono rojo, borde rosa), `Skeleton`, `Icon` (Lucide 1.5).
- Admin: `AdminTable`, `AdminSkeleton`; solo colores y tipografía de la casa.
- Radios: botones `rounded-full`, tarjetas `rounded-2xl`, miniaturas `rounded-xl`.
- Ancho: invitado `max-w-xl` (formularios) o `max-w-5xl` (grillas 3/4/5 col);
  táctil 44 px mínimo. Privacidad: sin Web Share ni Open Graph.

## Movimiento
- Solo `transform` y `opacity`, 150-400 ms, `ease-out` = `cubic-bezier(0.23, 1,
  0.32, 1)`. Fill `backwards`: nunca queda transform aplicado.
- Press `scale(0.97)` global; hover solo con puntero fino.
- `animate-enter`, `animate-page`, `animate-pop` (corazón).
- Heros con delays 60/120/180 ms; listas con `useInitialStagger` (máx. 12).
- Book: reveal por IntersectionObserver. Grilla -> visor: View Transitions.
- Confeti rojo, rosa y blanco solo al terminar una subida.
- `prefers-reduced-motion` corta todo. Foco: `:focus-visible` rojo de 3 px.
