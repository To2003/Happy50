-- Bucket público de fotos. Ver SPEC.md sección 3: rutas con UUID, no
-- adivinables, getPublicUrl alcanza, no hace falta URL firmada.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

-- Cualquier sesión autenticada puede subir (incluye las anónimas de los
-- invitados — Supabase les da role 'authenticated' igual). La lectura la
-- resuelve el flag public del bucket, sin necesidad de policy de select.
-- No hay policy de update/delete: el borrado de una foto es lógico
-- (photos.status), nunca se borra el archivo (ver SPEC.md sección 6).
create policy photos_bucket_insert_authenticated
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'photos');
