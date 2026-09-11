# AGENTS.md

Convenciones de trabajo para este repo. La fuente de verdad **funcional** es
[SPEC.md](SPEC.md) — ante cualquier duda de alcance, gana el spec. Este
archivo cubre cómo escribimos el código, no qué construimos.

## Qué es esto

Álbum colaborativo en vivo para un cumpleaños de 50. Un evento, hardcodeado,
no un producto multi-tenant. Ver SPEC.md sección 2 para no-objetivos —
son tan importantes como los objetivos.

## Fases

Se trabaja fase por fase según SPEC.md sección 10, en orden, sin excepciones.
**No arranco una fase nueva sin que el usuario confirme explícitamente que
la anterior está cerrada y deployada.** Si algo de la fase actual queda a
medio hacer, se termina antes de avanzar.

## Stack

- Next.js (App Router, TypeScript). Server Components por defecto, Client
  Components solo donde hace falta interactividad real.
- Tailwind CSS.
- Supabase: Postgres, Storage, Realtime, Auth (anonymous sign-ins para
  invitados, sin email ni contraseña — ver "Modelo de identidad de
  invitado" abajo).
- Vercel para deploy. Dominio: subdominio `*.vercel.app`, no hay dominio
  propio comprado para este proyecto.
- `browser-image-compression` o Canvas API a mano para compresión cliente
  (se decide en Fase 2).
- `idb-keyval` para la cola de subida offline (Fase 2).
- PDF/ZIP: `@react-pdf/renderer` en `scripts/build-book.ts`, un script de
  Node standalone que el admin corre localmente el día después de la
  fiesta — no en Vercel, no Puppeteer (Fase 6).

## Estructura

```
app/              — rutas (App Router). Cada carpeta = una pantalla del spec.
lib/
  supabase/
    client.ts     — único punto de creación del cliente Supabase browser (anon key)
    server.ts     — cliente con service role, solo para código de /admin (desde Fase 4)
  storage.ts      — interfaz de storage (desde Fase 2, ver abajo)
  database.types.ts — tipos generados desde el esquema real de Supabase
supabase/
  migrations/     — SQL versionado, una migración por cambio de esquema
  seed.sql        — datos de desarrollo (milestones, misiones)
```

No creamos carpetas ni abstracciones (`components/`, `hooks/`, etc.) antes de
tener un segundo caso de uso real que las justifique.

## Modelo de identidad de invitado

Los invitados usan **anonymous sign-in de Supabase Auth** (`signInAnonymously`):
sin pantalla de login, pero con una sesión real y un JWT propio que el SDK
persiste solo — no hay `token` custom en `localStorage`. La fila en `guests`
está linkeada por `user_id` al uid anónimo.

Las escrituras de invitado (subir foto, dar corazón, borrar su propia foto,
alta) van **directo del cliente a Supabase** vía `lib/supabase/client.ts`.
A diferencia de un token manual, acá RLS puede verificar `auth.uid()` de
verdad — un invitado no puede escribir con el `guest_id` de otro. Se prioriza
evitar el salto extra de un Server Action, porque la subida tiene que
funcionar con wifi malo, sin resignar por eso la protección de identidad.

Todo lo de `/admin` es la excepción: pasa siempre por Server Actions con la
service role key, nunca desde el cliente.

## Storage

Todo storage de archivos pasa por `lib/storage.ts` (`upload`, `getPublicUrl`,
`delete`). Ningún otro archivo importa el SDK de Supabase Storage
directamente. La razón está en SPEC.md sección 3: si el egress se vuelve un
problema, migramos a Cloudflare R2 cambiando una sola implementación. Esto
no es negociable ni siquiera para "un caso rápido" — si hace falta tocar
storage, se agrega el método a la interfaz.

El bucket es público (rutas UUID, no adivinables) — no hay URLs firmadas ni
service role key para leer imágenes, ni desde la app ni desde
`scripts/build-book.ts`.

## Milestones y moderación

La asignación de `milestone_id` usa la constante `EVENT_START` (fecha/hora
de arranque del evento) para distinguir fotos del prólogo de fotos de la
fiesta — regla completa en SPEC.md sección 6. Si se toca ese trigger,
mantener el comentario que explica por qué existe `EVENT_START`: sin eso,
las fotos viejas del prólogo caen mal clasificadas, y el fallback de "ningún
milestone arrancó todavía" tiene que excluir explícitamente al milestone de
prólogo aunque tenga el `sort_order` más bajo.

Para leer o agrupar fotos por momento, usar siempre
`coalesce(milestone_override_id, milestone_id)` — nunca `milestone_id`
solo. `milestone_override_id` es la corrección manual del admin cuando el
trigger asignó mal (por ejemplo, se olvidó de marcar "Arrancar ahora" a
tiempo).

`status` y `is_featured` son columnas independientes: `status` controla
visibilidad (`'visible' | 'hidden' | 'deleted'`), `is_featured` es un flag
aparte que no le cambia el `status` a la foto. Nunca modelar "destacada"
como un valor de `status` — eso la sacaría de la lectura pública.

## TypeScript

Estricto (`strict: true`). Nada de `any` — ni siquiera temporal. Si un tipo
es genuinamente desconocido, se modela explícito (`unknown` + narrowing), no
se escapa con `any`. Los tipos del modelo de datos salen de
`lib/database.types.ts`, generado desde el esquema real, no escritos a mano
por separado.

## Qué NO hacer

- Nada de Redux, ni Zustand, ni ninguna librería de estado global. El estado
  vive en Server Components, URL, o `useState`/`useReducer` local. Si algo
  parece necesitar estado global de verdad, se para y se pregunta.
- Nada de tRPC.
- Nada de ORM pesado (Prisma, Drizzle). SQL directo en migraciones +
  `supabase-js` para queries.
- Nada de código fuera de `lib/storage.ts` que importe el SDK de Supabase
  Storage directamente.
- Nada de `any` en TypeScript.
- Nunca exponer la service role key ni la contraseña de admin al cliente
  (nada de `NEXT_PUBLIC_*` para esos valores; se validan server-side).
- Nada de video, audio, login de invitados, reconocimiento facial, app
  nativa, ni generalización multi-evento — están explícitamente fuera de
  alcance en SPEC.md sección 2. Si una tarea empieza a acercarse a algo de
  esta lista, se para y se pregunta antes de seguir.
- No agregar abstracciones, configuración o manejo de errores para casos
  que no van a pasar en este proyecto puntual. Es un evento único, no un
  producto.

## Copy visible

Todo el texto que ve un invitado, admin o la pantalla — botones, mensajes de
error, estados vacíos, confirmaciones — va en **español rioplatense informal,
tuteo con "vos"**. Ejemplos del tono correcto (de SPEC.md sección 12):
"Subí tu foto", "Ya estás adentro", "Se te cayó la conexión, lo reintentamos
solos".

Nunca jerga técnica en un mensaje visible: nada de "error 500", "upload
failed", "null reference", etc. Si algo falla, el mensaje describe lo que
pasa en términos humanos y qué hacer (o que no hace falta hacer nada porque
el sistema reintenta solo).

El código (nombres de variables, comentarios, commits) es en español o
inglés técnico normal — esta regla de idioma es solo para lo que ve un
invitado.

## Diseño

Modo oscuro por defecto. Targets táctiles de 56px mínimo. Nada de estética
de dashboard genérico — es una fiesta, no una app de gestión.

## Antes de tocar código

Si una decisión de implementación tiene más de un camino razonable, se
pregunta en vez de elegir por cuenta propia. Al cerrar un bloque de trabajo,
se le dice al usuario específicamente qué probar a mano antes de seguir —
no alcanza con que compile o pasen los tipos.
