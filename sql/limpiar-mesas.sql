-- ============================================================================
-- Limpiar mesas: quedarse con UNA mesa, "Invitados", con todos los invitados.
-- NO correr el archivo entero. En el SQL Editor de Supabase, seleccionar un
-- bloque y "Run selected". El editor muestra solo el resultado de la ÚLTIMA
-- sentencia, por eso cada bloque de lectura es una sola consulta.
--
-- Esquema (supabase/migrations):
-- - guests.table_id uuid NOT NULL references party_tables(id), sin "on delete":
--   no se puede borrar una mesa con invitados (por eso el admin no te deja).
-- - photos.guest_id y hearts.guest_id apuntan al INVITADO, no a la mesa: mover
--   invitados de mesa no toca fotos ni corazones.
-- - No hay triggers en guests ni en party_tables. El SQL Editor corre como
--   postgres, así que las políticas RLS no interfieren.
-- - La mesa que queda es la de code = '1' (se le cambia el label, NO el code,
--   así su QR y /book/mesa/1 siguen andando). Si en el bloque 1a tu "mesa 1"
--   tiene otro code, cambiá '1' en los bloques 1b y 2.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1a) Solo lectura: mesas y cuántos invitados tiene cada una.
-- ----------------------------------------------------------------------------
select t.code, t.label, t.sort_order, count(g.id) as invitados
from party_tables t
left join guests g on g.table_id = t.id
group by t.id
order by t.sort_order, t.code;


-- ----------------------------------------------------------------------------
-- 1b) Solo lectura: invitados de las mesas 1 y 2 con sus fotos, para ver si
-- son de prueba o reales.
-- ----------------------------------------------------------------------------
select t.code as mesa,
       g.name,
       g.created_at,
       count(p.id) filter (where p.status = 'visible') as fotos_visibles,
       count(p.id) filter (where p.status = 'hidden')  as fotos_ocultas,
       count(p.id) filter (where p.status = 'deleted') as fotos_borradas
from guests g
join party_tables t on t.id = g.table_id
left join photos p on p.guest_id = g.id
where t.code in ('1', '2')
group by t.code, g.id
order by t.code, g.created_at;


-- ----------------------------------------------------------------------------
-- 2) La limpieza, en una sola transacción. POR DEFECTO SE DESHACE.
-- ----------------------------------------------------------------------------
-- Con confirmar = false hace todo, arma los conteos de antes y después y
-- termina con un error a propósito ("SIMULACRO: no se guardó nada...").
-- Eso es el ROLLBACK: el error deshace la transacción entera, y su mensaje es
-- la única forma de ver los conteos en el SQL Editor (un ROLLBACK al final
-- dejaría la pantalla en "No rows returned").
-- Para guardar, cambiá confirmar a true y volvé a correr el bloque. Si sale
-- bien, el editor muestra "Success" y la consulta de abajo muestra cómo quedó.
-- También guarda un respaldo en el esquema "respaldo" (no expuesto por la API)
-- para poder deshacer con el bloque 3.

do $$
declare
  confirmar boolean := false;  -- <- cambiar a true para GUARDAR
  keeper uuid;
  antes text;
  despues text;
  invitados_antes int;
  invitados_despues int;
  movidos int;
  borradas int;
  resumen text;
begin
  -- Frena altas y cambios de invitados durante la limpieza (milisegundos); se
  -- puede seguir leyendo. Así nadie entra a la mesa 2 entre el mover y el borrar.
  lock table guests in share row exclusive mode;
  lock table party_tables in share row exclusive mode;

  select id into keeper from party_tables where code = '1';
  if keeper is null then
    raise exception 'No existe la mesa con code = ''1''. Mirá el bloque 1a y cambiá el code en este bloque.';
  end if;

  select count(*) into invitados_antes from guests;
  select string_agg(format('%s [code %s]: %s', coalesce(t.label, 'Mesa ' || t.code), t.code,
                           (select count(*) from guests g where g.table_id = t.id)),
                    ' | ' order by t.sort_order, t.code)
    into antes from party_tables t;

  -- Respaldo para el bloque 3. Si ya existe, este create falla: el respaldo
  -- de una limpieza anterior nunca se pisa.
  create schema if not exists respaldo;
  create table respaldo.mesas_antes as select * from party_tables;
  create table respaldo.invitados_mesa_antes as select id as guest_id, table_id from guests;

  update party_tables set label = 'Invitados' where id = keeper;

  update guests set table_id = keeper where table_id <> keeper;
  get diagnostics movidos = row_count;

  delete from party_tables t
  where t.id <> keeper
    and not exists (select 1 from guests g where g.table_id = t.id);
  get diagnostics borradas = row_count;

  -- Controles: nadie se borró y nadie quedó fuera de "Invitados".
  select count(*) into invitados_despues from guests;
  if invitados_despues <> invitados_antes then
    raise exception 'Cambió la cantidad de invitados (% -> %). No se guardó nada.', invitados_antes, invitados_despues;
  end if;
  if exists (select 1 from guests where table_id <> keeper) then
    raise exception 'Quedaron invitados fuera de la mesa Invitados. No se guardó nada.';
  end if;

  select string_agg(format('%s [code %s]: %s', coalesce(t.label, 'Mesa ' || t.code), t.code,
                           (select count(*) from guests g where g.table_id = t.id)),
                    ' | ' order by t.sort_order, t.code)
    into despues from party_tables t;

  resumen := format('ANTES -> %s   ||   DESPUÉS -> %s   ||   invitados movidos: %s, mesas borradas: %s, invitados totales: %s (antes %s)',
                    antes, despues, movidos, borradas, invitados_despues, invitados_antes);

  if not confirmar then
    raise exception 'SIMULACRO: no se guardó nada. %', resumen;
  end if;
  raise notice 'GUARDADO. %', resumen;
end $$;

-- Solo llega acá si se guardó (con confirmar = true): cómo quedó.
select t.code, t.label, count(g.id) as invitados
from party_tables t
left join guests g on g.table_id = t.id
group by t.id
order by t.sort_order, t.code;


-- ----------------------------------------------------------------------------
-- 3) Deshacer (solo si el bloque 2 se guardó con confirmar = true).
-- ----------------------------------------------------------------------------
-- Vuelve a crear las mesas borradas con su MISMO id, code y label (los QR
-- vuelven a andar), devuelve el label original a la mesa 1 y devuelve cada
-- invitado a su mesa de antes. Los invitados que entraron DESPUÉS de la
-- limpieza se quedan en la mesa 1. Si mientras tanto alguien creó una mesa
-- con un code que estaba en el respaldo (por ejemplo '2'), el insert falla por
-- code repetido y no se deshace nada: borrá o renombrá esa mesa primero.

-- do $$
-- begin
--   insert into party_tables (id, code, label, sort_order)
--     select m.id, m.code, m.label, m.sort_order
--     from respaldo.mesas_antes m
--     where not exists (select 1 from party_tables t where t.id = m.id);
--
--   update party_tables t set label = m.label
--     from respaldo.mesas_antes m
--     where t.id = m.id and t.label is distinct from m.label;
--
--   update guests g set table_id = r.table_id
--     from respaldo.invitados_mesa_antes r
--     where g.id = r.guest_id and g.table_id is distinct from r.table_id;
-- end $$;

-- Cuando ya no haga falta poder deshacer (después del book), borrar el respaldo:
-- drop schema respaldo cascade;
