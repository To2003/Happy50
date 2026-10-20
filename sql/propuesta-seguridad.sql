-- ============================================================================
-- PROPUESTA de cambios de RLS / Storage. NO está aplicada.
-- NO correr el archivo entero: copiar y correr bloque por bloque en el SQL
-- Editor de Supabase (si se puede, primero en un proyecto de prueba). Cada
-- bloque trae su "Deshacer". Orden si se aplican varios: B antes que C.
-- A está comentado a propósito: es opcional y la app ya no lo necesita.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0) Diagnóstico (no cambia nada): confirma la causa del bug de "Borrar".
-- ----------------------------------------------------------------------------
-- Reemplazar <USER_UID> (auth.users.id de un invitado, columna guests.user_id)
-- y <PHOTO_ID> (una foto visible de ese invitado). Corre dentro de una
-- transacción que se descarta: no borra nada.
--
-- begin;
-- set local role authenticated;
-- select set_config('request.jwt.claims',
--   json_build_object('sub', '<USER_UID>', 'role', 'authenticated')::text, true);
-- update photos set status = 'deleted' where id = '<PHOTO_ID>';
-- rollback;
--
-- Resultado esperado con la RLS actual:
--   ERROR: new row violates row-level security policy for table "photos" (42501)
-- Por qué: en un UPDATE con WHERE, Postgres exige que la fila NUEVA siga siendo
-- visible por las políticas de SELECT. La única es photos_select_visible
-- (status = 'visible') y la fila nueva queda con status = 'deleted'.


-- ----------------------------------------------------------------------------
-- A) (Opcional) Arreglo de raíz del borrado directo desde el cliente.
-- ----------------------------------------------------------------------------
-- La app ya no lo necesita: desde este cambio el borrado pasa por
-- /api/photos/[id], que verifica la sesión y la autoría en el servidor. Sirve
-- solo si se quiere volver a borrar directo desde el navegador.
-- Efecto: cada invitado puede leer TODAS sus fotos (también ocultas/borradas)
-- consultando la tabla photos. La galería y el book no cambian: leen la vista
-- photos_with_effective_milestone, que filtra status = 'visible'.

-- create policy photos_select_own on photos
--   for select using (
--     exists (select 1 from guests g where g.id = photos.guest_id and g.user_id = auth.uid())
--   );

-- Deshacer A:
-- drop policy photos_select_own on photos;


-- ----------------------------------------------------------------------------
-- B) Contador de corazones: el trigger corre como el invitado y RLS lo frena.
-- ----------------------------------------------------------------------------
-- adjust_photo_hearts() no es security definer: el UPDATE de photos.hearts
-- corre con los permisos del invitado que da el corazón, y photos_update_own_guest
-- solo le deja tocar SUS fotos. Al dar corazón a la foto de otro, el UPDATE
-- afecta 0 filas sin error: el voto se guarda en hearts pero el contador no
-- sube. Verificar antes: dar corazón a una foto ajena y comparar
--   select hearts from photos where id = '<PHOTO_ID>';
--   select count(*) from hearts where photo_id = '<PHOTO_ID>';
-- Si no coinciden, este bloque lo arregla. Aplicar B ANTES que C (si no, C deja
-- también sin contador a las fotos propias).

create or replace function adjust_photo_hearts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update photos set hearts = hearts + 1 where id = new.photo_id;
    return new;
  elsif tg_op = 'DELETE' then
    update photos set hearts = hearts - 1 where id = old.photo_id;
    return old;
  end if;
  return null;
end;
$$;

-- Recalcular los contadores que hayan quedado mal (idempotente):
update photos p set hearts = (select count(*) from hearts h where h.photo_id = p.id);

-- Deshacer B: volver a la definición original (sin security definer).
-- create or replace function adjust_photo_hearts()
-- returns trigger as $$
-- begin
--   if tg_op = 'INSERT' then
--     update photos set hearts = hearts + 1 where id = new.photo_id;
--     return new;
--   elsif tg_op = 'DELETE' then
--     update photos set hearts = hearts - 1 where id = old.photo_id;
--     return old;
--   end if;
--   return null;
-- end;
-- $$ language plpgsql;


-- ----------------------------------------------------------------------------
-- C) Los invitados ya no actualizan photos directamente.
-- ----------------------------------------------------------------------------
-- Hoy un invitado puede cambiar cualquier columna de sus fotos desde la consola
-- del navegador (is_featured, hearts, caption, milestone_override_id...). Con el
-- borrado en /api/photos/[id] (clave de servicio, autoría verificada) la app ya
-- no necesita que el invitado haga UPDATE. Requiere B aplicado.

drop policy photos_update_own_guest on photos;
revoke update on photos from anon, authenticated;

-- Deshacer C:
-- grant update on photos to anon, authenticated;
-- create policy photos_update_own_guest on photos
--   for update using (
--     exists (select 1 from guests g where g.id = photos.guest_id and g.user_id = auth.uid())
--   );


-- ----------------------------------------------------------------------------
-- D) Storage: solo JPEG, hasta 2 MB, y solo en las carpetas que usa la app.
-- ----------------------------------------------------------------------------
-- Hoy cualquier sesión (también la anónima) puede subir cualquier archivo de
-- cualquier tamaño al bucket. La app sube JPEG de ~300 KB (display) y ~40 KB
-- (thumb); con ENABLE_HIGH_RES_DISPLAY, ~900 KB.

update storage.buckets
  set allowed_mime_types = array['image/jpeg'], file_size_limit = 2097152
  where id = 'photos';

drop policy photos_bucket_insert_authenticated on storage.objects;
create policy photos_bucket_insert_authenticated on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] in ('display', 'thumb')
  );

-- Deshacer D:
-- update storage.buckets set allowed_mime_types = null, file_size_limit = null where id = 'photos';
-- drop policy photos_bucket_insert_authenticated on storage.objects;
-- create policy photos_bucket_insert_authenticated on storage.objects
--   for insert to authenticated
--   with check (bucket_id = 'photos');
