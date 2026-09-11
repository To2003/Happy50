-- Vista de solo lectura para filtrar/agrupar fotos por el momento
-- "efectivo" (SPEC.md sección 6: coalesce(milestone_override_id,
-- milestone_id), nunca milestone_id solo). Hace falta desde que /admin
-- (Fase 4) puede setear milestone_override_id de verdad — antes de eso
-- filtrar por milestone_id directo daba lo mismo, ya no.
--
-- security_invoker hace que la vista respete el RLS de quien consulta
-- (anon/authenticated), no el del rol que la creó.
create view photos_with_effective_milestone
  with (security_invoker = true)
as
select
  *,
  coalesce(milestone_override_id, milestone_id) as effective_milestone_id
from photos
where status = 'visible';

grant select on photos_with_effective_milestone to anon, authenticated;
