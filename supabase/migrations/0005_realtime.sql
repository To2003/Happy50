-- Habilita postgres_changes para /tv (Fase 3). Sin esto, Supabase no manda
-- eventos aunque RLS deje leer las tablas — la publicación es un paso aparte.
alter publication supabase_realtime add table photos;
alter publication supabase_realtime add table milestones;
