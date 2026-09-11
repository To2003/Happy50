-- Nada impedía que seed.sql se corriera dos veces y duplicara milestones y
-- misiones (pasó de verdad durante el desarrollo). Con esto, un segundo
-- `insert` del mismo seed.sql falla en vez de duplicar en silencio.
alter table milestones add constraint milestones_name_unique unique (name);
alter table missions add constraint missions_title_unique unique (title);
