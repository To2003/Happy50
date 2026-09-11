-- Datos iniciales. Se puede correr tal cual en desarrollo; en producción,
-- el admin puede editar milestones y misiones desde /admin (Fase 4).

insert into milestones (name, emoji, sort_order, is_prologue) values
  ('Antes de la fiesta', '📼', 0, true),
  ('Recepción', '🥂', 1, false),
  ('Cena', '🍽️', 2, false),
  ('Brindis', '🍾', 3, false),
  ('Torta', '🎂', 4, false),
  ('Baile', '💃', 5, false);

insert into missions (title, emoji, sort_order) values
  ('Foto con la cumpleañera', '🥳', 1),
  ('El brindis', '🥂', 2),
  ('Alguien bailando mal', '🕺', 3),
  ('Selfie de tres generaciones', '👨‍👩‍👧', 4),
  ('La mesa dulce antes del desastre', '🍰', 5),
  ('Los zapatos abajo de la mesa (después de las 2am)', '👠', 6),
  ('La mesa completa', '🍽️', 7),
  ('Un abrazo', '🤗', 8),
  ('La torta', '🎂', 9),
  ('El grupo con el que viniste', '👯', 10);

-- Mesas de prueba para desarrollo local. Las mesas reales se cargan desde
-- /admin (Fase 4) antes de imprimir los QR — ver SPEC.md sección 11.
insert into party_tables (code, label, sort_order) values
  ('1', null, 1),
  ('2', null, 2),
  ('3', null, 3);
