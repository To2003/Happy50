-- Mesas por QR: reemplaza el group_tag que se elegía a mano en /entrar.
-- Ver SPEC.md secciones 5, 6 y 7.

create table party_tables (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,   -- va en la URL del QR: corto y prolijo, ej. '1', '2', 'A'
  label text,                  -- nombre para mostrar, opcional, ej. "Mesa de los Rodríguez"
  sort_order int not null default 0
);

alter table party_tables enable row level security;

create policy party_tables_select_public on party_tables
  for select using (true);

-- Esta migración corre antes de la fiesta, con datos de prueba de Fase 1
-- únicamente (no hay invitados reales todavía). Limpiamos en vez de armar
-- un backfill que nunca va a hacer falta en producción; hearts y photos
-- cascadean o quedan con guest_id null automáticamente (ver 0001_init.sql).
delete from guests;

alter table guests add column table_id uuid not null references party_tables(id);
alter table guests drop column group_tag;
