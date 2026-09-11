-- Esquema inicial. Ver SPEC.md sección 6 para el modelo de datos completo
-- y las reglas de negocio detrás de cada trigger.

-- ============================================================================
-- Tablas
-- ============================================================================

create table guests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,  -- uid de la sesión anónima de Supabase Auth
  name text not null,
  group_tag text,                    -- 'familia' | 'amigas' | 'trabajo' | 'vecinos' | 'otros' (sin constraint: la UI limita las opciones)
  created_at timestamptz default now()
);

create table milestones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text,
  sort_order int not null,
  started_at timestamptz,            -- null = todavía no arrancó; lo setea el admin en vivo
  is_prologue boolean not null default false
);

create table missions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  emoji text,
  sort_order int not null,
  active boolean not null default true
);

create table photos (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references guests(id) on delete set null,
  mission_id uuid references missions(id) on delete set null,
  milestone_id uuid references milestones(id) on delete set null,           -- asignado por trigger, ver abajo
  milestone_override_id uuid references milestones(id) on delete set null,  -- reasignación manual desde /admin (Fase 4), tiene prioridad sobre milestone_id
  storage_path text not null,
  thumb_path text not null,
  width int,
  height int,
  caption text,
  taken_at timestamptz not null,     -- EXIF si existe, si no la hora de subida
  created_at timestamptz default now(),
  status text not null default 'visible',  -- 'visible' | 'hidden' | 'deleted'
  is_featured boolean not null default false,
  hearts int not null default 0
);

create table hearts (
  photo_id uuid references photos(id) on delete cascade,
  guest_id uuid references guests(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (photo_id, guest_id)
);

create index photos_milestone_id_idx on photos (milestone_id);
create index photos_status_idx on photos (status);
create index photos_taken_at_idx on photos (taken_at);
create index hearts_photo_id_idx on hearts (photo_id);

-- ============================================================================
-- Trigger: asignación automática de milestone_id
-- ============================================================================
--
-- EVENT_START marca el arranque real del evento. Sin esto, las fotos viejas
-- del prólogo (subidas dos semanas antes, con taken_at de hace meses/años)
-- no matchean el started_at de ningún milestone de la fiesta y terminan mal
-- clasificadas. Ver SPEC.md sección 6, regla de `milestone_id`.
--
-- TODO: reemplazar el valor de placeholder por la fecha/hora real de arranque
-- de la fiesta antes de que empiece a subirse la primera foto del prólogo.
create or replace function resolve_milestone_id()
returns trigger as $$
declare
  event_start timestamptz := '2026-11-01 00:00:00-03';  -- TODO: ajustar a la fecha real de la fiesta
begin
  if new.taken_at < event_start then
    -- Foto vieja de antes del evento: va directo al capítulo de prólogo.
    select id into new.milestone_id
    from milestones
    where is_prologue = true
    limit 1;
  else
    -- Foto de la fiesta: el milestone no-prólogo más reciente que ya arrancó.
    select id into new.milestone_id
    from milestones
    where is_prologue = false
      and started_at is not null
      and started_at <= new.taken_at
    order by started_at desc
    limit 1;

    -- Si ninguno arrancó todavía, cae en el primer milestone no-prólogo por
    -- sort_order (nunca en el de prólogo, aunque tenga el sort_order más bajo).
    if new.milestone_id is null then
      select id into new.milestone_id
      from milestones
      where is_prologue = false
      order by sort_order asc
      limit 1;
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger photos_set_milestone_id
  before insert on photos
  for each row
  execute function resolve_milestone_id();

-- ============================================================================
-- Trigger: contador desnormalizado de corazones
-- ============================================================================

create or replace function adjust_photo_hearts()
returns trigger as $$
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
$$ language plpgsql;

create trigger hearts_increment
  after insert on hearts
  for each row
  execute function adjust_photo_hearts();

create trigger hearts_decrement
  after delete on hearts
  for each row
  execute function adjust_photo_hearts();

-- ============================================================================
-- RLS
-- ============================================================================
-- Los invitados escriben directo desde el cliente (sin Server Actions) para
-- minimizar saltos de red con wifi malo. La identidad real la da auth.uid()
-- de la sesión anónima de Supabase Auth, nunca un valor que mande el cliente.
-- Todo lo de /admin (Fase 4) usa la service role key, que ignora RLS.

alter table guests enable row level security;
alter table milestones enable row level security;
alter table missions enable row level security;
alter table photos enable row level security;
alter table hearts enable row level security;

-- guests: lectura pública (autoría visible en /tv, /galeria), alta solo propia
create policy guests_select_public on guests
  for select using (true);

create policy guests_insert_own on guests
  for insert with check (auth.uid() = user_id);

-- milestones: lectura pública, escritura solo admin (service role, sin policy)
create policy milestones_select_public on milestones
  for select using (true);

-- missions: lectura pública, escritura solo admin (service role, sin policy)
create policy missions_select_public on missions
  for select using (true);

-- photos: lectura pública de lo visible, escritura solo del propio invitado
create policy photos_select_visible on photos
  for select using (status = 'visible');

create policy photos_insert_own_guest on photos
  for insert with check (
    exists (
      select 1 from guests g
      where g.id = photos.guest_id and g.user_id = auth.uid()
    )
  );

create policy photos_update_own_guest on photos
  for update using (
    exists (
      select 1 from guests g
      where g.id = photos.guest_id and g.user_id = auth.uid()
    )
  );

-- hearts: lectura pública (conteo, saber si ya votaste), voto solo propio
create policy hearts_select_public on hearts
  for select using (true);

create policy hearts_insert_own_guest on hearts
  for insert with check (
    exists (
      select 1 from guests g
      where g.id = hearts.guest_id and g.user_id = auth.uid()
    )
  );

create policy hearts_delete_own_guest on hearts
  for delete using (
    exists (
      select 1 from guests g
      where g.id = hearts.guest_id and g.user_id = auth.uid()
    )
  );
