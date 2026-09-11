# Cumple 50 — Álbum colaborativo en vivo

Documento de especificación funcional y técnica.
Este archivo es la fuente de verdad del proyecto. Ante cualquier duda de alcance, gana lo que dice acá.

---

## 1. Contexto

Fiesta de cumpleaños de 50 años, aproximadamente 60 invitados, un salón, una noche.
Los invitados sacan fotos con el celular durante la fiesta y las suben a una web. Las fotos van apareciendo en vivo en una pantalla proyectada en el salón. Al terminar la fiesta queda armado un "book": un timeline navegable de la noche, exportable a PDF para imprimir.

**Quién usa esto**: personas de entre 20 y 80 años, mayoría no técnicas, con el celular en una mano y una copa en la otra, en un salón con wifi malo y poca luz.

Ese último párrafo es el requisito más importante del proyecto. Cualquier decisión de diseño que agregue un paso al invitado está mal.

---

## 2. Objetivos y no-objetivos

### Objetivos
1. Que un invitado nuevo pueda darse de alta y subir su primera foto en menos de 40 segundos desde que escanea el QR, sin cuenta ni contraseña, y que las subidas siguientes con la sesión ya guardada tomen menos de 15 segundos.
2. Que las fotos aparezcan en una pantalla proyectada casi en tiempo real.
3. Que al día siguiente exista un book ordenado cronológicamente por momentos de la fiesta.
4. Que ese book se pueda exportar a PDF imprimible.
5. Que todo esto corra en planes gratuitos.

### No-objetivos (explícitamente fuera de alcance)
- Videos y audios. Comen storage y complican todo. No van.
- Login visible con credenciales para invitados (email, contraseña, perfiles, recuperación de contraseña). El sign-in anónimo de Supabase Auth (sección 5) no cuenta como login: el invitado nunca ve una pantalla pidiendo credenciales.
- Reconocimiento facial o tagging automático.
- App nativa. Es una web y punto.
- Multi-evento / SaaS. Es un evento, hardcodeado. Si más adelante se quiere generalizar, se hace después.
- Edición de fotos, filtros, stickers.

---

## 3. Restricciones duras

| Restricción | Número | Consecuencia de diseño |
|---|---|---|
| Supabase Storage Free | 1 GB | Comprimir agresivo en el cliente. Presupuesto: ~350 KB por foto en total entre versiones. |
| Supabase egress Free | 5 GB + 5 GB cacheado | Las grillas y la pantalla usan miniaturas, nunca la versión grande. Cache headers largos. |
| Sin transformación de imágenes en Free | — | Las miniaturas se generan en el navegador del invitado con Canvas, antes de subir. |
| Tamaño máx. de archivo | 50 MB | No es problema si comprimimos, pero validar igual. |
| Realtime Free | 200 conexiones pico, 2M mensajes/mes | Suficiente para 60 invitados. La pantalla es 1 conexión. |
| Proyectos Free pausados por inactividad | 7 días | **Crítico**: el proyecto no puede quedar sin tráfico la semana previa. Ver sección 11. |
| Vercel Hobby | uso personal | Alcanza. |
| Wifi del salón | impredecible | Cola de subida con reintentos y persistencia local. Obligatorio. |

**Presupuesto de storage calculado**: 60 invitados × 12 fotos = 720 fotos.
720 × (miniatura 40 KB + versión display 300 KB) ≈ 245 MB. Entra cómodo en 1 GB con margen para el prólogo de fotos viejas.

**Nota de arquitectura**: la capa de storage debe estar detrás de una interfaz (`lib/storage.ts`) con métodos `upload`, `getPublicUrl`, `delete`. Si el egress de Supabase se vuelve un problema, se migra a Cloudflare R2 (10 GB gratis, sin cargo de egress) cambiando una sola implementación. No acoplar el resto del código al SDK de Supabase Storage. El bucket es público (las rutas son UUIDs no adivinables, así que no hace falta URL firmada): cualquier cliente, incluido un script local, puede resolver `storage_path` a una URL descargable con `getPublicUrl`.

**Nota operativa**: para que el proyecto no se pause por inactividad durante las semanas de desarrollo previas al link de prólogo, corre un GitHub Action semanal que hace ping a un endpoint liviano de health-check contra Supabase.

---

## 4. Stack

- **Next.js** (App Router, TypeScript)
- **Tailwind CSS**
- **Supabase**: Postgres, Storage, Realtime, Auth (anonymous sign-ins para invitados, sin email ni contraseña)
- **Vercel** para el deploy
- **browser-image-compression** o Canvas API a mano para la compresión cliente
- **@react-pdf/renderer**, usado desde un script de Node standalone (`scripts/build-book.ts`) que se corre localmente fuera de Vercel — no Puppeteer, no endpoint serverless (ver sección 9)
- **idb-keyval** para la cola de subida offline

Sin Redux, sin tRPC, sin ORM pesado. Server Components donde se pueda, cliente donde haga falta interactividad.

---

## 5. Roles

| Rol | Cómo entra | Qué puede hacer |
|---|---|---|
| **Invitado** | QR de su mesa → sign-in anónimo de Supabase Auth (sin email ni contraseña) + nombre. La mesa la resuelve el QR, no se elige a mano. La fila en `guests` queda linkeada por `user_id` al uid anónimo y por `table_id` a la mesa. | Subir fotos, ver la galería, filtrar "Mis fotos", dar corazones (toggle), ver sus propias fotos, borrar sus propias fotos (borrado lógico, con confirmación). |
| **Admin** (el hijo) | `/admin` con contraseña única en variable de entorno, validada en server (nunca comparada en el cliente). | Todo lo del invitado + moderar, ocultar, destacar, marcar hitos, gestionar misiones, reasignar momentos, exportar. |
| **Pantalla** | `/tv?key=XXX` con clave en la URL. | Solo lectura, modo kiosko. |

No hay registro con email ni contraseña, pero sí hay **Supabase Auth**: el invitado nunca ve una pantalla de login, pero por debajo se le crea una sesión anónima real (`signInAnonymously`) con JWT propio, que el SDK de Supabase persiste solo. El "usuario" es una fila en la tabla `guests` linkeada por `user_id` al uid anónimo — esto permite que RLS verifique `auth.uid()` de verdad en vez de confiar en un valor que manda el cliente.

---

## 6. Modelo de datos

```sql
-- Mesas físicas del salón. Un QR por mesa, impreso, apunta a /?mesa=<code>.
create table party_tables (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,   -- va en la URL del QR: corto y prolijo, ej. '1', '2', 'A'
  label text,                  -- nombre para mostrar, opcional, ej. "Mesa de los Rodríguez"
  sort_order int not null default 0
);

-- Invitados
create table guests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,  -- uid de la sesión anónima de Supabase Auth
  table_id uuid not null references party_tables(id),
  name text not null,
  created_at timestamptz default now()
);

-- Momentos de la fiesta (capítulos del timeline)
create table milestones (
  id uuid primary key default gen_random_uuid(),
  name text not null,                -- 'Recepción', 'Cena', 'Brindis', 'Torta', 'Baile'
  emoji text,
  sort_order int not null,
  started_at timestamptz,            -- null = todavía no arrancó; lo setea el admin en vivo
  is_prologue boolean default false  -- true para el capítulo de fotos viejas pre-fiesta
);

-- Misiones fotográficas
create table missions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  emoji text,
  sort_order int not null,
  active boolean default true
);

-- Fotos
create table photos (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references guests(id) on delete set null,
  mission_id uuid references missions(id) on delete set null,
  milestone_id uuid references milestones(id) on delete set null,           -- asignado por trigger, ver reglas
  milestone_override_id uuid references milestones(id) on delete set null,  -- reasignación manual desde /admin, tiene prioridad sobre milestone_id
  storage_path text not null,
  thumb_path text not null,
  width int,
  height int,
  caption text,
  taken_at timestamptz not null,     -- EXIF si existe, si no la hora de subida
  created_at timestamptz default now(),
  status text default 'visible',     -- 'visible' | 'hidden' | 'deleted'
  is_featured boolean default false,
  hearts int default 0
);

-- Corazones (para evitar que uno vote 40 veces)
create table hearts (
  photo_id uuid references photos(id) on delete cascade,
  guest_id uuid references guests(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (photo_id, guest_id)
);
```

### Reglas
- `milestone_id` se resuelve al insertar, en este orden de prioridad:
  1. Si `taken_at` es anterior a `EVENT_START` (constante de configuración con la fecha/hora de arranque del evento), se asigna directo al milestone con `is_prologue = true`.
  2. Si no, se asigna el milestone cuyo `started_at` sea el más reciente que sea anterior o igual a `taken_at`.
  3. Si ningún milestone no-prólogo arrancó todavía, se asigna el primer milestone **no-prólogo** por `sort_order` (nunca el milestone de prólogo, aunque tenga el `sort_order` más bajo).

  Implementar como trigger de Postgres o en el server action de inserción.
- Para leer o agrupar fotos por momento, usar siempre `coalesce(milestone_override_id, milestone_id)`, nunca `milestone_id` solo. `milestone_override_id` lo setea el admin a mano (por foto individual o por rango horario) cuando el trigger asignó mal — por ejemplo, si se olvidó de marcar "Arrancar ahora" a tiempo.
- `hearts` en `photos` es un contador desnormalizado que se actualiza por trigger desde la tabla `hearts`. No contar con `count(*)` en cada render. Dar un corazón es toggle: tocar de nuevo borra la fila en `hearts` y el trigger descuenta.
- Borrar una foto propia es borrado lógico: el invitado dueño setea `status = 'deleted'`. Nunca se borra el archivo del storage ni la fila de la tabla.
- `is_featured` es independiente de `status`: destacar una foto no le cambia el `status`, así que una foto destacada sigue siendo pública mientras su `status` sea `'visible'`.
- `party_tables`: lectura pública (hace falta para validar el `code` que llega por query param y para el selector de fallback en `/entrar`). Sin política de escritura para invitados — el admin las gestiona con la service role key, igual que `milestones` y `missions`.
- RLS activado en todas las tablas. Lectura pública de `photos` con `status = 'visible'` (incluye a las destacadas, ya que `is_featured` no es un valor de `status`). Escritura de `photos` y `hearts` solo permitida cuando el `guest_id` corresponde al guest linkeado al `auth.uid()` de la sesión anónima activa — no alcanza con mandar cualquier `guest_id` válido. Insert en `guests` solo permitido si `user_id = auth.uid()`. Todo lo de admin pasa por server actions con service role key, nunca desde el cliente.

---

## 7. Pantallas

### `/` — Bienvenida
Foto de la cumpleañera, "50 años", y un solo botón grande: **Sumate**. Si la URL trae `?mesa=<code>` (vino de un QR de mesa), el botón lo arrastra a `/entrar?mesa=<code>`.
Si ya hay una sesión anónima activa con un `guests` asociado, redirige directo a `/subir`.

### `/entrar` — Alta de invitado
El QR de cada mesa apunta a `/?mesa=<code>`, así que el código de mesa llega por query param y se arrastra hasta acá. Si `mesa` está presente y es un código válido: un solo campo, el nombre, y un botón — listo. Si no está presente (alguien entró por un link pelado, sin pasar por el QR de una mesa): se agrega antes un selector de mesa con botones grandes (no un select), como fallback — mismo patrón que tenía el selector de grupo viejo, pero ya no es un paso obligatorio para la mayoría.
Tipografía grande, botones de mínimo 56px de alto. La gente tiene 50 años y está en penumbra.

### `/subir` — Pantalla principal del invitado
Es la pantalla donde más tiempo van a estar. Debe tener:
- Botón gigante de cámara que abre directamente la cámara del celular (`capture="environment"`) y otro para elegir de la galería.
- Selección múltiple permitida.
- Después de elegir: preview, campo opcional de epígrafe, selector opcional de misión, botón subir.
- **Cola visible**: cada foto muestra su estado (esperando / subiendo con porcentaje / lista / falló con botón de reintentar).
- La cola sobrevive a que se cierre el navegador. Persiste en IndexedDB y reanuda al volver.
- Contador de la noche: "Ya van 247 fotos".

### `/misiones` — Photo bingo
Grilla de tarjetas con las misiones. Las completadas por este invitado se ven tachadas con su foto de miniatura. Toca una tarjeta y abre la cámara con esa misión ya asignada.

Misiones iniciales sugeridas (configurables desde admin):
1. Foto con la cumpleañera
2. El brindis
3. Alguien bailando mal
4. Selfie de tres generaciones
5. La mesa dulce antes del desastre
6. Los zapatos abajo de la mesa (después de las 2am)
7. La mesa completa
8. Un abrazo
9. La torta
10. El grupo con el que viniste

### `/galeria` — Galería
Grilla de miniaturas, scroll infinito, filtros por misión / momento / mesa / "Mis fotos". Tocar abre el visor con corazón y epígrafe. Usa siempre `thumb_path`, jamás la versión grande, hasta que se abra el visor.
En el visor, si la foto es propia, aparece un botón de borrar con confirmación (borrado lógico, ver sección 6).

### `/tv` — Pantalla proyectada
Modo kiosko, fondo oscuro, sin ningún control visible.
- Slideshow a pantalla completa, 6 segundos por foto, transición cross-fade.
- Prioriza fotos nuevas: cuando entra una por Realtime, la mete en la cola para mostrarla dentro de los próximos 20 segundos, con un cartelito discreto de "Recién subida por Marta".
- Cuando no hay fotos nuevas, cicla el histórico sin repetir hasta agotar.
- Overlay permanente y chico en una esquina: el QR y el texto "subí tus fotos acá".
- Reloj y nombre del momento actual ("Brindis").
- Solo muestra fotos con `status` distinto de `'hidden'` y de `'deleted'`.
- Debe aguantar 6 horas sin recargar ni tener memory leaks. Precargar la próxima imagen, liberar las viejas.
- Manejar reconexión de Realtime si se cae el wifi: reintentar en backoff y seguir mostrando el histórico mientras tanto.

### `/admin` — Panel
- **Momentos**: lista de milestones con un botón "Arrancar ahora" que setea `started_at`. Esto es lo que arma el timeline. Incluye reasignación manual de `milestone_override_id`: por foto individual y por rango horario, para corregir fotos que el trigger clasificó mal.
- **Moderación**: feed de las últimas fotos con botones ocultar / destacar. Ocultar setea `status = 'hidden'`; destacar togglea `is_featured` sin tocar `status`. Idealmente en tiempo real.
- **Misiones**: CRUD.
- **Mesas**: CRUD (`code` + `label` opcional). El `code` es lo que ya está impreso en el QR de esa mesa — cambiarlo después de imprimir rompe el QR, la UI tiene que avisar antes de guardar.
- **Stats**: total de fotos, fotos por hora, top uploaders, top votadas.
- **Exportar**: descarga el manifiesto JSON (lista de fotos con `storage_path`, momento, epígrafe, autor, etc.) que consume `scripts/build-book.ts` (ver sección 9).

### `/book` — El book final
Se habilita después de la fiesta. Timeline vertical: para cada momento, un encabezado con el nombre y el horario, y debajo las fotos de ese bloque. Navegación lateral por capítulos. Es la URL que se comparte por WhatsApp al día siguiente. Linkea a cada book de mesa (abajo).

### `/book/mesa/[code]` — El book de la mesa
Igual que `/book` pero filtrado a las fotos de los invitados de esa mesa (por `table_id`), cronológico dentro del filtro. Público, sin restricción — cualquiera con el link o el QR de la mesa lo puede ver, para compartirlo por el chat de esa mesa después de la fiesta.

---

## 8. Pipeline de imagen (crítico)

Todo pasa en el navegador del invitado, **antes** de tocar la red:

1. Leer el archivo. Si es HEIC (iPhone): probar primero decodificación nativa vía canvas/`createImageBitmap` (varios navegadores ya lo decodifican solos); si falla, usar `heic2any` como fallback.
2. Leer EXIF para sacar `taken_at` y la orientación. Aplicar la rotación al canvas. Si no hay EXIF, usar `Date.now()`.
3. Generar dos versiones:
   - **display**: lado mayor 1600px, JPEG calidad 0.82, objetivo ≤ 300 KB
   - **thumb**: lado mayor 400px, JPEG calidad 0.7, objetivo ≤ 40 KB
4. Descartar el original. No se sube nunca.
5. Encolar ambas versiones. Subir con reintentos (3 intentos, backoff exponencial).
6. Recién cuando las dos versiones están arriba, insertar la fila en `photos`.

Si el paso 3 supera el objetivo de peso, bajar calidad iterativamente hasta cumplirlo.

**Nota para quien implemente**: hacer este pipeline en un Web Worker cuando el navegador lo soporte (con feature detection), para no congelar la UI cuando alguien selecciona 15 fotos de golpe; si no hay soporte, caer al hilo principal. Probar la decodificación HEIC específicamente en un iPhone real durante la Fase 2 — no alcanza con probar en desktop.

---

## 9. Exportación

### PDF imprimible
Genera un PDF A4 apaisado o cuadrado 20×20 (elegir cuadrado, es formato de fotolibro):
- Portada con nombre, fecha y una foto destacada
- Página de prólogo con las fotos viejas
- Un separador por cada momento con su nombre y horario
- Grillas de 1, 2 o 4 fotos por página, variando el ritmo
- Epígrafes y autoría al pie
- Contratapa con la lista de todos los que subieron algo

**No se genera en Vercel.** `/admin` solo expone la descarga de un manifiesto JSON con todas las fotos visibles (`storage_path`, momento, epígrafe, autor, `taken_at`). El PDF se arma con `scripts/build-book.ts`, un script de Node standalone con `@react-pdf/renderer` que el admin corre en su propia máquina el día después de la fiesta, consumiendo ese manifiesto. El bucket de Storage es público (sección 3), así que el script resuelve cada `storage_path` a su URL pública con el mismo `getPublicUrl` de `lib/storage.ts` y la descarga con un fetch simple — no hace falta service role key ni URLs firmadas para bajar las imágenes. Así no hay límite de tiempo ni de memoria de función serverless que respetar — son cientos de imágenes.

### ZIP
Descarga de todas las fotos en versión display, organizadas en carpetas por momento. Mismo criterio que el PDF: se arma con el mismo script local a partir del manifiesto, no desde una función de Vercel.

---

## 10. Fases de desarrollo

Hay ~8 semanas. Orden obligatorio, cada fase se cierra funcionando y deployada antes de arrancar la siguiente.

**Fase 1 — Fundaciones (semana 1)**
Proyecto Next.js, Supabase, esquema SQL, RLS, deploy en Vercel. Alta de invitado funcionando. Nada de estilo todavía.

**Fase 2 — Subida (semanas 2-3)**
El pipeline de imagen completo, la cola persistente, `/subir`, `/galeria` básica. Esta es la fase más importante y la que más se subestima. Probar con fotos reales de iPhone y de Android.

**Fase 3 — Pantalla en vivo (semana 4)**
`/tv` con Realtime. Probarla proyectada de verdad, 2 horas seguidas, con el celular subiendo fotos.

**Fase 4 — Admin y momentos (semana 5)**
Panel, moderación, milestones, asignación automática al timeline, reasignación manual (`milestone_override_id`) individual y por rango horario, gestión de mesas (CRUD).

**Fase 5 — Misiones (semana 6)**
Photo bingo completo.

**Fase 6 — Book y PDF (semana 7)**
`/book`, `/book/mesa/[code]`, el manifiesto JSON desde `/admin`, y `scripts/build-book.ts` (PDF + ZIP, corre local, fuera de Vercel).

**Fase 7 — Prueba de fuego y pulido (semana 8)**
Ver sección 11.

---

## 11. Plan del día de la fiesta

Esto no es opcional, es parte del proyecto.

**Dos semanas antes**
- Abrir el link de prólogo por WhatsApp para que suban fotos viejas.
- Esto además mantiene el proyecto Supabase con tráfico y evita que se pause.

**Una semana antes: simulacro**
- Reunir 5 personas, que suban 30 fotos en 10 minutos desde celulares distintos.
- Probar con datos móviles y con wifi malo (activar throttling 3G en DevTools).
- Dejar `/tv` corriendo 3 horas y verificar consumo de memoria.

**Tres días antes**
- Imprimir los QR: uno por mesa, tamaño A5, con instrucciones de tres palabras. Cada QR apunta a `/?mesa=<code>` con el `code` cargado en `party_tables` — generarlos recién después de cargar las mesas reales en `/admin`, no antes.
- Chequear que el salón tenga wifi y pedir la clave. Ponerla en el cartel del QR.
- Verificar la salida HDMI del proyector con la notebook que va a correr `/tv`.

**El día**
- Notebook enchufada, sin suspensión automática, `/tv` en pantalla completa (F11), modo avión de las notificaciones.
- Un celular cargado para el admin.
- Marcar los momentos a medida que pasan. Poner una alarma para no olvidarse.

**Al día siguiente**
- Revisar y ocultar lo que haya que ocultar.
- Generar el book y el PDF.
- Mandar el link por WhatsApp con las stats de la noche.

---

## 12. Diseño visual

Nada de dashboard genérico. Es una fiesta.
- Modo oscuro por defecto: se usa de noche y en penumbra.
- Tipografía con carácter para títulos, algo legible para el resto.
- Botones grandes, contraste alto, targets táctiles de 56px mínimo.
- Micro-animaciones al subir una foto: que se sienta que pasó algo lindo.
- Todo el copy en español rioplatense informal, tuteo con "vos". "Subí tu foto", "Ya estás adentro", "Se te cayó la conexión, lo reintentamos solos".
- Sin jerga técnica en ningún mensaje visible. Nunca decir "error 500" ni "upload failed".

---

## 13. Criterios de aceptación

El proyecto está terminado cuando:

1. Un invitado nuevo escanea el QR de su mesa, se da de alta (sign-in anónimo + nombre, la mesa ya viene resuelta por el QR) y sube su primera foto en menos de 40 segundos, sin ayuda.
2. Con la sesión ya guardada, subir una foto siguiente toma menos de 15 segundos.
3. Esa foto aparece en la pantalla proyectada en menos de 30 segundos.
4. Con la conexión cortada, la foto queda encolada y se sube sola al volver la señal.
5. Una foto de 12 MB de iPhone termina pesando menos de 300 KB en el storage, bien orientada.
6. `/tv` corre 6 horas sin recargarse y sin pasar de 500 MB de RAM.
7. El admin marca un momento y las fotos siguientes caen en ese capítulo del timeline; las que quedaron mal asignadas se corrigen a mano con `milestone_override_id`, sin tocar la base directamente.
8. El book de una mesa (`/book/mesa/<code>`) muestra únicamente las fotos de los invitados que entraron por el QR de esa mesa.
9. `scripts/build-book.ts` genera el PDF con 700 fotos corriendo en una máquina local, sin depender de límites de Vercel.
10. Todo el consumo dentro de Supabase y Vercel queda dentro de los límites gratuitos.
